/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Enable dark mode with class strategy
  theme: {
    extend: {
      colors: {
        // Custom security status colors
        security: {
          enabled: {
            50: '#f0fdf4',
            100: '#dcfce7',
            500: '#22c55e',
            600: '#16a34a',
            800: '#166534',
            900: '#14532d'
          },
          disabled: {
            50: '#fef2f2',
            100: '#fee2e2',
            500: '#ef4444',
            600: '#dc2626',
            800: '#991b1b',
            900: '#7f1d1d'
          },
          warning: {
            50: '#fffbeb',
            100: '#fef3c7',
            500: '#f59e0b',
            600: '#d97706',
            800: '#92400e',
            900: '#78350f'
          },
          neutral: {
            50: '#f9fafb',
            100: '#f3f4f6',
            500: '#6b7280',
            600: '#4b5563',
            700: '#374151',
            800: '#1f2937',
            900: '#111827'
          }
        }
      },
      backgroundColor: {
        'card-light': '#ffffff',
        'card-dark': '#1f2937'
      },
      borderColor: {
        'card-light': '#e5e7eb',
        'card-dark': '#374151'
      }
    },
  },
  plugins: [],
}
