#!/usr/bin/env node
/**
 * Videograph version stamp: `npm run stamp` (part of `npm run build`).
 *
 * Takes the version from package.json and writes it everywhere it has to match:
 *   - ?v=<version> on every local stylesheet and script in the *.html pages, so browsers and CDNs
 *     fetch the new files after an update. Image preloads are left alone: their URL must equal the
 *     one the page's CSS uses, or the image downloads twice;
 *   - <meta name="generator" content="Videograph <version>"> in every page;
 *   - a /*! Videograph <version> *\/ banner on the first line of style.min.css and js/main.min.js,
 *     above the third-party licence comments (which stay).
 * Running it twice changes nothing. (Named `stamp`, not `version`: npm runs a script called
 * `version` during `npm version`.)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const NAME = pkg.displayName || pkg.name;
const V = pkg.version;
const banner = `/*! ${NAME} ${V} */`;

const isLocal = (u) => !/^([a-z][a-z0-9+.-]*:|\/\/|#)/i.test(u);
const withVersion = (u) => {
  const [base, hash = ''] = u.split('#');
  const [p, q = ''] = base.split('?');
  const params = q.split('&').filter((kv) => kv && !/^v=/.test(kv));
  params.push(`v=${V}`);
  return `${p}?${params.join('&')}${hash ? '#' + hash : ''}`;
};

let changed = 0;
const write = (file, before, after) => { if (after !== before) { fs.writeFileSync(file, after); changed++; console.log(`stamped ${path.relative(ROOT, file)}`); } };

for (const page of fs.readdirSync(ROOT).filter((f) => f.endsWith('.html'))) {
  const file = path.join(ROOT, page);
  const before = fs.readFileSync(file, 'utf8');
  let html = before.replace(/<(link|script)\b[^>]*>/gi, (tag, name) => {
    const isScript = name.toLowerCase() === 'script';
    if (!isScript && !/\brel="stylesheet"/i.test(tag)) return tag;
    const attr = isScript ? 'src' : 'href';
    return tag.replace(new RegExp(`(\\s${attr}=")([^"]+)(")`), (m, a, url, b) => (isLocal(url) ? a + withVersion(url) + b : m));
  });
  const gen = `<meta name="generator" content="${NAME} ${V}">`;
  if (/<meta name="generator"[^>]*>/.test(html)) html = html.replace(/<meta name="generator"[^>]*>/, gen);
  else html = html.replace(/(\n([ \t]*)<meta name="viewport"[^>]*>)/, `$1\n$2${gen}`);
  write(file, before, html);
}

for (const rel of ['css/style.min.css', 'js/main.min.js']) {
  const file = path.join(ROOT, rel);
  if (!fs.existsSync(file)) { console.warn(`missing ${rel}: run npm run css / npm run js first`); continue; }
  const before = fs.readFileSync(file, 'utf8');
  const out = before.replace(new RegExp(`^/\\*! ${NAME} [^*]*\\*/\\n?`), '');
  write(file, before, `${banner}\n${out}`);
}
console.log(`${NAME} ${V}: ${changed} file(s) stamped`);
