import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./context/**/*.{js,ts,jsx,tsx,mdx}",
    "./hooks/**/*.{js,ts,jsx,tsx,mdx}",
    "./node_modules/preline/preline.js",
  ],
  safelist: [
    { pattern: /^leaflet-/ },
    // Preline state variant classes
    { pattern: /^hs-/ },
  ],
  theme: {
    extend: {
      colors: {
        // ── Primary brand ──────────────────────────────────────────────────
        primary: {
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          800: "#1e40af",
          900: "#1e3a8a",
          DEFAULT: "var(--primary)",
          hover: "var(--primary-hover)",
          focus: "var(--primary-focus)",
          checked: "var(--primary-checked)",
          foreground: "var(--primary-foreground)",
          line: "var(--primary-line)",
        },

        // ── Page backgrounds ───────────────────────────────────────────────
        background: {
          DEFAULT: "var(--background)",
          1: "var(--background-1)",
        },
        plain: "var(--plain)",

        // ── Card ───────────────────────────────────────────────────────────
        card: {
          DEFAULT: "var(--card)",
          line: "var(--card-line)",
          footer: "var(--card-footer)",
        },

        // ── Layer (buttons, form controls) ─────────────────────────────────
        layer: {
          DEFAULT: "var(--layer)",
          hover: "var(--layer-hover)",
          focus: "var(--layer-focus)",
          line: "var(--layer-line)",
          foreground: "var(--layer-foreground)",
        },

        // ── Surface (elevated) ─────────────────────────────────────────────
        surface: {
          DEFAULT: "var(--surface)",
          hover: "var(--surface-hover)",
          focus: "var(--surface-focus)",
          foreground: "var(--surface-foreground)",
        },

        // ── Text / Foreground ──────────────────────────────────────────────
        foreground: {
          DEFAULT: "var(--foreground)",
          inverse: "var(--foreground-inverse)",
        },
        "muted-foreground": {
          DEFAULT: "var(--muted-foreground)",
          1: "var(--muted-foreground-1)",
          2: "var(--muted-foreground-2)",
        },

        // ── Muted states ───────────────────────────────────────────────────
        muted: {
          hover: "var(--muted-hover)",
          focus: "var(--muted-focus)",
          foreground: "var(--muted-foreground)",
        },

        // ── Navbar ─────────────────────────────────────────────────────────
        navbar: {
          DEFAULT: "var(--navbar)",
          line: "var(--navbar-line)",
          divider: "var(--navbar-divider)",
          inverse: "var(--navbar-inverse)",
          nav: {
            active: "var(--navbar-nav-active)",
            hover: "var(--navbar-nav-hover)",
            focus: "var(--navbar-nav-focus)",
            foreground: "var(--navbar-nav-foreground)",
          },
        },

        // ── Sidebar ────────────────────────────────────────────────────────
        sidebar: {
          DEFAULT: "var(--sidebar)",
          line: "var(--sidebar-line)",
          divider: "var(--sidebar-divider)",
          nav: {
            active: "var(--sidebar-nav-active)",
            hover: "var(--sidebar-nav-hover)",
            focus: "var(--sidebar-nav-focus)",
            foreground: "var(--sidebar-nav-foreground)",
            list: {
              divider: "var(--sidebar-nav-list-divider)",
            },
          },
        },

        // ── Dropdown ───────────────────────────────────────────────────────
        dropdown: {
          DEFAULT: "var(--dropdown)",
          line: "var(--dropdown-line)",
          divider: "var(--dropdown-divider)",
          item: {
            hover: "var(--dropdown-item-hover)",
            focus: "var(--dropdown-item-focus)",
            active: "var(--dropdown-item-active)",
            foreground: "var(--dropdown-item-foreground)",
          },
        },

        // ── Select ─────────────────────────────────────────────────────────
        select: {
          DEFAULT: "var(--select)",
          1: "var(--select-1)",
          line: "var(--select-line)",
          item: {
            hover: "var(--select-item-hover)",
            focus: "var(--select-item-focus)",
            active: "var(--select-item-active)",
            foreground: "var(--select-item-foreground)",
          },
        },

        // ── Tooltip ────────────────────────────────────────────────────────
        tooltip: {
          DEFAULT: "var(--tooltip)",
          line: "var(--tooltip-line)",
          foreground: "var(--tooltip-foreground)",
        },

        // ── Overlay ────────────────────────────────────────────────────────
        overlay: {
          DEFAULT: "var(--overlay)",
          line: "var(--overlay-line)",
          divider: "var(--overlay-divider)",
        },

        // ── Scrollbar ──────────────────────────────────────────────────────
        scrollbar: {
          track: "var(--scrollbar-track)",
          thumb: "var(--scrollbar-thumb)",
        },

        // ── Secondary ──────────────────────────────────────────────────────
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },

        // ── Misc ───────────────────────────────────────────────────────────
        destructive: "var(--destructive)",
        switch: "var(--switch)",
        chart: {
          primary: "var(--chart-primary)",
        },
      },

      fontFamily: {
        sans: ["var(--font-geist-sans)", "ui-sans-serif", "system-ui", "-apple-system", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
        serif: ["Domine", "Georgia", "serif"],
      },

      boxShadow: {
        // Preline Pro shadow scale
        "2xs": "0 1px 2px 0 rgba(0, 0, 0, 0.04)",
        "xs": "0 1px 3px 0 rgba(0, 0, 0, 0.06), 0 1px 2px -1px rgba(0, 0, 0, 0.04)",
        // Legacy aliases kept for components not yet migrated
        card: "0 1px 3px 0 rgba(0,0,0,0.08), 0 1px 2px -1px rgba(0,0,0,0.06)",
        "card-hover": "0 4px 6px -1px rgba(0,0,0,0.08), 0 2px 4px -2px rgba(0,0,0,0.06)",
        navbar: "0 1px 3px 0 rgba(0,0,0,0.05)",
      },
    },
  },
  plugins: [],
};
export default config;
