/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Instrument Serif', 'ui-serif', 'Georgia', 'serif'],
        sans: ['Inter', '-apple-system', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      colors: {
        // Kintsugi semantic names
        ink: '#0b0b0e',
        charcoal: '#15151a',
        cloth: '#1e1d23',
        bone: '#f3ece0',
        stone: '#9b9080',
        gold: {
          DEFAULT: '#d4af37',
          soft: '#b8912d',
          dim: '#8a6e21',
        },
        vermillion: {
          DEFAULT: '#a73d2a',
          dim: '#7a2b1c',
        },
        pine: {
          DEFAULT: '#6b9e7a',
          deep: '#3d5c4a',
        },

        // Overrides that repaint existing class usage across the app
        // black/white are repointed to the kintsugi ground/text so opacity
        // utilities (bg-black/40, text-white/50) pick up warm tones.
        black: '#0b0b0e',
        white: '#f3ece0',
        amber: {
          300: '#e7c65a',
          400: '#d4af37', // gold leaf
          500: '#b8912d',
        },
        red: {
          300: '#c4584a',
          400: '#a73d2a', // vermillion
          500: '#8a2f1e',
          950: '#2b0f08',
        },
        emerald: {
          300: '#92b69e',
          400: '#6b9e7a',
          500: '#4a7859',
        },
        zinc: {
          900: '#15151a',
          950: '#0e0e11',
        },
      },
    },
  },
  plugins: [],
  // Explicit safelist — ensures dynamic color classes used in nutrition/joint screens compile
  safelist: [
    'bg-red-500/5', 'bg-red-500/10', 'bg-red-500/20', 'bg-red-500/40',
    'border-red-500/20', 'border-red-500/30', 'border-red-500/40',
    'text-red-300', 'text-red-400', 'text-red-400/80',
    'bg-amber-500/5', 'bg-amber-500/10', 'bg-amber-500/20',
    'border-amber-500/20', 'border-amber-500/30', 'border-amber-500/40',
    'text-amber-300', 'text-amber-400', 'text-amber-400/80', 'text-amber-400/60', 'text-amber-400/70',
    'bg-emerald-500/5', 'bg-emerald-500/10', 'bg-emerald-500/20',
    'border-emerald-500/20', 'border-emerald-500/30', 'border-emerald-500/40',
    'text-emerald-300', 'text-emerald-400',
    'bg-sky-500/5', 'bg-sky-500/10', 'bg-sky-500/20',
    'border-sky-500/20', 'border-sky-500/30',
    'text-sky-300', 'text-sky-400',
    'bg-violet-500/5', 'bg-violet-500/10',
    'border-violet-500/20', 'border-violet-500/30',
    'text-violet-300', 'text-violet-400',
    'bg-gold/5', 'bg-gold/10', 'bg-gold/20',
    'border-gold/20', 'border-gold/30', 'border-gold/40',
    'text-gold', 'text-gold/60', 'text-gold/80',
  ],
};
