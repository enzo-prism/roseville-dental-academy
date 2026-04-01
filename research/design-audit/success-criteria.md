# Roseville Design QA Success Criteria

## Audited Routes
- `/`
- `/registration`
- `/dental-assisting-program`
- `/front-office-program`
- `/faqs-1`
- `/photos`
- `/m/login`

## Audited Devices
- Mobile: `390x844`
- Tablet: `768x1024`
- Desktop: `1280x900`
- Wide desktop audit script only: `1440x900`

## Pass Criteria
- No horizontal overflow on any audited route at any audited breakpoint.
- No clipped or off-screen critical interactive elements:
  - links
  - buttons
  - inputs
  - textareas
  - combobox triggers
  - forms
- Sticky header remains visually compact and does not cover the hero heading:
  - mobile sticky shell height `<= 136px`
  - tablet sticky shell height `<= 120px`
  - desktop sticky shell height `<= 110px`
- Hero content remains readable without overlapping support cards or cut-off media.
- Mobile navigation sheet opens cleanly, keeps both CTAs visible, and exposes grouped links through accordion sections.
- FAQ expansion does not introduce horizontal overflow or clipped content.
- Key public pages use real academy photography rather than placeholder artwork for the main hero and gallery surfaces.

## Quality Bar
- Layout should feel calm and intentional rather than crowded.
- Decorative treatments should support the content, not compete with it.
- Cards, forms, and menus should keep consistent spacing and edge treatment across the site.
- Visual polish must hold on mobile first, then tablet, then desktop.
