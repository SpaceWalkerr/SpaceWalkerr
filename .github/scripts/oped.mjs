/**
 * Rewrites the "Latest from the Op-Ed" block of README.md (between the
 * OPED:START / OPED:END markers) with the newest articles from
 * surajnandan.in/rss.xml. Leaves the README alone if the feed is down.
 */
import fs from 'node:fs';

const FEED = 'https://surajnandan.in/rss.xml';
const COUNT = 3;

let xml;
try {
  const res = await fetch(FEED, { headers: { 'User-Agent': 'SpaceWalkerr-profile' } });
  if (!res.ok) throw new Error(`feed → ${res.status}`);
  xml = await res.text();
} catch (err) {
  console.error(`oped: keeping previous list (${err.message})`);
  process.exit(0);
}

const decode = (s) =>
  s.replace(/<!\[CDATA\[|\]\]>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').trim();
const tag = (item, name) => decode((item.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`)) || [, ''])[1]);

const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)]
  .map((m) => m[1])
  .map((item) => ({ title: tag(item, 'title'), link: tag(item, 'link'), date: new Date(tag(item, 'pubDate')), blurb: tag(item, 'description') }))
  .filter((i) => i.title && i.link)
  .sort((a, b) => b.date - a.date)
  .slice(0, COUNT);

if (!items.length) {
  console.error('oped: feed had no items; keeping previous list');
  process.exit(0);
}

const month = (d) => d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
const clip = (s, n) => (s.length > n ? `${s.slice(0, n).replace(/\s+\S*$/, '')}…` : s);
const block = items.map((i) => `- **[${i.title}](${i.link})** · <sub>${month(i.date)}</sub><br/><sub>${clip(i.blurb, 150)}</sub>`).join('\n');

const readme = fs.readFileSync('README.md', 'utf8');
const next = readme.replace(/(<!-- OPED:START -->)[\s\S]*?(<!-- OPED:END -->)/, `$1\n${block}\n$2`);
if (next !== readme) fs.writeFileSync('README.md', next);
console.log(`oped: ${items.length} articles`);
