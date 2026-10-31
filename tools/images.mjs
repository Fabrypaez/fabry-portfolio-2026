#!/usr/bin/env node
/**
 * Template image build: `npm run images` (copy this file to <template>/tools/images.mjs).
 * Canonical version of the script Photon started and Unfold, Space and others copied; kept in
 * the upgrade project's tools/template/ so fixes land in one place.
 *
 * For every JPG/PNG a page shows in an <img>:
 *   1. writes an .avif next to it (skipped when it is newer than the original; `--force` rebuilds
 *      them all). Small graphics step the quality down (55, 45, 35) until the AVIF is smaller than
 *      the original; if none is, no AVIF is written and the <img> stays a plain <img>;
 *   2. wraps the <img> in <picture> with an AVIF <source> (the <img> keeps the JPG/PNG for browsers
 *      without AVIF), or fixes the source of an existing <picture>;
 *   3. sets width/height to the image's real size. Authored sizes with the right aspect ratio are
 *      kept (display sizes such as 50x50 avatars); an authored width alone gets its height.
 * Links to a big image (lightboxes) get data-pswp-width/height, which PhotoSwipe needs to open
 * without measuring first. `--css css/style.css` (repeatable) also turns
 * `background-image: url(../images/x.jpg)` in that stylesheet, and inline
 * `style="background-image: url('images/x.jpg')"` on pages, into image-set() with AVIF first.
 *
 * Idempotent: a second run changes nothing (`--check` exits 1 if a run would change a page or an
 * AVIF, and writes nothing; an image skipped as "AVIF not smaller" is up to date). Photon's first
 * version rebuilt every inline <picture> (inside <a> or <p>) as a multi-line block on each run; inline ones now stay on one line and block ones keep their indent.
 *
 * loading="lazy" and fetchpriority are left alone: they depend on where the image sits, so set
 * them by hand (lazy below the fold, fetchpriority="high" on the largest image above it).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const FORCE = args.includes('--force'), CHECK = args.includes('--check');
const CSS_FILES = args.flatMap((a, i) => (a === '--css' && args[i + 1] ? [args[i + 1]] : []));
const QUALITIES = [{ quality: 55, effort: 6 }, { quality: 45, effort: 9 }, { quality: 35, effort: 9 }];

const pages = fs.readdirSync(ROOT).filter((f) => /\.html?$/i.test(f));
const sizes = new Map();
const kb = (f) => Math.round(fs.statSync(f).size / 1024);
const avifOf = (rel) => rel.replace(/\.(jpe?g|png)$/i, '.avif');
const hasAvif = (rel) => fs.existsSync(path.join(ROOT, avifOf(rel)));
const isLocalRaster = (src) => src && !/^([a-z]+:|\/\/)/i.test(src) && /\.(jpe?g|png)$/i.test(src);
const attr = (tag, name) => (new RegExp(`\\s${name}="([^"]*)"`).exec(tag) || [])[1];
function setAttr(tag, name, value) {
  const re = new RegExp(`\\s${name}="[^"]*"`);
  if (re.test(tag)) return tag.replace(re, ` ${name}="${value}"`);
  return tag.replace(/\s*\/?>$/, ` ${name}="${value}">`);
}
async function sizeOf(rel) {
  if (!sizes.has(rel)) { const m = await sharp(path.join(ROOT, rel)).metadata(); sizes.set(rel, { w: m.width, h: m.height }); }
  return sizes.get(rel);
}

const built = new Set();
let wouldWrite = 0;
async function variant(rel) {
  if (built.has(rel)) return;
  built.add(rel);
  const src = path.join(ROOT, rel);
  if (!fs.existsSync(src)) return;
  const out = path.join(ROOT, avifOf(rel));
  if (!FORCE && fs.existsSync(out) && fs.statSync(out).mtimeMs >= fs.statSync(src).mtimeMs) return;
  let buf = null;
  for (const opts of QUALITIES) { buf = await sharp(src).avif(opts).toBuffer(); if (buf.length < fs.statSync(src).size) break; }
  const smaller = buf.length < fs.statSync(src).size;
  if (CHECK) {
    // A missing AVIF is up to date when a run would skip it too ("not smaller"): encoded in memory,
    // nothing written. Alime's --check exited 1 on an up-to-date tree before this.
    if (!smaller && !fs.existsSync(out)) return;
    wouldWrite++;
    console.log(`  ${rel}: ${smaller ? 'AVIF missing or older than the original' : 'stale AVIF not smaller than the original (a run deletes it)'}`);
    return;
  }
  if (!smaller) {
    if (fs.existsSync(out)) fs.unlinkSync(out);
    console.log(`  ${rel}: AVIF not smaller than the original (${kb(src)} KB), skipped`);
    return;
  }
  fs.writeFileSync(out, buf);
  console.log(`  ${rel}: avif ${Math.round(buf.length / 1024)} KB (original ${kb(src)} KB)`);
}
const imageSet = (url, prefix) => `image-set(url('${prefix}${avifOf(url)}') type('image/avif'), url('${prefix}${url}') type('image/${/\.png$/i.test(url) ? 'png' : 'jpeg'}'))`;

// 1. Every raster image in use gets its AVIF first (the markup depends on which exist).
for (const page of pages) {
  const html = fs.readFileSync(path.join(ROOT, page), 'utf8');
  for (const m of html.matchAll(/<img\b[^>]*\ssrc="([^"]+)"/g)) if (isLocalRaster(m[1])) await variant(m[1]);
  if (CSS_FILES.length) for (const m of html.matchAll(/style="background-image:\s*url\(['"]?([^'")]+\.(?:jpe?g|png))['"]?\)/gi)) if (isLocalRaster(m[1])) await variant(m[1]);
}
let changed = 0;
const write = (file, text, before) => {
  if (text === before) return;
  changed++;
  if (CHECK) console.log(`${path.relative(ROOT, file)}: would change`);
  else { fs.writeFileSync(file, text); console.log(`${path.relative(ROOT, file)}: updated`); }
};

// 2. Stylesheets named with --css: a plain url() becomes image-set() (image-set() is left alone).
for (const rel of CSS_FILES) {
  const file = path.join(ROOT, rel);
  const before = fs.readFileSync(file, 'utf8');
  const dir = path.posix.dirname(rel);
  for (const m of before.matchAll(/background-image:\s*url\(['"]?([^'")]+\.(?:jpe?g|png))['"]?\)\s*;/gi)) if (isLocalRaster(m[1])) await variant(path.posix.normalize(path.posix.join(dir, m[1])));
  const css = before.replace(/background-image:\s*url\(['"]?([^'")]+\.(?:jpe?g|png))['"]?\)\s*;/gi, (m, url) => {
    const fromRoot = path.posix.normalize(path.posix.join(dir, url));
    if (!isLocalRaster(url) || !hasAvif(fromRoot)) return m;
    return `background-image: image-set(url('${avifOf(url)}') type('image/avif'), url('${url}') type('image/${/\.png$/i.test(url) ? 'png' : 'jpeg'}'));`;
  });
  write(file, css, before);
}

// 3. Pages.
for (const page of pages) {
  const file = path.join(ROOT, page);
  const before = fs.readFileSync(file, 'utf8');
  let html = before;
  if (CSS_FILES.length) html = html.replace(/style="background-image:\s*url\(['"]?([^'")]+\.(?:jpe?g|png))['"]?\);?"/gi, (m, url) => (isLocalRaster(url) && hasAvif(url) ? `style="background-image: ${imageSet(url, '')};"` : m));

  // <picture> ... <img> ... </picture>: rebuild the source, keeping the block's own layout.
  // A responsive AVIF source (several srcset candidates, e.g. 1x/2x or 500w/1000w, all on disk) is
  // kept as authored: rebuilding it as one `x.avif` would serve the small file to every screen
  // (found on Philosophy). Only the <img> gets its size.
  html = html.replace(/(^[ \t]*)?<picture>(\s*)((?:<source\b[^>]*>\s*)*)(<img\b[^>]*>)\s*<\/picture>/gm, (m, indent, gap, sources, img) => {
    const avifSet = /<source\b[^>]*type="image\/avif"[^>]*>/.exec(sources) && attr(/<source\b[^>]*type="image\/avif"[^>]*>/.exec(sources)[0], 'srcset');
    const candidates = avifSet ? avifSet.split(',').map((c) => c.trim().split(/\s+/)[0]).filter(Boolean) : [];
    const src = attr(img, 'src');
    if (candidates.length > 1 && isLocalRaster(src) && candidates.every((c) => fs.existsSync(path.join(ROOT, c)))) {
      return m.replace(img, img.includes('data-img-size') ? img : img.replace(/\s*\/?>$/, ` data-img-size="${src}">`));
    }
    return wrap(indent ?? null, img, /\n/.test(m));
  });
  // Bare <img> on its own line (block), then inline ones (inside <a>, <p>).
  html = html.replace(/^([ \t]*)(<img\b(?![^>]*data-img-size)[^>]*>)/gm, (m, indent, img) => wrap(indent, img, true));
  html = html.replace(/<img\b(?![^>]*data-img-size)[^>]*>/g, (img) => wrap(null, img, false));

  for (const m of [...html.matchAll(/<img\b[^>]*data-img-size="([^"]+)"[^>]*>/g)]) {
    const { w, h } = await sizeOf(m[1]);
    let tag = m[0].replace(/\sdata-img-size="[^"]*"/, '');
    const ow = Number(attr(tag, 'width')), oh = Number(attr(tag, 'height'));
    if (ow > 0 && oh > 0 && Math.abs(ow / oh - w / h) < 0.01) { /* authored display size: keep */ }
    else if (ow > 0 && !oh) tag = setAttr(tag, 'height', Math.round((ow * h) / w));
    else tag = setAttr(setAttr(tag, 'width', w), 'height', h);
    html = html.replace(m[0], tag);
  }
  for (const m of [...html.matchAll(/<a\b[^>]*\shref="([^"]+\.(?:jpe?g|png|avif))"[^>]*>/gi)]) {
    if (!isLocalRaster(m[1]) && !/\.avif$/i.test(m[1])) continue;
    if (!fs.existsSync(path.join(ROOT, m[1]))) continue;
    const { w, h } = await sizeOf(m[1]);
    html = html.split(m[0]).join(setAttr(setAttr(m[0], 'data-pswp-width', w), 'data-pswp-height', h));
  }
  write(file, html, before);
}
console.log(`${changed} file(s) ${CHECK ? 'would change' : 'updated'}, ${built.size} image(s) checked${CHECK && wouldWrite ? `, ${wouldWrite} AVIF(s) to build` : ''}.`);
if (CHECK && (changed || wouldWrite)) process.exit(1);

/* A <picture> (or a bare <img>) for one image. `indent` is the line's indentation when the element
 * starts a line (null inline); `block` keeps the multi-line layout, else it stays on one line. */
function wrap(indent, img, block) {
  const src = attr(img, 'src');
  const lead = indent ?? '';
  if (!isLocalRaster(src)) return lead + img;
  const tag = img.includes('data-img-size') ? img : img.replace(/\s*\/?>$/, ` data-img-size="${src}">`);
  if (!hasAvif(src)) return lead + tag;
  if (!block || indent === null) return `${lead}<picture><source srcset="${avifOf(src)}" type="image/avif">${tag}</picture>`;
  return `${lead}<picture>\n${lead}  <source srcset="${avifOf(src)}" type="image/avif">\n${lead}  ${tag}\n${lead}</picture>`;
}
