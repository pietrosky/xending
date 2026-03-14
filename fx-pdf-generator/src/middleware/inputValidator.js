/**
 * Middleware de validación de inputs para PDF Generator
 * Valida y sanitiza todos los inputs antes del procesamiento
 */

const validator = require('validator');

/**
 * Sanitiza un string removiendo contenido peligroso
 */
function sanitizeString(input) {
  if (typeof input !== 'string') return input;
  
  // Remover scripts y contenido peligroso
  let sanitized = input.replace(/<script[^>]*>.*?<\/script>/gi, '');
  sanitized = sanitized.replace(/javascript:/gi, '');
  sanitized = sanitized.replace(/on\w+\s*=/gi, '');
  
  // Escapar caracteres HTML básicos
  sanitized = validator.escape(sanitized);
  
  // Normalizar espacios
  sanitized = sanitized.replace(/\s+/g, ' ').trim();
  
  return sanitized;
}

/**
 * Valida WID (Workflow ID)
 */
function validateWID(wid) {
  if (!wid || typeof wid !== 'string') {
    return { isValid: false, error: 'WID es requerido y debe ser string' };
  }
  
  if (wid.length < 10 || wid.length > 100) {
    return { isValid: false, error: 'WID debe tener entre 10 y 100 caracteres' };
  }
  
  if (!/^[a-zA-Z0-9\-_]+$/.test(wid)) {
    return { isValid: false, error: 'WID contiene caracteres inválidos' };
  }
  
  return { isValid: true, sanitized: wid };
}

/**
 * Valida datos de deal para PDF
 */
function validateDealData(dealData) {
  const errors = [];
  const sanitized = {};
  
  // Validar campos requeridos
  const requiredFields = ['fromCurrency', 'toCurrency', 'amount', 'rate'];
  
  for (const field of requiredFields) {
    if (!dealData[field]) {
      errors.push(`${field} es requerido`);
      continue;
    }
    
    if (field === 'amount' || field === 'rate') {
      // Validar números
      const num = parseFloat(dealData[field]);
      if (isNaN(num) || num <= 0) {
        errors.push(`${field} debe ser un número positivo`);
      } else {
        sanitized[field] = num;
      }
    } else if (field === 'fromCurrency' || field === 'toCurrency') {
      // Validar códigos de moneda
      const currency = dealData[field].toString().toUpperCase();
      if (!/^[A-Z]{3}$/.test(currency)) {
        errors.push(`${field} debe ser un código de moneda de 3 letras`);
      } else {
        sanitized[field] = currency;
      }
    } else {
      // Sanitizar strings generales
      sanitized[field] = sanitizeString(dealData[field]);
    }
  }
  
  // Validar campos opcionales
  const optionalFields = ['clientName', 'dealId', 'notes', 'deliveryType'];
  
  for (const field of optionalFields) {
    if (dealData[field]) {
      if (field === 'deliveryType') {
        const validTypes = ['spot', '48hrs', 'today'];
        if (!validTypes.includes(dealData[field])) {
          errors.push(`deliveryType debe ser uno de: ${validTypes.join(', ')}`);
        } else {
          sanitized[field] = dealData[field];
        }
      } else {
        sanitized[field] = sanitizeString(dealData[field]);
        
        // Validar longitud
        if (sanitized[field].length > 200) {
          errors.push(`${field} no puede exceder 200 caracteres`);
        }
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitized
  };
}

/**
 * Valida configuración de PDF
 */
function validatePDFConfig(config) {
  const errors = [];
  const sanitized = {};
  
  if (config.template) {
    const validTemplates = ['xending', 'monex', 'default'];
    if (!validTemplates.includes(config.template)) {
      errors.push(`template debe ser uno de: ${validTemplates.join(', ')}`);
    } else {
      sanitized.template = config.template;
    }
  }
  
  if (config.format) {
    const validFormats = ['A4', 'Letter', 'Legal'];
    if (!validFormats.includes(config.format)) {
      errors.push(`format debe ser uno de: ${validFormats.join(', ')}`);
    } else {
      sanitized.format = config.format;
    }
  }
  
  if (config.orientation) {
    const validOrientations = ['portrait', 'landscape'];
    if (!validOrientations.includes(config.orientation)) {
      errors.push(`orientation debe ser: portrait o landscape`);
    } else {
      sanitized.orientation = config.orientation;
    }
  }
  
  // Validar opciones booleanas
  const booleanFields = ['includeWatermark', 'includeSignature', 'compressed'];
  for (const field of booleanFields) {
    if (config[field] !== undefined) {
      sanitized[field] = Boolean(config[field]);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitized
  };
}

/**
 * Middleware para validar request de generación de PDF
 */
const validatePDFGenerationRequest = (req, res, next) => {
  try {
    const { wid, dealData, config = {} } = req.body;
    const validationErrors = [];
    
    // Validar WID
    const widValidation = validateWID(wid);
    if (!widValidation.isValid) {
      validationErrors.push(`WID: ${widValidation.error}`);
    }
    
    // Validar datos del deal
    const dealValidation = validateDealData(dealData || {});
    if (!dealValidation.isValid) {
      validationErrors.push(`Deal data: ${dealValidation.errors.join(', ')}`);
    }
    
    // Validar configuración del PDF
    const configValidation = validatePDFConfig(config);
    if (!configValidation.isValid) {
      validationErrors.push(`PDF config: ${configValidation.errors.join(', ')}`);
    }
    
    if (validationErrors.length > 0) {
      console.warn(`🚫 Validation failed for PDF generation request from IP: ${req.ip}`, validationErrors);
      return res.status(400).json({
        error: 'Datos de entrada inválidos',
        code: 'VALIDATION_ERROR',
        details: validationErrors
      });
    }
    
    // Agregar datos sanitizados al request
    req.sanitized = {
      wid: widValidation.sanitized || wid,
      dealData: dealValidation.sanitized,
      config: configValidation.sanitized
    };
    
    console.log(`✅ PDF generation request validated for WID: ${req.sanitized.wid}`);
    next();
    
  } catch (error) {
    console.error('❌ Error in PDF validation middleware:', error);
    res.status(500).json({
      error: 'Error interno de validación',
      code: 'VALIDATION_INTERNAL_ERROR'
    });
  }
};

/**
 * Middleware para validar requests de modificación de PDF
 */
const validatePDFModificationRequest = (req, res, next) => {
  try {
    const { action, parameters = {} } = req.body;
    const validationErrors = [];
    
    // Validar acción
    const validActions = ['watermark', 'signature', 'merge', 'split', 'compress'];
    if (!action || !validActions.includes(action)) {
      validationErrors.push(`action debe ser uno de: ${validActions.join(', ')}`);
    }
    
    // Validar parámetros según la acción
    if (action === 'watermark') {
      if (!parameters.text || typeof parameters.text !== 'string') {
        validationErrors.push('watermark requiere parámetro text');
      } else if (parameters.text.length > 100) {
        validationErrors.push('texto de watermark no puede exceder 100 caracteres');
      }
    }
    
    if (action === 'merge') {
      if (!Array.isArray(parameters.files) || parameters.files.length === 0) {
        validationErrors.push('merge requiere array de archivos');
      }
    }
    
    if (validationErrors.length > 0) {
      console.warn(`🚫 Validation failed for PDF modification request from IP: ${req.ip}`, validationErrors);
      return res.status(400).json({
        error: 'Parámetros de modificación inválidos',
        code: 'MODIFICATION_VALIDATION_ERROR',
        details: validationErrors
      });
    }
    
    // Sanitizar parámetros
    const sanitizedParams = {};
    for (const [key, value] of Object.entries(parameters)) {
      if (typeof value === 'string') {
        sanitizedParams[key] = sanitizeString(value);
      } else {
        sanitizedParams[key] = value;
      }
    }
    
    req.sanitized = {
      action,
      parameters: sanitizedParams
    };
    
    console.log(`✅ PDF modification request validated: ${action}`);
    next();
    
  } catch (error) {
    console.error('❌ Error in PDF modification validation middleware:', error);
    res.status(500).json({
      error: 'Error interno de validación',
      code: 'VALIDATION_INTERNAL_ERROR'
    });
  }
};

/**
 * Middleware general de sanitización de body
 */
const sanitizeRequestBody = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  next();
};

/**
 * Sanitiza recursivamente un objeto
 */
function sanitizeObject(obj) {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (typeof value === 'object') {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

module.exports = {
  validatePDFGenerationRequest,
  validatePDFModificationRequest,
  sanitizeRequestBody,
  sanitizeString,
  validateWID,
  validateDealData,
  validatePDFConfig
};