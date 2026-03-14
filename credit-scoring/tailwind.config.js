/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'hsl(213, 67%, 25%)',
          foreground: 'hsl(0, 0%, 98%)',
        },
        brand: {
          1: 'hsl(210, 50%, 18%)',
          2: 'hsl(174, 54%, 55%)',
          contrast: 'hsl(210, 40%, 98%)',
        },
        background: 'hsl(0, 0%, 98%)',
        foreground: 'hsl(215, 25%, 27%)',
        card: {
          DEFAULT: 'hsl(0, 0%, 100%)',
          foreground: 'hsl(215, 25%, 27%)',
        },
        muted: {
          DEFAULT: 'hsl(210, 40%, 96.1%)',
          foreground: 'hsl(215.4, 16.3%, 46.9%)',
        },
        border: 'hsl(214.3, 31.8%, 91.4%)',
        status: {
          success: 'hsl(142, 76%, 36%)',
          'success-bg': 'hsl(142, 76%, 96%)',
          warning: 'hsl(45, 93%, 47%)',
          'warning-bg': 'hsl(45, 93%, 95%)',
          error: 'hsl(0, 84%, 60%)',
          'error-bg': 'hsl(0, 84%, 96%)',
          info: 'hsl(213, 67%, 55%)',
          'info-bg': 'hsl(213, 67%, 95%)',
        },
      },
      borderRadius: {
        DEFAULT: '0.5rem',
      },
    },
  },
  plugins: [],
};
