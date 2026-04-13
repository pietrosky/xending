/**
 * Middleware de Rate Limiting para el PDF Generator
 * Protege contra abuso y ataques de denegación de servicio
 */

const rateLimit = require('express-rate-limit');

/**
 * Rate limiter general para todas las rutas
 */
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por ventana por IP
  message: {
    error: 'Demasiadas solicitudes desde esta IP, intenta de nuevo en 15 minutos.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Rate limiter estricto para generación de PDFs
 */
const pdfGenerationLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 50, // máximo 50 PDFs por ventana por IP
  message: {
    error: 'Demasiadas solicitudes de generación de PDF, intenta de nuevo en 5 minutos.',
    code: 'PDF_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Speed limiter simplificado (sin slow-down)
 */
const speedLimiter = (req, res, next) => {
  // Middleware pass-through simple
  next();
};

/**
 * Rate limiter para endpoints de autenticación
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // máximo 5 intentos de auth por ventana
  message: {
    error: 'Demasiados intentos de autenticación, intenta de nuevo en 15 minutos.',
    code: 'AUTH_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true // no contar requests exitosos
});

/**
 * Middleware personalizado para logging de rate limiting
 */
const rateLimitLogger = (req, res, next) => {
  // Log información de rate limiting si está presente
  if (req.rateLimit) {
    const { limit, current, remaining, resetTime } = req.rateLimit;
    console.log(`📊 Rate limit status for ${req.ip}: ${current}/${limit} (${remaining} remaining, resets at ${new Date(resetTime)})`);
  }
  next();
};

/**
 * Middleware de validación de origen
 */
const originValidator = (req, res, next) => {
  const allowedOrigins = [
    'http://localhost:8080',
    'http://localhost:3000',
    'https://xending-marketplace.com', // Dominio de producción
    process.env.ALLOWED_ORIGIN
  ].filter(Boolean);

  const origin = req.get('Origin') || req.get('Referer');
  
  if (process.env.NODE_ENV === 'production' && origin) {
    const isAllowed = allowedOrigins.some(allowed => 
      origin.startsWith(allowed)
    );
    
    if (!isAllowed) {
      console.warn(`🚫 Blocked request from unauthorized origin: ${origin}`);
      return res.status(403).json({
        error: 'Origen no autorizado',
        code: 'UNAUTHORIZED_ORIGIN'
      });
    }
  }
  
  next();
};

/**
 * Middleware de validación de Content-Type para endpoints que requieren JSON
 */
const jsonContentTypeValidator = (req, res, next) => {
  if (req.method === 'POST' || req.method === 'PUT') {
    const contentType = req.get('Content-Type');
    
    if (!contentType || !contentType.includes('application/json')) {
      return res.status(400).json({
        error: 'Content-Type debe ser application/json',
        code: 'INVALID_CONTENT_TYPE'
      });
    }
  }
  
  next();
};

/**
 * Middleware de validación de tamaño de payload
 */
const payloadSizeValidator = (maxSize = '10mb') => {
  return (req, res, next) => {
    const contentLength = req.get('Content-Length');
    
    if (contentLength) {
      const sizeInMB = parseInt(contentLength) / (1024 * 1024);
      const maxSizeInMB = parseInt(maxSize);
      
      if (sizeInMB > maxSizeInMB) {
        console.warn(`🚫 Payload too large: ${sizeInMB}MB > ${maxSizeInMB}MB from IP: ${req.ip}`);
        return res.status(413).json({
          error: `Payload demasiado grande. Máximo: ${maxSize}`,
          code: 'PAYLOAD_TOO_LARGE'
        });
      }
    }
    
    next();
  };
};

module.exports = {
  generalLimiter,
  pdfGenerationLimiter,
  speedLimiter,
  authLimiter,
  rateLimitLogger,
  originValidator,
  jsonContentTypeValidator,
  payloadSizeValidator
};