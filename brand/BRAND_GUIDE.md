# Xending Capital - Brand Guide

## Colores Principales (HSL)

### Primary (Azul Oscuro Xending)
- --primary: 213 67% 25% -> hsl(213, 67%, 25%) -> ~#153764
- Uso: Headers, sidebar, botones principales, acentos

### Brand System
- --brand-1: 210 50% 18% -> Azul oscuro profundo
- --brand-2: 174 54% 55% -> Teal/verde agua
- --brand-contrast: 210 40% 98% -> Blanco para texto sobre brand
- Gradient: linear-gradient(135deg, hsl(210 50% 18%), hsl(174 54% 55%))

### Background
- --background: 0 0% 98% -> Gris muy claro (#fafafa)
- --card: 0 0% 100% -> Blanco puro
- --foreground: 215 25% 27% -> Gris oscuro para texto

### Status Colors (para semaforos del scoring)
- Success: 142 76% 36% -> Verde
- Warning: 45 93% 47% -> Amarillo
- Info: 213 67% 55% -> Azul medio
- Error: 0 84% 60% -> Rojo

### Dashboard
- Sidebar BG: 213 67% 25%
- Sidebar Hover: 213 67% 30%
- Sidebar Active: 213 67% 35%
- Chart Positive: 142 76% 36%
- Chart Negative: 0 84% 60%

## Logos Disponibles
- Xending.png - Logo principal (usado en PDFs)
- Logoxending.png - Logo completo para web
- Logo letra.png - Logo con texto
- Logo Scory.png - Logo de Scory (partner)
- favicon.ico - Favicon

## Border Radius
- --radius: 0.5rem (8px)

## CSS Variables Completas
:root {
  --background: 0 0% 98%;
  --foreground: 215 25% 27%;
  --card: 0 0% 100%;
  --card-foreground: 215 25% 27%;
  --primary: 213 67% 25%;
  --primary-foreground: 0 0% 98%;
  --secondary: 210 40% 96.1%;
  --secondary-foreground: 215 25% 27%;
  --muted: 210 40% 96.1%;
  --muted-foreground: 215.4 16.3% 46.9%;
  --accent: 213 67% 25%;
  --accent-foreground: 0 0% 98%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 210 40% 98%;
  --border: 214.3 31.8% 91.4%;
  --input: 214.3 31.8% 91.4%;
  --ring: 213 67% 25%;
  --radius: 0.5rem;
  --brand-1: 210 50% 18%;
  --brand-2: 174 54% 55%;
  --brand-contrast: 210 40% 98%;
  --status-success: 142 76% 36%;
  --status-success-bg: 142 76% 96%;
  --status-warning: 45 93% 47%;
  --status-warning-bg: 45 93% 95%;
  --status-info: 213 67% 55%;
  --status-info-bg: 213 67% 95%;
  --status-error: 0 84% 60%;
  --status-error-bg: 0 84% 96%;
}
