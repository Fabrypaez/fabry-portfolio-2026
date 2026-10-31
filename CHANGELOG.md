# Changelog

All notable changes to the Videograph template are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [3.0.2] - 2026-10-22

### Fixed

- Link social icons to their networks and replace placeholder contact details.

## [3.0.1] - 2026-10-02

### Fixed
- Text contrast: a dark purple shade between the hero photo and the hero text on phones (the text crossed the bright stage lights); brighter award line in the call-to-action band.

## [3.0.0] - 2026-10-01

### Changed
- Sliders run on Swiper 14.3.0 (was 12.0.3) through the kit `sliders.js`; slides are wrapped in the markup instead of at runtime.
- The video gallery opens YouTube and Vimeo clips in an accessible dialog (youtube-nocookie, nothing loads before the click). The 15 demo links that pointed at a joke video now play royalty-free stock clips.
- The portfolio filter uses the kit `filter.js` (MixItUp removed); filter items are buttons with `aria-pressed`. The home work gallery is a CSS grid (Masonry removed).
- The mobile menu is the kit `mobile-nav.js` dialog (focus trap, Esc closes); counters use the kit `counters.js`.
- Icons are inline Lucide SVGs; social logos use a Font Awesome 7.3.1 Brands subset. The full Font Awesome 7.1 CSS and fonts are gone.
- Fonts (Play, Josefin Sans) are self-hosted; no Google Fonts requests.
- CSS and JS are minified into `css/style.min.css` and `js/main.min.js` (`npm run build`); the Bootstrap licence banner is kept.
- Images: AVIF copies with JPG/PNG fallback (`<picture>` and `image-set()`), real `width`/`height`, lazy loading below the fold; background images are written in the markup, not set by script.
- The contact map loads only when the visitor clicks "Show map".
- The contact, comment and newsletter forms post to PHP handlers in `php/` with validation and on-page messages.
- Buttons on the cyan brand colour use dark text, and meta text is slightly lighter, for WCAG AA contrast.
- The licence is the Colorlib commercial licence (`LICENSE.md`).

### Added
- `<main>` landmark and one `<h1>` per page, names for icon links, buttons and form fields.
- Per-page titles and descriptions, Open Graph and Twitter tags, `ProfessionalService` and `BlogPosting` structured data.
- `package.json` with build, image, icon and version scripts.

### Removed
- The full-page preloader, Bootstrap's unused JavaScript bundle, MixItUp, Masonry and the unused Flaticon stylesheet.
- Colorlib's Universal Analytics ID and the live GA4 placeholder tag (a commented GA4 snippet remains).

### Fixed
- Brand logos painted out of three photos (camera, drone and gimbal).
- Demo content: fictional portfolio titles, address and email; typos "Videoprah", "Compled", "Sevices" and "Carrers".
- The contact email row showed a location icon; the skip link pointed at a missing target on six pages.

---

## [2.0.0] - 2026-01-28

### Major Upgrade: Bootstrap 5.3.8 + Vanilla JavaScript

Complete modernization of the template stack. This release removes all jQuery dependencies and upgrades to the latest Bootstrap 5, delivering faster load times, better accessibility, and a more maintainable codebase.

### Highlights

- **40% smaller JavaScript bundle** - Removed jQuery (87KB) and legacy plugins
- **Modern carousel system** - Swiper 12 with touch support and smooth animations
- **Accessibility compliance** - WCAG 2.1 features including skip links and ARIA labels
- **Future-proof stack** - Bootstrap 5.3.8 with CSS custom properties support

### Changed

#### Framework & Libraries
- **Bootstrap**: 4.5.0 → 5.3.8 (full SCSS source included for customization)
- **Font Awesome**: 4.7.0 → 7.1.0 (new `fa-solid`, `fa-brands` class syntax)
- **MixItUp**: 3.3.1 → 3.3.2 (MIT licensed version)
- **Google Analytics**: Universal Analytics (UA) → Google Analytics 4 (GA4)

#### Carousels
- **Hero Slider**: Owl Carousel → Swiper 12 with fade effect and numbered pagination
- **Testimonial Slider**: Owl Carousel → Swiper 12 with responsive breakpoints
- **Latest Blog Slider**: Owl Carousel → Swiper 12 with responsive breakpoints
- **Logo Carousel**: Owl Carousel → Swiper 12 with autoplay

#### Video Lightbox
- **Old**: Magnific Popup (jQuery-dependent)
- **New**: Custom vanilla JS modal with YouTube and Vimeo support
- Automatic protocol detection with helpful error messages for `file://`

#### Mobile Menu
- **Old**: SlickNav (jQuery-dependent)
- **New**: Custom vanilla JS implementation with animated hamburger icon
- Improved dropdown handling with chevron toggles

#### Animations
- **Counter Animation**: jQuery `.animate()` → Vanilla JS with IntersectionObserver
- Smooth easing with requestAnimationFrame for 60fps animations

### Added

#### New Files
- `sass/bootstrap/` - Complete Bootstrap 5.3.8 SCSS source
- `js/bootstrap.bundle.min.js` - Bootstrap 5 JavaScript bundle
- `js/swiper-bundle.min.js` - Swiper 12 library
- `css/swiper-bundle.min.css` - Swiper 12 styles
- `fonts/` - Font Awesome 7.1 webfonts
- `README.md` - Comprehensive documentation
- `CHANGELOG.md` - Version history
- `.gitignore` - Git ignore rules

#### Accessibility Features
- Skip navigation link (`<a href="#main-content" class="skip-link">`)
- `<main id="main-content">` wrapper for skip link target
- `role="banner"` on header element
- `aria-label="Main navigation"` on nav element
- `aria-hidden="true"` on decorative preloader
- `aria-label` on mobile menu toggle button
- `aria-expanded` state management on mobile menu
- `:focus-visible` styles for keyboard navigation
- `prefers-reduced-motion` media query support

#### Image Optimization
- AVIF image versions for modern browsers
- Maintained JPG fallbacks for compatibility

#### Developer Experience
- Modular JavaScript with separate `init` functions
- Guard clauses for missing elements
- Consistent coding style throughout
- Comprehensive code comments

### Removed

#### jQuery & Plugins
- `js/jquery-3.3.1.min.js` (87KB saved)
- `js/owl.carousel.min.js`
- `css/owl.carousel.min.css`
- `js/jquery.magnific-popup.min.js`
- `css/magnific-popup.css`
- `js/jquery.slicknav.js`
- `css/slicknav.min.css`

#### Legacy Files
- `js/bootstrap.min.js` (Bootstrap 4)
- `css/bootstrap.min.css` (Bootstrap 4)
- Font Awesome 4.7 CSS and fonts
- Elegant Icons font (replaced with Font Awesome)
- `Source/` directory (original plugin zip files)
- Outdated vendor prefixes in SCSS

### Fixed

- Link underlines appearing unexpectedly in Bootstrap 5 (added explicit `text-decoration: none`)
- Mobile menu accessibility with proper ARIA attributes
- Video lightbox showing cryptic errors on localhost (now shows helpful instructions)
- Carousel slide wrapping handled dynamically by JavaScript helper function

### Migration Notes

#### For Developers Upgrading from v1.x

1. **Class Changes**
   - Owl Carousel classes → Swiper classes (handled automatically by JS)
   - `.video-popup` → `data-fancybox="gallery"` attribute
   - Font Awesome: `fa fa-*` → `fa-solid fa-*` or `fa-brands fa-*`

2. **Bootstrap 4 → 5 Classes**
   - `ml-*` / `mr-*` → `ms-*` / `me-*` (if used)
   - `data-toggle` → `data-bs-toggle` (if used)
   - `data-target` → `data-bs-target` (if used)

3. **Script Loading**
   - Remove jQuery script tag
   - Add Swiper bundle before main.js
   - Bootstrap bundle includes Popper.js

---

## [1.0.0] - 2020-01-01

### Initial Release

Original Videograph template with the following stack:

- Bootstrap 4.5.0
- jQuery 3.3.1
- Owl Carousel 2.3.4
- Magnific Popup 1.1.0
- SlickNav 1.0.10
- MixItUp 3.3.1
- Masonry 4.2.2
- Font Awesome 4.7.0
- Elegant Icons
- Google Analytics (Universal Analytics)

### Pages
- Home
- About
- Portfolio
- Services
- Blog
- Blog Details
- Contact

### Features
- Hero slider with text overlays
- Video portfolio with lightbox
- Testimonial carousel
- Team member cards
- Service cards
- Blog listing and detail pages
- Contact form
- Newsletter signup
- Social media links
- Animated counters
- Masonry work gallery
