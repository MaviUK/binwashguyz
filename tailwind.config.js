// tailwind.config.js
module.exports = {
  content: ["./index.html","./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bg:      "#000000",
        ink:     "#FBEBC3",
        primary: "#082130",
        secondary:"#264E28",
        accent:  "#D58B3B",
        muted:   "#58502B",
      }
    }
  },
  plugins: [],
}
