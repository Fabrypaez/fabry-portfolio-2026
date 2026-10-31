# Videograph - Videographer Portfolio Template

Videograph is a 7-page HTML template for videographers, filmmakers and video production studios: a full-screen hero slider, a video work gallery that plays YouTube and Vimeo clips in a dialog, a filterable portfolio, services, team, testimonials, a blog and a contact page. It is built with Bootstrap 5.3.8 and plain JavaScript (no jQuery), and every page works by opening `index.html` in a browser.

Version 3.0.2. See [CHANGELOG.md](CHANGELOG.md) for what changed.

## Pages

| Page | Contents |
|------|----------|
| `index.html` | Hero slider, services, video work gallery, counters, team, latest posts slider, call to action |
| `about.html` | Studio story, testimonials slider, counters, team |
| `portfolio.html` | Video portfolio with category filter buttons |
| `services.html` | Services, call to action, client logo carousel |
| `blog.html` | Blog listing with pagination |
| `blog-details.html` | Single post with comment form |
| `contact.html` | Address, phone and email, click-to-load map, contact form |

## Files

```
videograph/
├── index.html … contact.html   # the 7 pages
├── css/
│   ├── style.css               # compiled from sass/ (Bootstrap + theme + kit modules)
│   ├── style.min.css           # what the pages load (npm run build)
│   └── kit/                    # kit module styles (menu, sliders, video dialog, filter, icons, form, map)
├── js/
│   ├── main.js                 # theme scripts: sliders, year, video links
│   ├── kit/                    # kit modules: mobile-nav, sliders, video-dialog, filter, counters, form, map
│   ├── index.js                # build entry: lists the files bundled into main.min.js
│   └── main.min.js             # what the pages load (npm run build)
├── sass/                       # theme Sass (style.scss + partials) and Bootstrap 5.3.8 source
├── fonts/                      # self-hosted Play, Josefin Sans and Font Awesome Brands (subset)
├── img/                        # JPG/PNG originals and their AVIF copies
├── php/                        # send-email.php (contact + comments), subscribe.php (newsletter)
├── vendor/swiper/14.3.0/       # Swiper
└── tools/                      # build scripts (images, icons, version stamp)
```

## Editing and building

The pages load the minified `css/style.min.css` and `js/main.min.js`. After you change anything in `sass/` or `js/`, rebuild them:

```bash
npm install        # once
npm run build      # Sass -> css/style.css -> css/style.min.css, JS -> js/main.min.js, then version stamp
```

| Script | What it does |
|--------|--------------|
| `npm run build` | `css`, then `js`, then `stamp` |
| `npm run css` | Dart Sass compiles `sass/style.scss` to `css/style.css`; esbuild minifies it to `css/style.min.css` |
| `npm run js` | esbuild bundles `js/index.js` (kit modules and main.js) into `js/main.min.js` |
| `npm run stamp` | Writes the `package.json` version everywhere it must match: `?v=` on every CSS/JS link, the `generator` meta tag and the first-line banner of the two built files |
| `npm run images` | Makes an `.avif` copy of every image a page shows and updates the `<picture>` markup, `width`/`height` and the `image-set()` backgrounds |
| `npm run icons` | Rebuilds the icon sprite at the top of each page from the `#i-…` icons it uses |
| `npm run watch` | Recompiles `css/style.css` while you edit the Sass (run `npm run build` before publishing) |

No Node.js? You can edit `css/style.css` and the files in `js/` directly: point the pages at `css/style.css` instead of `css/style.min.css`, and replace `js/main.min.js` with the `js/kit/*.js` files and `js/main.js`, in the order listed in `js/index.js`.

## Customising

**Colours.** Change the variables in `sass/_variable.scss` and run `npm run build`:

```scss
$primary-color: #00bfe7;      // brand cyan: buttons, links, icons, accents
$button-text-color: #100028;  // text on cyan buttons (white on cyan reads at only 2.2:1)
$meta-text-color: #7b7b7b;    // dates and labels on the dark background
```

Check new text colours for a 4.5:1 contrast ratio against the dark background (WebAIM's contrast checker will tell you).

**Fonts.** Play (headings) and Josefin Sans (text) are self-hosted from `fonts/` (`sass/_fonts.scss`), with one file per weight. To add a weight, copy its `.woff2` files from the `@fontsource/play` or `@fontsource/josefin-sans` package and add its `@font-face` blocks.

**Icons.** Interface icons are [Lucide](https://lucide.dev/icons) SVGs drawn from a small sprite at the top of each page: `<svg class="lucide" aria-hidden="true"><use href="#i-arrow-right"/></svg>`. To add one, write that markup with the icon's name and run `npm run icons`. The line weight is `--icon-stroke` in `sass/_base.scss`. Social logos use a Font Awesome 7.3.1 Brands subset (`fonts/fontawesome/`, `sass/_fontawesome.scss`) with Facebook, X, Dribbble, Instagram and YouTube.

**Photos.** Replace a photo by saving your JPG under the same name in `img/` and running `npm run images`, which makes the AVIF copy. Section backgrounds are inline `style="background-image: image-set(…)"` attributes in the pages (and a few `image-set()` rules in `sass/_blog.scss` and `sass/_home-page.scss`); change both URLs when you rename an image.

**Videos.** A play button is a link with the class `play-btn`: `<a href="https://www.youtube.com/watch?v=VIDEO_ID" class="play-btn" aria-label="Play video">`. YouTube and Vimeo links open in a dialog (from youtube-nocookie.com, loaded only on click). Pages opened straight from disk (`file://`) open the video on YouTube or Vimeo in a new tab instead, because YouTube refuses embeds without a web address. The demo links are royalty-free stock clips; replace them with your own.

**Sliders.** Slide counts, autoplay and breakpoints are set in `js/main.js` (`initHeroSlider`, `initTestimonialSlider`, `initLatestSlider`, `initLogoCarousel`).

**Portfolio filter.** Each button's `data-filter=".web"` shows the items with that class on `portfolio.html`; add a class to an item to put it in a category.

## Forms

The contact form (`contact.html`) and the comment form (`blog-details.html`) post to `php/send-email.php`; the newsletter form in every footer posts to `php/subscribe.php`. They need a host with PHP and working `mail()`. Open each file and set:

- `'to'`: the address that should receive the messages (it is `you@example.com`);
- `'from'`: an address on your own domain (many hosts refuse mail from other domains). The visitor's address goes in Reply-To.

The field names in `'fields'` match the forms (`name`, `email`, `website`, `message`). If you add a field to a form, add it there too. The handlers strip line breaks from single-line fields, escape the message, ignore bots that fill the hidden `fax` field, and answer with a short message that the page shows under the form. On a static host without PHP the form shows an error message. On a busy site, put a spam filter such as Cloudflare Turnstile or a form service in front of it, and connect the newsletter to your mailing-list service.

## Map

The map on `contact.html` loads only when the visitor clicks "Show map", so the page makes no request to Google until then. Change the address in the placeholder and the embed URL in `data-map-src` (Google Maps: Share → Embed a map → copy the `src`; or an OpenStreetMap `export/embed.html` URL). No API key is needed.

## Google Analytics

Analytics is off. Each page ends with a commented-out Google Analytics 4 snippet. To turn it on, replace both `G-XXXXXXXXXX` with your Measurement ID and delete the comment's first and last lines (`<!--` and `-->`), on every page. Check your privacy and cookie-consent obligations first.

## SEO

Every page has its own `<title>`, description, Open Graph and Twitter tags. Before going live:

- edit the titles and descriptions to describe your studio;
- add the canonical link each page's head describes in a comment (`<link rel="canonical" href="https://your-domain/…">`), with your real domain;
- change `og:image` and `twitter:image` to absolute URLs (`https://your-domain/img/...`), which social networks require;
- update the structured data: the `ProfessionalService` block on `index.html` (name, description, url; add your address and phone) and the `BlogPosting` block on `blog-details.html`.

## Accessibility

Keyboard users get a skip link, visible focus rings and a mobile menu that traps focus and closes with Esc. Icon-only links and buttons have names, form fields have labels, and colours meet WCAG AA contrast. Keep it that way when you edit: give new icon links an `aria-label`, and check new colours for contrast.

## Browser support

Current versions of Chrome, Edge, Firefox and Safari (desktop and mobile). Every current browser shows the AVIF images; older ones get the JPG or PNG automatically.

## Credits

| What | Version | Licence |
|------|---------|---------|
| Design | | [Colorlib](https://colorlib.com) |
| [Bootstrap](https://getbootstrap.com) (Sass, compiled into style.css) | 5.3.8 | MIT |
| [Swiper](https://swiperjs.com) (sliders) | 14.3.0 | MIT |
| [Lucide](https://lucide.dev) icons | 1.49.0 | ISC |
| [Font Awesome](https://fontawesome.com) Brands (social logos, subset) | 7.3.1 | SIL OFL 1.1 (font), CC BY 4.0 (icons) |
| [Play](https://fonts.google.com/specimen/Play), [Josefin Sans](https://fonts.google.com/specimen/Josefin+Sans) via [Fontsource](https://fontsource.org) | 5.3.0 | SIL OFL 1.1 |
| Modules in `js/kit/`, `css/kit/` and `php/` | | Colorlib, part of this template |
| Build tools (not shipped to visitors): [Dart Sass](https://sass-lang.com), [esbuild](https://esbuild.github.io), [sharp](https://sharp.pixelplumbing.com), [lucide-static](https://lucide.dev) | see `package.json` | MIT, MIT, Apache-2.0, ISC |

The licence files of the vendored libraries and fonts are next to them in `vendor/` and `fonts/`. The demo photos and video clips are there for the preview; replace them with your own.

## Licence

Videograph is a commercial template: buying it on [colorlib.com](https://colorlib.com) licenses you to use it under the terms in [`LICENSE.md`](LICENSE.md) (full terms: https://colorlib.com/wp/licence/). Third-party libraries, fonts and icons keep their own licences; see Credits.

## Support

For questions and support, please visit [Colorlib Support](https://colorlib.com/wp/forums/).
