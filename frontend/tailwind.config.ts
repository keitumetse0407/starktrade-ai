import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  darkMode: 'class',
  theme: {
    /* ============================================================
       8PX GRID SPACING SYSTEM
       Every spacing value is a multiple of 4px (0.25rem)
       ============================================================ */
    spacing: {
      px: '1px',
      0: '0px',
      0.5: '0.125rem',
      1: '0.25rem',   // 4px
      1.5: '0.375rem', // 6px
      2: '0.5rem',    // 8px
      2.5: '0.625rem', // 10px
      3: '0.75rem',   // 12px
      3.5: '0.875rem', // 14px
      4: '1rem',      // 16px
      5: '1.25rem',   // 20px
      6: '1.5rem',    // 24px
      7: '1.75rem',   // 28px
      8: '2rem',      // 32px
      9: '2.25rem',   // 36px
      10: '2.5rem',   // 40px
      11: '2.75rem',  // 44px
      12: '3rem',     // 48px
      14: '3.5rem',   // 56px
      16: '4rem',     // 64px
      18: '4.5rem',   // 72px
      20: '5rem',     // 80px
      24: '6rem',     // 96px
      28: '7rem',     // 112px
      32: '8rem',     // 128px
      36: '9rem',     // 144px
      40: '10rem',    // 160px
      44: '11rem',    // 176px
      48: '12rem',    // 192px
      52: '13rem',    // 208px
      56: '14rem',    // 224px
      60: '15rem',    // 240px
      64: '16rem',    // 256px
      72: '18rem',    // 288px
      80: '20rem',    // 320px
      88: '22rem',    // 352px
      96: '24rem',    // 384px
      112: '28rem',   // 448px
      128: '32rem',   // 512px
      144: '36rem',   // 576px
    },
    extend: {
      /* ============================================================
         TYPOGRAPHY SCALE — Modular 1.25 ratio (Major Third)
         Base: 16px (1rem). Line heights tuned for readability.
         ============================================================ */
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem', letterSpacing: '0.025em' }],       // 12px
        'sm': ['0.875rem', { lineHeight: '1.25rem', letterSpacing: '0.015em' }],    // 14px
        'base': ['1rem', { lineHeight: '1.5rem' }],                                  // 16px
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],                               // 18px
        'xl': ['1.25rem', { lineHeight: '1.75rem', letterSpacing: '-0.01em' }],     // 20px
        '2xl': ['1.5rem', { lineHeight: '2rem', letterSpacing: '-0.015em' }],       // 24px
        '3xl': ['1.875rem', { lineHeight: '2.25rem', letterSpacing: '-0.02em' }],   // 30px
        '4xl': ['2.25rem', { lineHeight: '2.5rem', letterSpacing: '-0.025em' }],    // 36px
        '5xl': ['3rem', { lineHeight: '1', letterSpacing: '-0.03em' }],             // 48px
        '6xl': ['3.75rem', { lineHeight: '1', letterSpacing: '-0.035em' }],         // 60px
        '7xl': ['4.5rem', { lineHeight: '1', letterSpacing: '-0.04em' }],           // 72px
        '8xl': ['6rem', { lineHeight: '1', letterSpacing: '-0.045em' }],            // 96px
        '9xl': ['8rem', { lineHeight: '1', letterSpacing: '-0.05em' }],             // 128px
      },

      colors: {
        navy: {
          DEFAULT: '#0A0E27',
          50: '#1A1F3D',
          100: '#141833',
          200: '#1E2445',
          300: '#282F52',
          400: '#323A5F',
        },
        /* WCAG AA compliant: #00BFFF on #0A0E27 = 4.64 (passes AA for normal text) */
        electric: {
          DEFAULT: '#00BFFF',
          50: 'rgba(0, 191, 255, 0.05)',
          100: 'rgba(0, 191, 255, 0.1)',
          200: 'rgba(0, 191, 255, 0.2)',
          300: 'rgba(0, 191, 255, 0.3)',
          400: 'rgba(0, 191, 255, 0.4)',
          500: 'rgba(0, 191, 255, 0.5)',
          600: 'rgba(0, 191, 255, 0.6)',
          700: 'rgba(0, 191, 255, 0.7)',
          800: 'rgba(0, 191, 255, 0.8)',
          900: 'rgba(0, 191, 255, 0.9)',
        },
        profit: {
          DEFAULT: '#00E676',
          50: 'rgba(0, 230, 118, 0.05)',
          100: 'rgba(0, 230, 118, 0.1)',
          200: 'rgba(0, 230, 118, 0.2)',
          300: 'rgba(0, 230, 118, 0.3)',
          400: 'rgba(0, 230, 118, 0.4)',
          500: 'rgba(0, 230, 118, 0.5)',
          600: 'rgba(0, 230, 118, 0.6)',
          700: 'rgba(0, 230, 118, 0.7)',
          800: 'rgba(0, 230, 118, 0.8)',
          900: 'rgba(0, 230, 118, 0.9)',
        },
        loss: {
          DEFAULT: '#FF3366',
          50: 'rgba(255, 51, 102, 0.05)',
          100: 'rgba(255, 51, 102, 0.1)',
          200: 'rgba(255, 51, 102, 0.2)',
          300: 'rgba(255, 51, 102, 0.3)',
          400: 'rgba(255, 51, 102, 0.4)',
          500: 'rgba(255, 51, 102, 0.5)',
          600: 'rgba(255, 51, 102, 0.6)',
          700: 'rgba(255, 51, 102, 0.7)',
          800: 'rgba(255, 51, 102, 0.8)',
          900: 'rgba(255, 51, 102, 0.9)',
        },
        gold: {
          DEFAULT: '#FFD700',
          50: 'rgba(255, 215, 0, 0.05)',
          100: 'rgba(255, 215, 0, 0.1)',
          200: 'rgba(255, 215, 0, 0.2)',
          300: 'rgba(255, 215, 0, 0.3)',
          400: 'rgba(255, 215, 0, 0.4)',
        },
        muted: {
          DEFAULT: '#8892B0',
          light: '#A8B2D1',
        },
        /* Semantic surface colors for backgrounds */
        surface: {
          DEFAULT: 'rgba(26, 31, 61, 0.6)',
          hover: 'rgba(26, 31, 61, 0.8)',
          active: 'rgba(26, 31, 61, 0.95)',
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
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'float': 'float 6s ease-in-out infinite',
        'spin-slow': 'spin 8s linear infinite',
        'counter': 'counter 2s ease-out',
        'shimmer': 'shimmer 2s linear infinite',
        'gradient-x': 'gradientX 15s ease infinite',
        'bounce-subtle': 'bounceSubtle 2s ease-in-out infinite',
        'skeleton': 'skeleton 1.5s ease-in-out infinite',
        'celebrate': 'celebrate 0.6s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
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
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 20px rgba(0, 191, 255, 0.1)' },
          '100%': { boxShadow: '0 0 40px rgba(0, 191, 255, 0.3)' },
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
        skeleton: {
          '0%': { opacity: '0.4' },
          '50%': { opacity: '1' },
          '100%': { opacity: '0.4' },
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
        celebrate: {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '50%': { transform: 'scale(1.05)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },

      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },

      boxShadow: {
        'glow-electric': '0 0 20px rgba(0, 191, 255, 0.3)',
        'glow-profit': '0 0 20px rgba(0, 230, 118, 0.3)',
        'glow-loss': '0 0 20px rgba(255, 51, 102, 0.3)',
        'glow-gold': '0 0 20px rgba(255, 215, 0, 0.3)',
        'card': '0 4px 30px rgba(0, 0, 0, 0.3)',
        'card-hover': '0 8px 40px rgba(0, 191, 255, 0.15)',
        'button-hover': '0 4px 16px rgba(0, 191, 255, 0.25)',
        'inner-sm': 'inset 0 1px 2px rgba(0, 0, 0, 0.1)',
      },

      borderRadius: {
        'none': '0px',
        'sm': '0.375rem',
        DEFAULT: '0.5rem',
        'md': '0.625rem',
        'lg': '0.75rem',
        'xl': '0.875rem',
        '2xl': '1rem',
        '3xl': '1.25rem',
        '4xl': '1.5rem',
      },

      /* Transition presets */
      transitionDuration: {
        'instant': '100ms',
        'fast': '150ms',
        'normal': '200ms',
        'slow': '300ms',
        'slower': '500ms',
      },

      zIndex: {
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
        '100': '100',
      },
    },
  },
  plugins: [],
};

export default config;
