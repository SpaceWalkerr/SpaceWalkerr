/**
 * Draws assets/scoreboard-light.svg and assets/scoreboard-dark.svg — live
 * LeetCode stats and recent GitHub contributions, in the style of
 * surajnandan.in. Runs daily from .github/workflows/profile.yml.
 *
 * Data comes from the portfolio's own endpoints; if either is down the
 * previous images are left untouched.
 */
import fs from 'node:fs';

const SITE = 'https://surajnandan.in';
const get = async (path) => {
  const res = await fetch(SITE + path, { headers: { 'User-Agent': 'SpaceWalkerr-profile' } });
  if (!res.ok) throw new Error(`${path} → ${res.status}`);
  return res.json();
};

let lc, gh;
try {
  [lc, gh] = await Promise.all([get('/api/leetcode'), get('/api/contributions')]);
  if (!lc.solved || !gh.days?.length) throw new Error('unexpected payload');
} catch (err) {
  console.error(`scoreboard: keeping previous images (${err.message})`);
  process.exit(0);
}

const THEMES = {
  light: {
    bg: '#e9e4d6', ink: '#17171a', mute: '#57534a', faint: 'rgba(23,23,26,0.12)', red: '#c6392b', accent: '#8a2a2a',
    levels: ['#dcd6c6', '#c9b39a', '#b07c62', '#8a2a2a', '#17171a'],
  },
  dark: {
    bg: '#141417', ink: '#e8e4d9', mute: '#a39f96', faint: 'rgba(232,228,217,0.14)', red: '#e8604a', accent: '#e8604a',
    levels: ['#232328', '#4a3431', '#7a3f38', '#b0443a', '#e8604a'],
  },
};

const W = 830;
const H = 270;
const serif = "Georgia, 'Times New Roman', serif";
const sans = "'Helvetica Neue', Helvetica, Arial, sans-serif";
const mono = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
const fmt = (n) => n.toLocaleString('en-IN');
const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });

// Contribution days → Sunday-first week columns; the last 31 weeks fit beside the LeetCode block
const weeks = [];
let col = [];
gh.days.forEach((d, i) => {
  const dow = new Date(`${d.date}T00:00:00Z`).getUTCDay();
  if (i === 0) col = Array(dow).fill(null);
  col.push(d);
  if (dow === 6) {
    weeks.push(col);
    col = [];
  }
});
if (col.length) weeks.push(col);
const recent = weeks.slice(-31);

// Rough width of a heavy numeral run, so the caption can sit beside the big number
const numberWidth = (text, size) => text.length * size * 0.6;

function svg(t) {
  const solved = fmt(lc.solved.all);
  const total = fmt(gh.total);

  const bars = [
    ['Easy', lc.solved.easy, lc.available.easy],
    ['Medium', lc.solved.medium, lc.available.medium],
    ['Hard', lc.solved.hard, lc.available.hard],
  ]
    .map(([label, n, of], i) => {
      const y = 160 + i * 26;
      const w = 262;
      const fill = Math.max(2, Math.round((n / Math.max(1, of)) * w));
      return `
  <text x="36" y="${y}" fill="${t.ink}" font-family="${mono}" font-size="10" letter-spacing="1.6">${label.toUpperCase()}</text>
  <text x="${36 + w}" y="${y}" fill="${t.mute}" font-family="${mono}" font-size="10" text-anchor="end">${n} / ${fmt(of)}</text>
  <rect x="36" y="${y + 6}" width="${w}" height="5" fill="${t.faint}"/>
  <rect x="36" y="${y + 6}" width="${fill}" height="5" fill="${label === 'Hard' ? t.red : t.ink}"/>`;
    })
    .join('');

  const cell = 11;
  const gap = 3;
  const gx = 372;
  const gy = 124;
  const cells = recent
    .map((week, x) =>
      week
        .map((d, y) =>
          d
            ? `<rect x="${gx + x * (cell + gap)}" y="${gy + y * (cell + gap)}" width="${cell}" height="${cell}" fill="${t.levels[d.level] ?? t.levels[0]}"><title>${d.count} on ${d.date}</title></rect>`
            : ''
        )
        .join('')
    )
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Suraj Nandan: ${lc.solved.all} LeetCode problems solved and ${gh.total} GitHub contributions in the last year">
  <rect width="${W}" height="${H}" fill="${t.bg}"/>
  <line x1="20" y1="22" x2="${W - 20}" y2="22" stroke="${t.ink}" stroke-width="1.5"/>
  <line x1="20" y1="26" x2="${W - 20}" y2="26" stroke="${t.ink}" stroke-width="1.5"/>
  <text x="20" y="46" fill="${t.accent}" font-family="${mono}" font-size="10.5" letter-spacing="2.6">SUPPLEMENT · THE SCOREBOARD</text>
  <text x="${W - 20}" y="46" fill="${t.mute}" font-family="${mono}" font-size="10.5" letter-spacing="2" text-anchor="end">UPDATED ${today.toUpperCase()}</text>
  <line x1="20" y1="56" x2="${W - 20}" y2="56" stroke="${t.ink}" stroke-width="1"/>

  <text x="36" y="122" fill="${t.ink}" font-family="${sans}" font-weight="900" font-size="60" letter-spacing="-2">${solved}</text>
  <text x="${36 + numberWidth(solved, 60) + 10}" y="100" fill="${t.mute}" font-family="${serif}" font-style="italic" font-size="15">LeetCode problems</text>
  <text x="${36 + numberWidth(solved, 60) + 10}" y="119" fill="${t.mute}" font-family="${serif}" font-style="italic" font-size="15">solved</text>
  ${bars}
  ${lc.contest ? `<text x="36" y="${H - 22}" fill="${t.mute}" font-family="${serif}" font-style="italic" font-size="13">Contest rating ${lc.contest.rating} across ${lc.contest.attended} rated contests</text>` : ''}

  <line x1="338" y1="72" x2="338" y2="${H - 18}" stroke="${t.faint}" stroke-width="1"/>
  <text x="${gx}" y="100" fill="${t.ink}" font-family="${sans}" font-weight="900" font-size="34" letter-spacing="-1">${total}</text>
  <text x="${gx + numberWidth(total, 34) + 8}" y="100" fill="${t.mute}" font-family="${serif}" font-style="italic" font-size="15">GitHub contributions in the last year</text>
  ${cells}
  <text x="${gx}" y="${H - 22}" fill="${t.mute}" font-family="${mono}" font-size="10" letter-spacing="1.6">LAST 31 WEEKS${gh.streak > 1 ? ` · ${gh.streak}-DAY STREAK` : ''}</text>
  <text x="${W - 20}" y="${H - 22}" fill="${t.accent}" font-family="${mono}" font-size="10" letter-spacing="1.6" text-anchor="end">SURAJNANDAN.IN</text>
  <rect x="0" y="${H - 5}" width="${W}" height="5" fill="${t.red}"/>
</svg>
`;
}

fs.mkdirSync('assets', { recursive: true });
for (const [name, theme] of Object.entries(THEMES)) fs.writeFileSync(`assets/scoreboard-${name}.svg`, svg(theme));
console.log(`scoreboard: ${lc.solved.all} solved, ${gh.total} contributions`);
