import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Vert d'interface, repris des maquettes.
        primaire: {
          50: '#F0FDF4',
          100: '#DCFCE7',
          500: '#16A34A',
          600: '#15803D',
          700: '#166534',
        },
        // Teintes du logo Clean Guinée (moulinet).
        marque: {
          tealFonce: '#14524F',
          teal: '#0FA085',
          lime: '#8CD211',
          vert: '#00B140',
          ardoise: '#2E4256',
        },
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
