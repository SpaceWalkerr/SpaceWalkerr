/**
 * Draws assets/languages-light.svg and assets/languages-dark.svg — a "type
 * specimen" of the languages across SpaceWalkerr's own (non-fork) repos,
 * weighted by bytes of code. Uses GITHUB_TOKEN when available.
 */
import fs from 'node:fs';

const USER = 'SpaceWalkerr';
const headers = { 'User-Agent': 'SpaceWalkerr-profile', Accept: 'application/vnd.github+json' };
if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
const gh = async (url) => {
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.json();
};

let totals = {};
try {
  const repos = (await gh(`https://api.github.com/users/${USER}/repos?per_page=100&type=owner`)).filter((r) => !r.fork && !r.archived);
  for (const r of repos) {
    const langs = await gh(r.languages_url);
    for (const [lang, bytes] of Object.entries(langs)) totals[lang] = (totals[lang] ?? 0) + bytes;
  }
} catch (err) {
  console.error(`languages: keeping previous images (${err.message})`);
  process.exit(0);
}

// Markup and generated files would crowd out the languages actually written
for (const skip of ['HTML', 'CSS', 'SCSS', 'Jupyter Notebook', 'Shell', 'Dockerfile', 'Makefile', 'Batchfile', 'Procfile']) delete totals[skip];
const sum = Object.values(totals).reduce((a, b) => a + b, 0);
if (!sum) process.exit(0);
const top = Object.entries(totals).sort((a, b) => b[1] - a[1]).slice(0, 6);
const other = sum - top.reduce((a, [, b]) => a + b, 0);
const rows = [...top.map(([l, b]) => [l, b / sum]), ...(other / sum > 0.005 ? [['Other', other / sum]] : [])];

const THEMES = {
  light: { bg: '#e9e4d6', ink: '#17171a', mute: '#57534a', faint: 'rgba(23,23,26,0.14)', accent: '#8a2a2a', inks: ['#17171a', '#8a2a2a', '#c6392b', '#57534a', '#b07c62', '#847e70', '#c9b39a'] },
  dark: { bg: '#141417', ink: '#e8e4d9', mute: '#a39f96', faint: 'rgba(232,228,217,0.14)', accent: '#e8604a', inks: ['#e8e4d9', '#e8604a', '#b0443a', '#a39f96', '#7a3f38', '#7a7770', '#4a3431'] },
};
const W = 830, H = 214;
const serif = "Georgia, 'Times New Roman', serif";
const sans = "'Helvetica Neue', Helvetica, Arial, sans-serif";
const mono = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
const pct = (f) => `${(f * 100).toFixed(f < 0.1 ? 1 : 0)}%`;

function svg(t) {
  let x = 20;
  const barW = W - 40;
  const segs = rows.map(([l, f], i) => {
    const w = Math.max(2, f * barW);
    const r = `<rect x="${x.toFixed(1)}" y="78" width="${w.toFixed(1)}" height="16" fill="${t.inks[i % t.inks.length]}"><title>${l} ${pct(f)}</title></rect>`;
    x += w;
    return r;
  }).join('');
  const colW = (W - 40) / rows.length;
  const legend = rows.map(([l, f], i) => {
    const cx = 20 + i * colW;
    return `<rect x="${cx}" y="120" width="10" height="10" fill="${t.inks[i % t.inks.length]}"/>
  <text x="${cx + 16}" y="130" fill="${t.ink}" font-family="${mono}" font-size="10.5" letter-spacing="1.2">${l.toUpperCase()}</text>
  <text x="${cx}" y="164" fill="${t.ink}" font-family="${sans}" font-weight="900" font-size="26" letter-spacing="-1">${pct(f)}</text>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Languages across Suraj Nandan's repositories: ${rows.map(([l, f]) => `${l} ${pct(f)}`).join(', ')}">
  <rect width="${W}" height="${H}" fill="${t.bg}"/>
  <line x1="20" y1="22" x2="${W - 20}" y2="22" stroke="${t.ink}" stroke-width="1.5"/>
  <line x1="20" y1="26" x2="${W - 20}" y2="26" stroke="${t.ink}" stroke-width="1.5"/>
  <text x="20" y="46" fill="${t.accent}" font-family="${mono}" font-size="10.5" letter-spacing="2.6">TYPE SPECIMEN · LANGUAGES ON FILE</text>
  <text x="${W - 20}" y="46" fill="${t.mute}" font-family="${serif}" font-style="italic" font-size="14" text-anchor="end">by bytes of code, across my own repositories</text>
  <line x1="20" y1="56" x2="${W - 20}" y2="56" stroke="${t.ink}" stroke-width="1"/>
  ${segs}
  ${legend}
  <rect x="0" y="${H - 5}" width="${W}" height="5" fill="${t.accent}"/>
</svg>
`;
}

fs.mkdirSync('assets', { recursive: true });
for (const [name, theme] of Object.entries(THEMES)) fs.writeFileSync(`assets/languages-${name}.svg`, svg(theme));
console.log(`languages: ${rows.map(([l, f]) => `${l} ${pct(f)}`).join(', ')}`);
