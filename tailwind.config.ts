import type { Config } from 'tailwindcss';
const config: Config = { darkMode: ['class'], content: ['./src/**/*.{ts,tsx}'], theme: { extend: { colors: { ink: '#17151f', lilac: '#8b78e6', mist: '#f6f4fb' }, boxShadow: { soft: '0 18px 60px rgba(35,24,74,.08)' } } }, plugins: [] };
export default config;
