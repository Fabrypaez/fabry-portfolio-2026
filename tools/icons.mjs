#!/usr/bin/env node
/**
 * Colorlib kit: icons.mjs — per-page inline Lucide sprite (copy into a template as tools/icons.mjs;
 * `"icons": "node tools/icons.mjs"` in package.json, run with `npm run icons`).
 *
 * Markup, anywhere in a page:   <svg class="lucide" aria-hidden="true"><use href="#i-heart"/></svg>
 * This tool scans every HTML page for `#i-{name}` references and writes, right after <body>,
 *
 *   <!-- icons:start -->
 *   <svg xmlns="http://www.w3.org/2000/svg" style="display:none" aria-hidden="true">
 *   <symbol id="i-heart" viewBox="0 0 24 24">…</symbol>
 *   </svg>
 *   <!-- icons:end -->
 *
 * with only the icons that page uses (an external icons.svg#x does not load from file://, where
 * buyers open the pages). Re-running replaces the block (idempotent); a page that uses no icon
 * loses its block. Nothing is written when a name is unknown: the run fails and lists them.
 *
 *   node tools/icons.mjs            # rewrite the sprite of every page that needs it
 *   node tools/icons.mjs --check    # write nothing; exit 1 if a page is out of date
 *   node tools/icons.mjs --root dir # a template other than the current directory
 *
 * Icon source, first found: icons.config.json "dirs" (your own SVGs, searched first), then
 * node_modules/lucide-static/icons (devDependency "lucide-static": "1.49.0"), then
 * vendor/lucide-static/<version>/icons next to this tool's folder (the kit's vendored copy).
 *
 * icons.config.json (optional, template root):
 *   { "aliases": { "phone": "phone-call" },  // #i-phone draws Lucide's phone-call
 *     "always":  ["x"],                       // icons that scripts insert (added to every page)
 *     "dirs":    ["img/icons"] }              // extra SVG folders, searched before Lucide
 *
 * From each source SVG the root's width, height and class are dropped (the page's .lucide CSS
 * sizes it) and so are Lucide's default fill/stroke attributes (so --icon-stroke works); a custom
 * SVG's other root attributes, such as fill="currentColor", stay on its <symbol>.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const CHECK = args.includes('--check');
const rootArg = args.indexOf('--root');
const ROOT = path.resolve(rootArg >= 0 ? args[rootArg + 1] : process.cwd());
const HERE = path.dirname(fileURLToPath(import.meta.url));
const SKIP_DIRS = new Set(['node_modules', 'vendor', 'tools', 'scss', 'sass', 'fonts', 'includes', '.git']);
const START = '<!-- icons:start -->';
const END = '<!-- icons:end -->';
// Quoted, HTML-escaped (&quot;) or JSON-escaped (\") inside another attribute, e.g. a slider's navText.
const NAME = /(?:xlink:)?href=(?:\\?"|\\?'|&quot;|&#34;|&#39;)#i-([a-z0-9]+(?:-[a-z0-9]+)*)(?=["'&\\])/g;
const BLOCK = /\n?[ \t]*<!-- icons:start -->[\s\S]*?<!-- icons:end -->[ \t]*/;

function fail(msg) { console.error(`icons: ${msg}`); process.exit(1); }

const configFile = path.join(ROOT, 'icons.config.json');
let config = {};
if (fs.existsSync(configFile)) {
  try { config = JSON.parse(fs.readFileSync(configFile, 'utf8')); } catch (e) { fail(`icons.config.json is not valid JSON: ${e.message}`); }
}
const aliases = config.aliases || {};
const always = config.always || [];

/* Icon folders, in lookup order. */
function lucideDir() {
  const nm = path.join(ROOT, 'node_modules', 'lucide-static', 'icons');
  if (fs.existsSync(nm)) {
    const v = JSON.parse(fs.readFileSync(path.join(nm, '..', 'package.json'), 'utf8')).version;
    return { dir: nm, label: `lucide-static ${v} (node_modules)` };
  }
  for (const base of [path.join(ROOT, 'vendor', 'lucide-static'), path.join(HERE, '..', 'vendor', 'lucide-static')]) {
    if (!fs.existsSync(base)) continue;
    const versions = fs.readdirSync(base).filter((v) => fs.existsSync(path.join(base, v, 'icons')))
      .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
    if (versions.length) { const v = versions.at(-1); return { dir: path.join(base, v, 'icons'), label: `lucide-static ${v} (${path.relative(ROOT, base).startsWith('..') ? base : path.relative(ROOT, base)})` }; }
  }
  return null;
}
const lucide = lucideDir();
const dirs = [...(config.dirs || []).map((d) => ({ dir: path.resolve(ROOT, d), label: d })), ...(lucide ? [lucide] : [])];
if (!lucide) fail('Lucide icons not found. Run `npm install` (devDependency "lucide-static": "1.49.0"), or copy the kit\'s vendor/lucide-static/<version>/ into vendor/.');

const findSvg = (name) => {
  for (const { dir } of dirs) { const f = path.join(dir, `${name}.svg`); if (fs.existsSync(f)) return f; }
  return null;
};

/* Lucide's root defaults: left to the .lucide CSS so --icon-stroke and currentColor work. */
const DEFAULTS = { fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };
const DROP = new Set(['width', 'height', 'class', 'xmlns', 'xmlns:xlink', 'version', 'id', 'style', 'aria-hidden', 'role', 'focusable']);

function symbol(id, file) {
  const src = fs.readFileSync(file, 'utf8').replace(/<!--[\s\S]*?-->/g, '').replace(/<\?xml[\s\S]*?\?>/g, '');
  const m = /<svg\b([^>]*)>([\s\S]*?)<\/svg>\s*$/.exec(src.trim());
  if (!m) fail(`${path.relative(ROOT, file)} is not an <svg> file`);
  const attrs = [...m[1].matchAll(/([\w:-]+)\s*=\s*("([^"]*)"|'([^']*)')/g)].map((a) => [a[1], a[3] ?? a[4]]);
  const viewBox = (attrs.find(([k]) => k === 'viewBox') || [, '0 0 24 24'])[1];
  const keep = attrs.filter(([k, v]) => k !== 'viewBox' && !DROP.has(k) && DEFAULTS[k] !== v).map(([k, v]) => ` ${k}="${v}"`).join('');
  const body = m[2].replace(/\s+/g, ' ').replace(/>\s+</g, '><').replace(/\s*\/>/g, '/>').trim();
  return `<symbol id="i-${id}" viewBox="${viewBox}"${keep}>${body}</symbol>`;
}

function pages(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.') || (e.isDirectory() && SKIP_DIRS.has(e.name))) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) pages(p, out);
    else if (/\.html?$/i.test(e.name)) out.push(p);
  }
  return out.sort();
}

/* 1. Collect every page's names; fail before writing anything if one is unknown. */
const files = pages(ROOT);
const used = new Map();
const unknown = new Map();
const cache = new Map();
for (const file of files) {
  const html = fs.readFileSync(file, 'utf8').replace(BLOCK, '');
  const names = new Set([...html.matchAll(NAME)].map((m) => m[1]));
  for (const a of always) names.add(a);
  for (const n of names) {
    const target = aliases[n] || n;
    if (!cache.has(target)) cache.set(target, findSvg(target));
    if (!cache.get(target)) (unknown.get(n) || unknown.set(n, new Set()).get(n)).add(path.relative(ROOT, file));
  }
  used.set(file, [...names].sort());
}
if (unknown.size) {
  const known = fs.readdirSync(lucide.dir).map((f) => f.replace(/\.svg$/, ''));
  const hint = (n) => {
    const words = n.split('-');
    const close = known.filter((k) => k.includes(n) || (k.length > 3 && n.includes(k)) || words.some((w) => w.length > 2 && k.split('-').includes(w))).slice(0, 5);
    return close.length ? ` (did you mean: ${close.join(', ')}?)` : '';
  };
  const lines = [...unknown].map(([n, where]) => `  i-${n}${aliases[n] ? ` (alias of ${aliases[n]})` : ''}: ${[...where].join(', ')}${hint(aliases[n] || n)}`);
  fail(`${unknown.size} unknown icon name(s), nothing written. Names are Lucide's (https://lucide.dev/icons, ${lucide.label}); add an alias in icons.config.json or an SVG in a "dirs" folder:\n${lines.join('\n')}`);
}

/* 2. Build and replace each page's block. */
let changed = 0;
const stale = [];
const all = new Set();
for (const file of files) {
  const html = fs.readFileSync(file, 'utf8');
  const names = used.get(file);
  names.forEach((n) => all.add(n));
  let next = html.replace(BLOCK, '');
  if (names.length) {
    const block = [START, '<svg xmlns="http://www.w3.org/2000/svg" style="display:none" aria-hidden="true">',
      ...names.map((n) => symbol(n, cache.get(aliases[n] || n))), '</svg>', END].join('\n');
    const body = /<body\b[^>]*>/i.exec(next);
    if (!body) fail(`${path.relative(ROOT, file)} uses icons but has no <body> tag`);
    const at = body.index + body[0].length;
    next = next.slice(0, at) + '\n' + block + next.slice(at);
  }
  if (next === html) continue;
  changed++;
  if (CHECK) stale.push(path.relative(ROOT, file));
  else fs.writeFileSync(file, next);
}

if (CHECK && stale.length) fail(`${stale.length} page(s) have an out-of-date icon sprite (run npm run icons): ${stale.join(', ')}`);
console.log(`icons: ${files.length} page(s), ${all.size} icon(s) used, ${CHECK ? 'all sprites up to date' : `${changed} page(s) updated`} [${lucide.label}]`);
