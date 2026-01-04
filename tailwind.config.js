/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "src/**/*.html",
        './src/assets/css/**/*.{css,scss}',
        "./node_modules/flowbite/**/*.js",
        "./node_modules/flowbite-datepicker/**/*.js"
    ],
    theme: {
        extend: {
            fontFamily: {
                poiret: ["Poiret One", "sans-serif"],
                limelight: ["Limelight", "sans-serif"],
            },
            colors: {
                'accent-pink': '#fbf7f7',
                'accent-secondary': '#967e7e',
            },
            backgroundImage: {
                'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
                'bezier-cubic': 'linear-gradient(to bottom, black, cubic-bezier(0.48, 0.3, 0.64, 1), transparent)',
            }
        },
    },
    plugins: [
        require('flowbite/plugin')
    ],
}
