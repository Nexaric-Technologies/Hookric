/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    container: {
      center: true,
      padding: '1rem',
      screens: { '2xl': '1400px' },
    },
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['"Satoshi Variable"', '"Satoshi"', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      colors: {
        border: 'hsl(var(--border) / <alpha-value>)',
        input: 'hsl(var(--input) / <alpha-value>)',
        ring: 'hsl(var(--ring) / <alpha-value>)',
        background: 'hsl(var(--background) / <alpha-value>)',
        foreground: 'hsl(var(--foreground) / <alpha-value>)',
        primary: {
          DEFAULT: 'hsl(var(--primary) / <alpha-value>)',
          foreground: 'hsl(var(--primary-foreground) / <alpha-value>)',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary) / <alpha-value>)',
          foreground: 'hsl(var(--secondary-foreground) / <alpha-value>)',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive) / <alpha-value>)',
          foreground: 'hsl(var(--destructive-foreground) / <alpha-value>)',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted) / <alpha-value>)',
          foreground: 'hsl(var(--muted-foreground) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent) / <alpha-value>)',
          foreground: 'hsl(var(--accent-foreground) / <alpha-value>)',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover) / <alpha-value>)',
          foreground: 'hsl(var(--popover-foreground) / <alpha-value>)',
        },
        card: {
          DEFAULT: 'hsl(var(--card) / <alpha-value>)',
          foreground: 'hsl(var(--card-foreground) / <alpha-value>)',
        },
        // Semantic method badges (slightly desaturated for premium feel)
        method: {
          get: 'hsl(var(--method-get) / <alpha-value>)',
          post: 'hsl(var(--method-post) / <alpha-value>)',
          put: 'hsl(var(--method-put) / <alpha-value>)',
          patch: 'hsl(var(--method-patch) / <alpha-value>)',
          delete: 'hsl(var(--method-delete) / <alpha-value>)',
          other: 'hsl(var(--method-other) / <alpha-value>)',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      boxShadow: {
        'soft': '0 1px 2px 0 rgb(0 0 0 / 0.04), 0 1px 3px 0 rgb(0 0 0 / 0.05)',
        'pop': '0 8px 24px -8px rgb(0 0 0 / 0.15), 0 2px 6px -2px rgb(0 0 0 / 0.06)',
        'glow': '0 0 0 1px hsl(var(--primary) / 0.25), 0 8px 24px -8px hsl(var(--primary) / 0.4)',
      },
      keyframes: {
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in-fast': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        // Awwwards-tier: gentle, heavy fade-up with a brief blur
        // for elements entering the viewport. GPU-safe — only
        // animates `transform` and `opacity`. Use via the
        // `.anim-rise` utility (see index.css).
        'rise': {
          '0%':   { opacity: '0', transform: 'translate3d(0, 16px, 0)', filter: 'blur(6px)' },
          '100%': { opacity: '1', transform: 'translate3d(0, 0, 0)',    filter: 'blur(0)'   },
        },
        // Soft shimmer for the "analyzing" placeholder state
        'shimmer': {
          '0%':   { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'pulse-soft': 'pulse-soft 1.6s ease-in-out infinite',
        'fade-in': 'fade-in 200ms cubic-bezier(0.32, 0.72, 0, 1)',
        'fade-in-fast': 'fade-in-fast 150ms cubic-bezier(0.32, 0.72, 0, 1)',
        'scale-in': 'scale-in 180ms cubic-bezier(0.32, 0.72, 0, 1)',
        'rise': 'rise 700ms cubic-bezier(0.32, 0.72, 0, 1) both',
        'shimmer': 'shimmer 2.4s cubic-bezier(0.4, 0, 0.2, 1) infinite',
      },
      // Custom spring easing curves for the agency build.
      // Use as `ease-spring` etc. on any transition.
      transitionTimingFunction: {
        'spring':   'cubic-bezier(0.32, 0.72, 0, 1)',     // Apple/Linear signature
        'spring-2': 'cubic-bezier(0.16, 1, 0.3, 1)',       // expo-out for entrances
        'magnetic': 'cubic-bezier(0.4, 0, 0.2, 1)',        // material-style for hovers
      },
      borderRadius: {
        // Exaggerated squircles for the Double-Bezel technique.
        // - `bezel-outer`: the outer shell radius (e.g. 2rem = 32px)
        // - `bezel-inner`: the inner core radius (shell - padding)
        'bezel-outer': '1.75rem',  // 28px outer shell
        'bezel-inner': 'calc(1.75rem - 0.375rem)', // 22px inner core
        'island':      '9999px',   // fully rounded pills / islands
      },
    },
  },
  plugins: [],
};
