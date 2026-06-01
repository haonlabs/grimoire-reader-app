import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ink: '#0a0a0c',
        paper: '#f5f5f5',
        ember: '#7c3aed',
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
