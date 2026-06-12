/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#1e3a5f",
        secondary: "#f97316",
      },
    },
  },
  plugins: [require("@tailwindcss/forms")],
};
