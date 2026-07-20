/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        mango: {
          50: '#fff8ed',
          100: '#ffefd1',
          400: '#ff9d2e',
          500: '#ff7f0d',
          600: '#f06103',
          700: '#c74805',
        },
      },
    },
  },
  plugins: [],
}
