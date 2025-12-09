/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "src/**/*.html",
        "./node_modules/flowbite/**/*.js"
    ],
    theme: {
        extend: {
            fontFamily: {
                poiret: ["Poiret One", "sans-serif"],
                limelight: ["Limelight", "sans-serif"],
            },
            colors: {
                'ar-gold': '#a2911d',
                'ar-gray': '#292626',
                'ar-white': '#f4f4f4',
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
