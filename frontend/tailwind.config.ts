import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  darkMode: 'class',
  theme: {
    spacing: {
      px: '1px', 0: '0px', 0.5: '0.125rem', 1: '0.25rem', 1.5: '0.375rem',
      2: '0.5rem', 2.5: '0.625rem', 3: '0.75rem', 3.5: '0.875rem',
      4: '1rem', 5: '1.25rem', 6: '1.5rem', 7: '1.75rem', 8: '2rem',
      9: '2.25rem', 10: '2.5rem', 11: '2.75rem', 12: '3rem', 14: '3.5rem',
      16: '4rem', 20: '5rem', 24: '6rem', 28: '7rem', 32: '8rem',
      36: '9rem', 40: '10rem', 44: '11rem', 48: '12rem', 52: '13rem',
      56: '14rem', 60: '15rem', 64: '16rem', 72: '18rem', 80: '20rem',
      96: '24rem', 112: '28rem', 128: '32rem', 144: '36rem',
    },
    extend: {
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem', letterSpacing: '0.025em' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem', letterSpacing: '0.015em' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem', letterSpacing: '-0.01em' }],
        '2xl': ['1.5rem', { lineHeight: '2rem', letterSpacing: '-0.015em' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem', letterSpacing: '-0.02em' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem', letterSpacing: '-0.025em' }],
        '5xl': ['3rem', { lineHeight: '1', letterSpacing: '-0.03em' }],
        '6xl': ['3.75rem', { lineHeight: '1', letterSpacing: '-0.035em' }],
        '7xl': ['4.5rem', { lineHeight: '1', letterSpacing: '-0.04em' }],
        '8xl': ['6rem', { lineHeight: '1', letterSpacing: '-0.045em' }],
        '9xl': ['8rem', { lineHeight: '1', letterSpacing: '-0.05em' }],
      },
      colors: {
        void: {
          DEFAULT: '#000000',
          light: '#050505',
          card: 'rgba(255, 255, 255, 0.02)',
          'card-hover': 'rgba(255, 255, 255, 0.04)',
        },
        muted: {
          DEFAULT: 'rgba(255, 255, 255, 0.4)',
          dim: 'rgba(255, 255, 255, 0.3)',
          light: 'rgba(255, 255, 255, 0.6)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        display: ['Space Grotesk', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'float-slow': 'float 7s ease-in-out infinite',
        'pulse-glow': 'pulseGlow 4s ease-in-out infinite',
        'marquee': 'marquee 30s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '0.3' },
          '50%': { opacity: '0.6' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
      zIndex: {
        '60': '60', '70': '70', '80': '80', '90': '90', '100': '100',
      },
    },
  },
  plugins: [],
};

export default config;
