const fs = require('fs');
const path = require('path');

class LogoHelper {
    /**
     * Convierte una imagen a base64 para usar en PDFs
     * @param {string} imagePath - Ruta a la imagen
     * @returns {string|null} - String base64 o null si hay error
     */
    static imageToBase64(imagePath) {
        try {
            if (!fs.existsSync(imagePath)) {
                throw new Error(`Archivo no encontrado: ${imagePath}`);
            }

            const imageBuffer = fs.readFileSync(imagePath);
            const imageExtension = path.extname(imagePath).toLowerCase();
            let mimeType = 'image/png';
            
            switch (imageExtension) {
                case '.jpg':
                case '.jpeg':
                    mimeType = 'image/jpeg';
                    break;
                case '.png':
                    mimeType = 'image/png';
                    break;
                case '.svg':
                    mimeType = 'image/svg+xml';
                    break;
                case '.gif':
                    mimeType = 'image/gif';
                    break;
                default:
                    console.warn(`Tipo de imagen no reconocido: ${imageExtension}, usando PNG por defecto`);
            }
            
            return `data:${mimeType};base64,${imageBuffer.toString('base64')}`;
        } catch (error) {
            console.error('Error convirtiendo imagen a base64:', error.message);
            return null;
        }
    }

    /**
     * Crea un objeto de logo con opciones
     * @param {string} imagePath - Ruta a la imagen
     * @param {Object} options - Opciones adicionales
     * @returns {Object|null} - Objeto de logo o null si hay error
     */
    static createLogoObject(imagePath, options = {}) {
        const base64 = this.imageToBase64(imagePath);
        if (!base64) return null;

        return {
            src: base64,
            text: options.text || '',
            width: options.width || '40px',
            height: options.height || '40px'
        };
    }

    /**
     * Valida si un logo es válido
     * @param {string|Object} logo - Logo a validar
     * @returns {boolean} - True si es válido
     */
    static isValidLogo(logo) {
        if (typeof logo === 'string') {
            return logo.startsWith('data:image/');
        }
        
        if (typeof logo === 'object' && logo !== null) {
            return logo.src && logo.src.startsWith('data:image/');
        }
        
        return false;
    }

    /**
     * Obtiene información sobre un logo
     * @param {string|Object} logo - Logo a analizar
     * @returns {Object} - Información del logo
     */
    static getLogoInfo(logo) {
        if (typeof logo === 'string' && logo.startsWith('data:image/')) {
            const mimeMatch = logo.match(/data:image\/([^;]+)/);
            return {
                type: 'base64',
                format: mimeMatch ? mimeMatch[1] : 'unknown',
                hasText: false,
                size: logo.length
            };
        }
        
        if (typeof logo === 'object' && logo !== null && logo.src) {
            const mimeMatch = logo.src.match(/data:image\/([^;]+)/);
            return {
                type: 'object',
                format: mimeMatch ? mimeMatch[1] : 'unknown',
                hasText: !!logo.text,
                text: logo.text || '',
                width: logo.width || '40px',
                height: logo.height || '40px',
                size: logo.src.length
            };
        }
        
        return {
            type: 'invalid',
            format: null,
            hasText: false
        };
    }
}

module.exports = LogoHelper;