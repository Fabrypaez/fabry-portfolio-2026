/*
 * Build entry for js/main.min.js (`npm run js`, esbuild). The pages load main.min.js, so after
 * editing any file below, run `npm run build`.
 * Each kit module does nothing on a page without its markup. Swiper (index, about, services) loads
 * from vendor/ before this bundle on the pages that have a slider.
 */
import './kit/mobile-nav.js';
import './kit/sliders.js';
import './kit/video-dialog.js';
import './kit/filter.js';
import './kit/counters.js';
import './kit/form.js';
import './kit/map.js';
import './main.js';
