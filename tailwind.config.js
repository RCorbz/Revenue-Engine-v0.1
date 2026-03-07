/** @type {import('tailwindcss').Config} */
export default {
    content: ['./src/**/*.{html,js,svelte,ts}'],
    theme: {
        extend: {
            height: {
                'screen-safe': ['100vh', '100dvh'], // Essential for OBT-6 mobile latency
            },
            colors: {
                revenue: '#00c853',    // OBT-22: "Success" Green
                retention: '#2979ff',  // "Trust" Blue
                reputation: '#ff9100', // "Action" Orange
            }
        },
    },
    plugins: [],
}