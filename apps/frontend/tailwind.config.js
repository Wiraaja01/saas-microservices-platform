/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',   // Primary
          700: '#1d4ed8',   // Primary hover
          800: '#1e40af',
          900: '#1e3a8a',
        },
        ink: {
          50: '#f8fafc',    // Background sekunder
          100: '#f1f5f9',
          200: '#e2e8f0',   // Border
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',   // Teks sekunder
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#000000',   // Teks utama (hitam)
        },
        surface: '#ffffff',
        success: {
          50: '#f0fdf4',
          500: '#22c55e',
          600: '#16a34a',
          700: '#24a553',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgb(0 0 0 / 0.05), 0 1px 2px -1px rgb(0 0 0 / 0.05)',
        'card-hover': '0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.05)',
      },
    },
  },
  plugins: [],
};