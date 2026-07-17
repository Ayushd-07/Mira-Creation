/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Light mode colors (existing)
        'inverse-primary': '#b4c5ff',
        'on-error-container': '#93000a',
        'background': '#f8f9ff',
        'inverse-surface': '#213145',
        'surface-container-low': '#eff4ff',
        'outline-variant': '#c3c6d7',
        'on-primary-container': '#eeefff',
        'on-secondary': '#ffffff',
        'surface-container-lowest': '#ffffff',
        'on-primary-fixed-variant': '#003ea8',
        'primary-fixed-dim': '#b4c5ff',
        'error': '#ba1a1a',
        'on-primary-fixed': '#00174b',
        'on-error': '#ffffff',
        'primary': '#004ac6',
        'surface-container-highest': '#d3e4fe',
        'secondary-fixed': '#d8e3fb',
        'surface': '#f8f9ff',
        'secondary-container': '#d5e0f8',
        'primary-fixed': '#dbe1ff',
        'on-tertiary-container': '#ffede6',
        'primary-container': '#2563eb',
        'secondary': '#545f73',
        'on-secondary-fixed': '#111c2d',
        'tertiary-fixed': '#ffdbcd',
        'on-primary': '#ffffff',
        'on-surface-variant': '#434655',
        'error-container': '#ffdad6',
        'surface-variant': '#d3e4fe',
        'surface-bright': '#f8f9ff',
        'on-tertiary': '#ffffff',
        'on-secondary-fixed-variant': '#3c475a',
        'on-secondary-container': '#586377',
        'tertiary': '#943700',
        'surface-container-high': '#dce9ff',
        'tertiary-container': '#bc4800',
        'on-background': '#0b1c30',
        'surface-container': '#e5eeff',
        'outline': '#737686',
        'surface-dim': '#cbdbf5',
        'inverse-on-surface': '#eaf1ff',
        'on-tertiary-fixed': '#360f00',
        'surface-tint': '#053da6',
        'on-surface': '#0b1c30',
        'secondary-fixed-dim': '#bcc7de',
        'on-tertiary-fixed-variant': '#7d2d00',
        'tertiary-fixed-dim': '#ffb596',
        
        // Professional Dark Theme Colors (inspired by Linear, GitHub, Vercel)
        'dark-bg': '#0B1120',           // Main App Background
        'dark-sidebar': '#0F172A',    // Sidebar
        'dark-topbar': '#0D172A',     // Top Navigation
        'dark-card': '#151F32',       // Primary Surface / Cards
        'dark-secondary': '#1B2940',  // Secondary Surface
        'dark-elevated': '#1E293B',  // Elevated Surface / Modal
        'dark-input': '#111C2E',      // Input Background
        'dark-hover': '#22314A',      // Hover Background
        'dark-border': '#293750',     // Primary Border
        'dark-subtle-border': '#1E2B40', // Subtle Border
        'dark-text': '#F8FAFC',       // Primary Text
        'dark-text-secondary': '#E2E8F0', // Normal Text
        'dark-text-muted': '#94A3B8', // Secondary Text
        'dark-text-disabled': '#64748B', // Muted Text
        'dark-primary': '#2563EB',    // Primary Blue
        'dark-primary-bright': '#3B82F6', // Bright Blue
        'dark-success': '#22C55E',    // Success
        'dark-warning': '#F59E0B',    // Warning
        'dark-danger': '#EF4444',     // Danger
      },
      borderRadius: {
        DEFAULT: '0.25rem',
        lg: '0.5rem',
        xl: '0.75rem',
        '2xl': '1rem',
        full: '9999px',
      },
      spacing: {
        'stack-sm': '8px',
        'container-max': '1440px',
        'stack-md': '16px',
        'sidebar-width': '260px',
        'gutter': '24px',
        'sidebar-collapsed': '72px',
        'section-gap': '40px',
        'stack-lg': '24px',
      },
      fontFamily: {
        'headline-lg': ['Inter'],
        'display': ['Inter'],
        'headline-md': ['Inter'],
        'body-md': ['Inter'],
        'body-lg': ['Inter'],
        'code': ['Inter'],
        'label-md': ['Inter'],
      },
      fontSize: {
        'headline-lg': ['24px', { lineHeight: '32px', letterSpacing: '-0.01em', fontWeight: '600' }],
        'display': ['36px', { lineHeight: '44px', letterSpacing: '-0.02em', fontWeight: '700' }],
        'headline-md': ['18px', { lineHeight: '26px', fontWeight: '600' }],
        'body-md': ['14px', { lineHeight: '20px', fontWeight: '400' }],
        'body-lg': ['16px', { lineHeight: '24px', fontWeight: '400' }],
        'code': ['13px', { lineHeight: '18px', fontWeight: '400' }],
        'label-md': ['12px', { lineHeight: '16px', letterSpacing: '0.01em', fontWeight: '500' }],
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in-scale': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'slide-in-right': {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'slide-out-right': {
          '0%': { transform: 'translateX(0)', opacity: '1' },
          '100%': { transform: 'translateX(100%)', opacity: '0' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        'fade-in-scale': 'fade-in-scale 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        'slide-up': 'slide-up 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        'shimmer': 'shimmer 2s linear infinite',
        'slide-in-right': 'slide-in-right 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        'slide-out-right': 'slide-out-right 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}