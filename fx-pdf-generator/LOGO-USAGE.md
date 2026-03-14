# Cómo Usar Logos Personalizados en PDFs

## Opciones para Agregar Logos

### 1. Logo como String Base64 (Más Simple)

```javascript
const LogoHelper = require('./src/utils/LogoHelper');

// Convertir imagen a base64
const xendingLogo = LogoHelper.createLogoObject('./src/utils/Xending.png', {
    text: 'Xending Global Payments',
    width: '60px',
    height: '60px'
});

const dealData = {
    dealNumber: 'DEAL-001',
    clientName: 'Mi Empresa',
    // ... otros datos
    logo: xendingLogo // Simplemente pasa el string base64
};
```

### 2. Logo como Objeto (Más Control)

```javascript
const LogoHelper = require('./src/utils/LogoHelper');

// Crear objeto de logo con opciones
const logoObject = LogoHelper.createLogoObject('./src/utils/Xending.png', {
    text: 'Xending Global Payments',    // Texto junto al logo
    width: '60px',         // Ancho del logo
    height: '60px'         // Alto del logo
});

const dealData = {
    dealNumber: 'DEAL-001',
    clientName: 'Mi Empresa',
    // ... otros datos
    logo: logoObject
};
```

### 3. Sin Logo (Usa el Logo por Defecto)

```javascript
const dealData = {
    dealNumber: 'DEAL-001',
    clientName: 'Mi Empresa',
    // ... otros datos
    // No incluir 'logo' o pasarlo como null
};
```

## Formatos de Imagen Soportados

- **PNG** (recomendado para logos con transparencia)
- **JPG/JPEG** (bueno para fotos)
- **SVG** (vectorial, se ve bien a cualquier tamaño)
- **GIF** (básico)

## Ejemplo Completo

```javascript
const PDFService = require('./src/services/PDFService');
const LogoHelper = require('./src/utils/LogoHelper');

async function generarPDFConLogo() {
    // Opción 1: Logo simple
    const logoBase64 = LogoHelper.imageToBase64('./assets/mi-logo.png');
    
    // Opción 2: Logo con opciones
    const logoCompleto = LogoHelper.createLogoObject('./src/utils/Xending.png', {
        text: 'Xending Global Payments',
        width: '50px',
        height: '50px'
    });

    const dealData = {
        dealNumber: 'DEAL-12345',
        clientName: 'Cliente Ejemplo',
        tradeDate: '28-Sep-2025',
        buyAmount: '10,000.00',
        buyCurrency: 'USD',
        payAmount: '9,000.00',
        payCurrency: 'EUR',
        exchangeRate: '1.1111',
        logo: logoCompleto  // o logoBase64
    };

    try {
        await PDFService.generatePDF('monex', dealData, 'mi-pdf-con-logo.pdf');
        console.log('PDF generado exitosamente!');
    } catch (error) {
        console.error('Error:', error);
    }
}

generarPDFConLogo();
```

## Validación de Logos

```javascript
const LogoHelper = require('./src/utils/LogoHelper');

// Validar si un logo es válido
const esValido = LogoHelper.isValidLogo(miLogo);

// Obtener información del logo
const info = LogoHelper.getLogoInfo(miLogo);
console.log(info);
// Output: { type: 'base64', format: 'png', hasText: false, size: 12345 }
```

## Ejemplo Específico: Logo de Xending Global Payments

```javascript
const LogoHelper = require('./src/utils/LogoHelper');

// Crear logo de Xending con texto
const xendingLogo = LogoHelper.createLogoObject('./src/utils/Xending.png', {
    text: 'Xending Global Payments',
    width: '60px',
    height: '60px'
});

const dealData = {
    dealNumber: 'XENDING-001',
    clientName: 'Cliente Ejemplo',
    // ... otros datos
    logo: xendingLogo
};
```

## Consejos

1. **Tamaño de Archivo**: Los logos muy grandes aumentan el tamaño del PDF
2. **Formato**: PNG es mejor para logos con transparencia
3. **Resolución**: 72-150 DPI es suficiente para PDFs
4. **Dimensiones**: Logos de 40x40px a 80x80px funcionan bien

## Troubleshooting

- **Error "Archivo no encontrado"**: Verifica la ruta del archivo
- **Logo no se ve**: Asegúrate que el formato sea soportado
- **PDF muy grande**: Usa imágenes más pequeñas o comprimidas
- **Logo distorsionado**: Ajusta width y height proporcionalmente