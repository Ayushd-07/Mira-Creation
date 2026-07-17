---
name: Mira Creation Global System
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#434655'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#737686'
  outline-variant: '#c3c6d7'
  surface-tint: '#0053db'
  primary: '#004ac6'
  on-primary: '#ffffff'
  primary-container: '#2563eb'
  on-primary-container: '#eeefff'
  inverse-primary: '#b4c5ff'
  secondary: '#545f73'
  on-secondary: '#ffffff'
  secondary-container: '#d5e0f8'
  on-secondary-container: '#586377'
  tertiary: '#943700'
  on-tertiary: '#ffffff'
  tertiary-container: '#bc4800'
  on-tertiary-container: '#ffede6'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174b'
  on-primary-fixed-variant: '#003ea8'
  secondary-fixed: '#d8e3fb'
  secondary-fixed-dim: '#bcc7de'
  on-secondary-fixed: '#111c2d'
  on-secondary-fixed-variant: '#3c475a'
  tertiary-fixed: '#ffdbcd'
  tertiary-fixed-dim: '#ffb596'
  on-tertiary-fixed: '#360f00'
  on-tertiary-fixed-variant: '#7d2d00'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  headline-md:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.01em
  code:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  container-max: 1440px
  sidebar-width: 260px
  sidebar-collapsed: 72px
  gutter: 24px
  section-gap: 40px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 24px
---

## Brand & Style
The design system for Mira Creation is rooted in **Precision Minimalism**. It balances the industrial rigor of garment manufacturing with the sophisticated polish of high-end enterprise software. The aesthetic is clean, structured, and intentional, drawing inspiration from industry leaders like Stripe and Linear.

The target audience consists of operations managers, factory supervisors, and executive stakeholders who require high data density without cognitive overload. The UI evokes a sense of **authority, reliability, and calm**, utilizing expansive whitespace and a meticulous typographic hierarchy to guide the user through complex manufacturing workflows.

## Colors
The palette is built on a foundation of "Slate" neutrals to provide a cool, professional atmosphere. 

- **Primary Blue (#2563EB):** Used sparingly for primary actions, progress indicators, and active states to maintain focus.
- **Surface Logic:** In Light Mode, surfaces use pure white against a Slate-50 background to create subtle depth. In Dark Mode, a three-tier elevation is used: Sidebar (#111827) is the deepest, followed by Background (#0F172A), with Cards (#1E293B) sitting on top.
- **Semantic Colors:** Success, Warning, and Danger colors are calibrated for high legibility against both light and dark surfaces, primarily used in status badges and destructive actions.

## Typography
This design system exclusively utilizes **Inter** to achieve a systematic, utilitarian look that remains highly legible at small sizes. 

- **Scale:** A tight typographic scale ensures that data-heavy tables and dashboards remain scannable.
- **Hierarchy:** We use Font Weight (600 for headings, 500 for UI labels) rather than drastic size changes to differentiate information.
- **Letter Spacing:** Negative tracking is applied to larger headlines (-0.01em to -0.02em) to maintain a premium, "tight" editorial feel.

## Layout & Spacing
The layout follows a **Hybrid Grid** approach. Content is housed within a fixed-width container (1440px) on large screens, centered to prevent line-length issues, while the sidebar remains fixed to the viewport.

- **Sidebar:** A collapsible navigation system (260px expanded / 72px collapsed).
- **Whitespace:** Large, intentional padding (40px+) between major sections to reduce the "industrial" feel and emphasize a premium SaaS experience.
- **Responsiveness:** On mobile, horizontal margins shrink to 16px, and sidebars transform into bottom-sheet navigation or full-screen overlays.

## Elevation & Depth
Depth is conveyed through **Tonal Layering** and **Low-Contrast Outlines** rather than heavy shadows.

- **Level 0 (Base):** Background colors (#F8FAFC / #0F172A).
- **Level 1 (Cards):** White or Navy surfaces with a 1px solid border (#E5E7EB / #334155).
- **Level 2 (Popovers/Modals):** Subtle ambient shadows are introduced here (0px 10px 15px -3px rgba(0,0,0,0.1)) to lift the element off the page.
- **Interaction:** On hover, cards may feature a slight border-color shift or a very soft shadow to indicate interactivity.

## Shapes
The shape language is characterized by a "Large Soft" radius.

- **Standard Radius:** 14px (0.875rem) is applied to all primary UI containers, including cards, input fields, and buttons. 
- **Small Elements:** For inner elements like chips or small buttons, a 6px or 8px radius is used to maintain visual nested harmony (the inner radius should be smaller than the outer radius).

## Components

### Buttons & Inputs
- **Primary Button:** 14px border radius, Primary Blue background, white text. High-contrast, bold, and tall (min-height: 44px).
- **Floating Label Inputs:** Large input fields (48px height) where the label transitions from a placeholder to a small top-aligned label (10px) on focus or fill. 
- **Mode Switch:** A sleek, pill-shaped toggle found in the bottom of the sidebar or top-right profile menu.

### Navigation
- **Collapsible Sidebar:** Uses 14px rounded hover states for menu items. Active states use a subtle background tint and a 2px vertical primary-color bar on the left.
- **Top Navigation:** Transparent or slightly frosted backdrop blur, providing breadcrumbs and global search.

### Tables & Lists
- **Professional Tables:** Sticky headers with a subtle bottom border. Row hover states use a very faint gray or navy tint. Data cells use `body-md` for maximum density without sacrificing clarity.
- **Status Chips:** Fully rounded (pill) with low-opacity background tints of the semantic colors (Success/Warning/Danger).

### Micro-interactions
- **Transitions:** Use `cubic-bezier(0.4, 0, 0.2, 1)` for all transforms. 
- **Loading:** Subtle shimmer (skeleton) loaders for cards and table rows during data fetching.