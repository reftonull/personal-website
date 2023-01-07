/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  theme: {
    extend: {
      fontFamily: {
        superior: ["superior-title", "serif"],
        ellograph: ["ellograph-cf", "monospace"],
      },
      animation: {
        blob: "blob 25s infinite ease-in-out",
      },
      keyframes: {
        blob: {
          "0%": {
            transform: "translate(0px, 0px)",
          },
          "33%": {
            transform: "translate(35vw, 0px)",
          },
          "66%": {
            transform: "translate(0px, 35vw)",
          },
        },
      },
    },
  },
  plugins: [],
};
