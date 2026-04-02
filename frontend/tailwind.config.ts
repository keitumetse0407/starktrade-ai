import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#0A0E27',
          50: '#1A1F3D',
          100: '#141833',
          200: '#1E2445',
          300: '#282F52',
          400: '#323A5F',
        },
        electric: {
          DEFAULT: '#00D4FF',
          50: 'rgba(0, 212, 255, 0.05)',
          100: 'rgba(0, 212, 255, 0.1)',
          200: 'rgba(0, 212, 255, 0.2)',
          300: 'rgba(0, 212, 255, 0.3)',
          400: 'rgba(0, 212, 255, 0.4)',
        },
        profit: {
          DEFAULT: '#00FF88',
          50: 'rgba(0, 255, 136, 0.05)',
          100: 'rgba(0, 255, 136, 0.1)',
          200: 'rgba(0, 255, 136, 0.2)',
          300: 'rgba(0, 255, 136, 0.3)',
        },
        loss: {
          DEFAULT: '#FF3366',
          50: 'rgba(255, 51, 102, 0.05)',
          100: 'rgba(255, 51, 102, 0.1)',
          200: 'rgba(255, 51, 102, 0.2)',
          300: 'rgba(255, 51, 102, 0.3)',
        },
        gold: {
          DEFAULT: '#FFD700',
          50: 'rgba(255, 215, 0, 0.05)',
          100: 'rgba(255, 215, 0, 0.1)',
          200: 'rgba(255, 215, 0, 0.2)',
        },
        muted: {
          DEFAULT: '#8892B0',
          light: '#A8B2D1',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'fade-up': 'fadeUp 0.6s ease-out',
        'slide-in': 'slideIn 0.4s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'float': 'float 6s ease-in-out infinite',
        'spin-slow': 'spin 8s linear infinite',
        'counter': 'counter 2s ease-out',
        'shimmer': 'shimmer 2s linear infinite',
        'gradient-x': 'gradientX 15s ease infinite',
        'bounce-subtle': 'bounceSubtle 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 20px rgba(0, 212, 255, 0.1)' },
          '100%': { boxShadow: '0 0 40px rgba(0, 212, 255, 0.3)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        counter: {
          '0%': { opacity: '0', transform: 'scale(0.5)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        gradientX: {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        bounceSubtle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
      boxShadow: {
        'glow-electric': '0 0 20px rgba(0, 212, 255, 0.3)',
        'glow-profit': '0 0 20px rgba(0, 255, 136, 0.3)',
        'glow-loss': '0 0 20px rgba(255, 51, 102, 0.3)',
        'glow-gold': '0 0 20px rgba(255, 215, 0, 0.3)',
        'card': '0 4px 30px rgba(0, 0, 0, 0.3)',
        'card-hover': '0 8px 40px rgba(0, 212, 255, 0.15)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
    },
  },
  plugins: [],
};

export default config;
