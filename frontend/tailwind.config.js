/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Composio-inspired palette
        ink: { DEFAULT: '#0a0a0a', soft: '#111113', raised: '#161618', line: '#27272a' },
        brand: {
          50: '#eef4ff',
          100: '#e0ebff',
          200: '#c7dcff',
          300: '#9cc7ff',
          500: '#3b4bff',
          600: '#1a1aff',
          700: '#1212cc',
          900: '#0b0b80',
          DEFAULT: '#1a1aff',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Space Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      keyframes: {
        marquee: { '0%': { transform: 'translateX(0)' }, '100%': { transform: 'translateX(-50%)' } },
        bar: {
          '0%, 100%': { transform: 'scaleY(1)', opacity: '0.55' },
          '50%': { transform: 'scaleY(0.55)', opacity: '1' },
        },
        fadeUp: { '0%': { opacity: '0', transform: 'translateY(18px)' }, '100%': { opacity: '1', transform: 'none' } },
        lineIn: { '0%': { opacity: '0', transform: 'translateX(-8px)' }, '100%': { opacity: '1', transform: 'none' } },
        float: { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-8px)' } },
        indeterminate: { '0%': { transform: 'translateX(-100%)' }, '100%': { transform: 'translateX(350%)' } },
        pop: { '0%': { transform: 'scale(0.8)', opacity: '0' }, '100%': { transform: 'scale(1)', opacity: '1' } },
      },
      animation: {
        marquee: 'marquee 40s linear infinite',
        bar: 'bar 3.2s ease-in-out infinite',
        'fade-up': 'fadeUp 0.7s cubic-bezier(0.2, 0.7, 0.2, 1) both',
        'line-in': 'lineIn 0.35s ease-out both',
        float: 'float 5s ease-in-out infinite',
        indeterminate: 'indeterminate 1.4s ease-in-out infinite',
        pop: 'pop 0.3s ease-out both',
      },
    },
  },
  plugins: [],
};
