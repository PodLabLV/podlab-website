import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // DARK Newspaper palette
        background: "#0a0a0a", // deep black
        "bg-secondary": "#141414", // charcoal
        "bg-tertiary": "#1a1a1a", // dark gray
        
        // Text colors (white ink on dark paper)
        text: {
          primary: "#fafafa", // bright white
          secondary: "#a0a0a0", // medium gray
          tertiary: "#6b6b6b", // darker gray
        },
        
        // Accent (neon green for CTAs)
        accent: "#39FF14",
        "accent-hover": "#2ee00f",
        
        // Borders (subtle lines)
        border: "#2a2a2a",
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Inter Tight', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      transitionDuration: {
        '350': '350ms',
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards',
        'neon-pulse': 'neon-pulse 3s ease-in-out infinite',
        'gradient': 'gradient 4s ease-in-out infinite',
      },
      keyframes: {
        'gradient': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'neon-pulse': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(57, 255, 20, 0.4)' },
          '50%': { boxShadow: '0 0 40px rgba(57, 255, 20, 0.8)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
