---
name: All-Barun Social Enterprise System
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#43474a'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#73787b'
  outline-variant: '#c3c7ca'
  surface-tint: '#506169'
  primary: '#000508'
  on-primary: '#ffffff'
  primary-container: '#0f2027'
  on-primary-container: '#778891'
  inverse-primary: '#b7c9d3'
  secondary: '#006a62'
  on-secondary: '#ffffff'
  secondary-container: '#83f2e5'
  on-secondary-container: '#006f67'
  tertiary: '#000404'
  on-tertiary: '#ffffff'
  tertiary-container: '#002220'
  on-tertiary-container: '#009590'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d3e5ef'
  primary-fixed-dim: '#b7c9d3'
  on-primary-fixed: '#0d1e25'
  on-primary-fixed-variant: '#384951'
  secondary-fixed: '#86f5e8'
  secondary-fixed-dim: '#68d8cc'
  on-secondary-fixed: '#00201d'
  on-secondary-fixed-variant: '#00504a'
  tertiary-fixed: '#84f5ee'
  tertiary-fixed-dim: '#66d8d2'
  on-tertiary-fixed: '#00201e'
  on-tertiary-fixed-variant: '#00504d'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  display:
    fontFamily: notoSans
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.2'
  h1:
    fontFamily: notoSans
    fontSize: 36px
    fontWeight: '700'
    lineHeight: '1.3'
  h2:
    fontFamily: notoSans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: '1.4'
  body-lg:
    fontFamily: notoSans
    fontSize: 20px
    fontWeight: '400'
    lineHeight: '1.6'
  body-base:
    fontFamily: notoSans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  ui-button:
    fontFamily: notoSans
    fontSize: 16px
    fontWeight: '500'
    lineHeight: '1.0'
  label-sm:
    fontFamily: notoSans
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1.4'
  display-mobile:
    fontFamily: notoSans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
  h1-mobile:
    fontFamily: notoSans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: '1.3'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 48px
  stack-sm: 12px
  stack-md: 24px
  stack-lg: 40px
---

## Brand & Style

The design system is anchored in the concept of "Righteous Stewardship." As a B2B social enterprise specializing in facility management, the visual language must balance high-tier professional authority with a palpable commitment to sustainability and social good. 

The style is **Corporate / Modern** with a focus on high-readability and premium execution. It utilizes expansive whitespace to reflect the hygiene and order inherent in facility management, while employing a sophisticated "Clean Green" accent to signify vitality and environmental responsibility. The emotional response should be one of absolute reliability, transparency, and modern efficiency.

## Colors

The palette is designed to project stability and cleanliness:

- **Primary (Deep Navy):** Used for core branding, primary navigation, and heavy headings to establish authority and security.
- **Secondary (Emerald Clean Green):** Used for primary actions, success states, and indicators of sustainability or hygiene.
- **Tertiary (Teal):** A supportive hue for data visualization and secondary interactive elements.
- **Background (Crisp Gray/White):** The interface relies on #F8FAFC for sectional backing and pure #FFFFFF for cards and content containers to maintain a sterile, professional environment.

## Typography

This design system prioritizes accessibility through a "Large-Scale" typographic approach, increasing standard sizes by roughly 15% to ensure ease of use for facility managers and diverse stakeholders. 

We use **Noto Sans KR** exclusively to provide a clean, humanist feel that supports both Korean and Latin characters with equal poise. Headings are strictly Bold (700) to provide a firm structure, while body text uses Regular (400) with generous line heights (1.6) to reduce visual fatigue during data-heavy management tasks.

## Layout & Spacing

The layout follows a **Fixed Grid** philosophy for dashboard views to maintain a sense of structured control, transitioning to a fluid model for content-heavy pages. 

- **Desktop:** 12-column grid with 24px gutters. Content is centered with a max-width of 1280px.
- **Tablet:** 8-column grid with 20px gutters.
- **Mobile:** 4-column grid with 16px margins.

Spacing follows an 8px geometric scale. Vertical rhythm is critical; use `stack-lg` (40px) between major sections to preserve the "premium whitespace" narrative.

## Elevation & Depth

Depth is achieved through **Tonal Layers** supplemented by **Ambient Shadows**. This design system avoids heavy shadows in favor of subtle, diffused lifts that make elements appear integrated rather than floating.

- **Level 0 (Base):** #F8FAFC background.
- **Level 1 (Cards):** Pure white background with a 1px border (#E2E8F0) or a very soft shadow (0px 4px 12px rgba(15, 32, 39, 0.05)).
- **Level 2 (Popovers/Modals):** High-diffusion shadow (0px 12px 32px rgba(15, 32, 39, 0.12)) to provide clear focal separation.

Interactive elements use a slight vertical lift on hover to provide tactile feedback without breaking the minimalist aesthetic.

## Shapes

The shape language is defined as **Rounded (Level 2)**. Standard components utilize a 0.5rem (8px) radius. Larger containers, such as main content cards or hero sections, utilize `rounded-lg` (16px) to soften the professional tone and make the enterprise software feel more approachable and modern. 

Buttons and input fields must maintain consistent 8px corners to ensure a "tool-like" precision. Pill shapes (3) are reserved exclusively for status chips (e.g., "Completed", "Active").

## Components

### Buttons
- **Primary:** Deep Navy background with white text. High-contrast, authoritative.
- **Success/Action:** Emerald Green background. Used for "Submit," "Approve," or "Start Task."
- **Ghost:** Transparent background with 1px Navy or Green border. Used for secondary actions.

### Input Fields
- **Style:** 1px solid border (#CBD5E1) with 8px corner radius. 
- **Focus State:** 2px solid Emerald Green border with a soft green outer glow.
- **Labels:** Always positioned above the field in `label-sm` Bold Navy.

### Chips & Tags
- **Status Tags:** Pill-shaped with low-opacity background tints of the status color (e.g., Light Green background for "Cleaned" with Dark Green text).

### Cards
- **Container:** White background, 16px corner radius, subtle Level 1 shadow. 
- **Header:** 1px light gray bottom border to separate card titles from content.

### Lists
- **Service Items:** High-row height (min 64px) with subtle hover states (#F1F5F9). Use Emerald Green icons for checklist items to reinforce the "clean" brand promise.
