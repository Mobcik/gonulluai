/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#3D7A4F',
          dark:    '#2E5E3A',
          light:   '#E8F5EC',
        },
        earth: {
          DEFAULT: '#6B4F2A',
          light:   '#C4A882',
          lighter: '#F7F3EE',
        },
        text: {
          DEFAULT: '#2D2416',
          muted:   '#9B8468',
          soft:    '#7A6548',
        },
      },
      fontFamily: {
        display: ['"Playfair Display"', 'serif'],
        body:    ['"DM Sans"', 'sans-serif'],
      },
      borderRadius: {
        card: '20px',
        chip: '999px',
      },
      animation: {
        'fadeUp': 'fadeUp 0.6s ease-out forwards',
        'fadeIn': 'fadeIn 0.4s ease-out forwards',
        'float': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'confetti': 'confetti 0.5s ease-out forwards',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        confetti: {
          '0%': { transform: 'scale(0) rotate(0deg)', opacity: '0' },
          '100%': { transform: 'scale(1) rotate(360deg)', opacity: '1' },
        },
      },
      boxShadow: {
        'card': '0 4px 24px rgba(45, 36, 22, 0.08)',
        'card-hover': '0 8px 32px rgba(45, 36, 22, 0.14)',
        'green': '0 4px 20px rgba(61, 122, 79, 0.3)',
        'green-lg': '0 8px 28px rgba(61, 122, 79, 0.4)',
      },
    },
  },
}
