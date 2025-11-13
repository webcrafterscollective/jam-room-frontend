/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    // Make sure these lines are here, especially the 'app' one
    './pages/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
    './app/**/*.{js,jsx}', 
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}