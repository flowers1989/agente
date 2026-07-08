import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
    darkMode: "class",
    content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
  		extend: {
  			colors: {
  				background: 'hsl(var(--background))',
  				foreground: 'hsl(var(--foreground))',
  				card: {
  					DEFAULT: 'hsl(var(--card))',
  					foreground: 'hsl(var(--card-foreground))'
  				},
  				popover: {
  					DEFAULT: 'hsl(var(--popover))',
  					foreground: 'hsl(var(--popover-foreground))'
  				},
  				primary: {
  					DEFAULT: 'hsl(var(--primary))',
  					foreground: 'hsl(var(--primary-foreground))'
  				},
  				secondary: {
  					DEFAULT: 'hsl(var(--secondary))',
  					foreground: 'hsl(var(--secondary-foreground))'
  				},
  				muted: {
  					DEFAULT: 'hsl(var(--muted))',
  					foreground: 'hsl(var(--muted-foreground))'
  				},
  				accent: {
  					DEFAULT: 'hsl(var(--accent))',
  					foreground: 'hsl(var(--accent-foreground))'
  				},
  				destructive: {
  					DEFAULT: 'hsl(var(--destructive))',
  					foreground: 'hsl(var(--destructive-foreground))'
  				},
  				border: 'hsl(var(--border))',
  				input: 'hsl(var(--input))',
  				ring: 'hsl(var(--ring))',
  				chart: {
  					'1': 'hsl(var(--chart-1))',
  					'2': 'hsl(var(--chart-2))',
  					'3': 'hsl(var(--chart-3))',
  					'4': 'hsl(var(--chart-4))',
  					'5': 'hsl(var(--chart-5))'
  				},
  				/* Colores de Manus IA */
  				manus: {
  					primary: 'rgb(139 92 246 / <alpha-value>)',
  					secondary: 'rgb(59 130 246 / <alpha-value>)',
  					accent: 'rgb(6 182 212 / <alpha-value>)',
  					success: 'rgb(34 197 94 / <alpha-value>)',
  					warning: 'rgb(234 179 8 / <alpha-value>)',
  				}
  			},
  			backgroundImage: {
  				'gradient-manus': 'linear-gradient(135deg, rgb(139 92 246), rgb(59 130 246))',
  				'gradient-manus-subtle': 'linear-gradient(135deg, rgb(139 92 246 / 0.1), rgb(59 130 246 / 0.1))',
  				'gradient-manus-to-right': 'linear-gradient(90deg, rgb(139 92 246), rgb(59 130 246))',
  				'gradient-manus-to-bottom': 'linear-gradient(180deg, rgb(139 92 246), rgb(59 130 246))',
  			},
  			boxShadow: {
  				'manus': '0 10px 30px rgba(139, 92, 246, 0.15)',
  				'manus-lg': '0 20px 40px rgba(139, 92, 246, 0.2)',
  				'manus-xl': '0 30px 60px rgba(139, 92, 246, 0.25)',
  				'glow-violet': '0 0 20px rgba(139, 92, 246, 0.3)',
  				'glow-blue': '0 0 20px rgba(59, 130, 246, 0.3)',
  				'glow-cyan': '0 0 20px rgba(6, 182, 212, 0.3)',
  			},
  			animation: {
  				'slide-in-up': 'slide-in-up 0.3s ease-out',
  				'slide-in-left': 'slide-in-left 0.3s ease-out',
  				'slide-in-right': 'slide-in-right 0.3s ease-out',
  				'fade-in': 'fade-in 0.3s ease-out',
  				'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
  				'gradient-shift': 'gradient-shift 3s ease infinite',
  				'bounce-in': 'bounce-in 0.4s ease-out',
  				'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
  			},
  			keyframes: {
  				'slide-in-up': {
  					'0%': { opacity: '0', transform: 'translateY(10px)' },
  					'100%': { opacity: '1', transform: 'translateY(0)' },
  				},
  				'slide-in-left': {
  					'0%': { opacity: '0', transform: 'translateX(-10px)' },
  					'100%': { opacity: '1', transform: 'translateX(0)' },
  				},
  				'slide-in-right': {
  					'0%': { opacity: '0', transform: 'translateX(10px)' },
  					'100%': { opacity: '1', transform: 'translateX(0)' },
  				},
  				'fade-in': {
  					'0%': { opacity: '0' },
  					'100%': { opacity: '1' },
  				},
  				'pulse-glow': {
  					'0%, 100%': { opacity: '1' },
  					'50%': { opacity: '0.5' },
  				},
  				'gradient-shift': {
  					'0%': { backgroundPosition: '0% 50%' },
  					'50%': { backgroundPosition: '100% 50%' },
  					'100%': { backgroundPosition: '0% 50%' },
  				},
  				'bounce-in': {
  					'0%': { opacity: '0', transform: 'scale(0.95) translateY(10px)' },
  					'50%': { opacity: '1' },
  					'100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
  				},
  				'glow-pulse': {
  					'0%, 100%': { boxShadow: '0 0 10px rgba(139, 92, 246, 0.3)' },
  					'50%': { boxShadow: '0 0 20px rgba(139, 92, 246, 0.6)' },
  				},
  			},
  			borderRadius: {
  				lg: 'var(--radius)',
  				md: 'calc(var(--radius) - 2px)',
  				sm: 'calc(var(--radius) - 4px)'
  			}
  		}
  },
  plugins: [tailwindcssAnimate],
};
export default config;
