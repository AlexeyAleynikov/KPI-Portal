/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#EFF6FF",
          100: "#DBEAFE",
          500: "#2E5C8A",
          600: "#1F3864",
          700: "#1E40AF",
        },
      },
    },
  },
  plugins: [],
};
