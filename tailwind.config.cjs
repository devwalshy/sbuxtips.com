/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#082f37',
        surface: '#052127',
        primary: '#3fdd78',
        secondary: '#41c5f5',
        accent: '#ff8cc6',
        muted: '#0d3f49',
        outline: '#1a5963',
        text: '#e6f7f8',
        'text-muted': '#9bd0d6'
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        elevation: '0 20px 40px rgba(0, 0, 0, 0.35)'
      }
    }
  },
  plugins: []
};
