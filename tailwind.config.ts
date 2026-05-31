import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ink: '#141318',
        paper: '#f8f7f2',
        ember: '#c84f31',
        moss: '#4f6f52',
        gold: '#d7a948'
      },
      boxShadow: {
        soft: '0 18px 50px rgba(20, 19, 24, 0.10)'
      }
    }
  },
  plugins: []
} satisfies Config;
