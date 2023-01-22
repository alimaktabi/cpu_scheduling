/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "components/**/*.{tsx,ts,jsx,html}",
    "pages/**/*.{tsx,ts,jsx,html}",
    "./node_modules/flowbite-react/**/*.js",
  ],
  theme: {
    extend: {},
  },
  plugins: [require("flowbite/plugin")],
}
