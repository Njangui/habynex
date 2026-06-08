import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fff7f4', 100: '#ffede6', 200: '#ffd4c2', 300: '#ffb399',
          400: '#ff8c6b', 500: '#f95d1e', 600: '#e84e0f', 700: '#c43d08',
          800: '#9e3107', 900: '#7c270a', 950: '#3d1005',
        },
        hb: {
          50: '#f7f7f7', 100: '#ebebeb', 150: '#e8e8e8', 200: '#dddddd',
          300: '#b0b0b0', 400: '#717171', 500: '#484848', 600: '#383838',
          700: '#222222', 800: '#1a1a1a', 900: '#121212',
        },
        trust: { 50: '#f0fdf4', 400: '#4ade80', 500: '#22c55e', 600: '#16a34a' },
      },
      fontFamily: {
        sans: ['Inter', 'Circular Std', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'sans-serif'],
      },
      fontSize: {
        'airbnb-xs':  ['11px', { lineHeight: '16px', fontWeight: '400' }],
        'airbnb-sm':  ['13px', { lineHeight: '18px', fontWeight: '400' }],
        'airbnb-base':['14px', { lineHeight: '20px', fontWeight: '400' }],
        'airbnb-md':  ['16px', { lineHeight: '22px', fontWeight: '500' }],
        'airbnb-lg':  ['18px', { lineHeight: '26px', fontWeight: '600' }],
        'airbnb-xl':  ['22px', { lineHeight: '28px', fontWeight: '700' }],
        'airbnb-2xl': ['26px', { lineHeight: '32px', fontWeight: '700' }],
      },
      borderRadius: {
        'sm': '6px', 'md': '8px', 'lg': '10px', 'xl': '12px',
        '2xl': '16px', '3xl': '24px', 'pill': '9999px', 'card': '12px',
      },
      boxShadow: {
        'airbnb': '0px 2px 4px rgba(0,0,0,0.08), 0px 4px 12px rgba(0,0,0,0.05)',
        'airbnb-hover': 'rgba(0,0,0,0.18) 0px 2px 4px',
        'airbnb-lg': '0px 6px 20px rgba(0,0,0,0.13)',
        'airbnb-xl': 'rgba(0,0,0,0.2) 0px 10px 40px',
        'card': 'rgba(0,0,0,0.12) 0px 6px 16px',
        'input-focus': 'inset 0 0 0 2px #222222',
        'nav': '0px 1px 0px rgba(0,0,0,0.08)',
        'pill': 'rgba(0,0,0,0.1) 0px 2px 8px',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.25s ease-out',
        'slide-down': 'slideDown 0.2s ease-out',
        'shimmer': 'shimmer 1.5s infinite',
      },
    },
  },
  plugins: [],
}

export default config
