import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const pagesDir = path.join(root, 'pages');
const registryPath = path.join(root, 'data', 'markirovka-normdocs.json');
const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));

const relatedMarker = /<!-- AUTO:MARKIROVKA_NORMDOCS:RELATED slug=([a-z0-9-]+) -->[\s\S]*?<!-- \/AUTO:MARKIROVKA_NORMDOCS:RELATED -->/;
const indexMarker = /<!-- AUTO:MARKIROVKA_NORMDOCS:INDEX -->[\s\S]*?<!-- \/AUTO:MARKIROVKA_NORMDOCS:INDEX -->/;

function esc(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function href(item) {
  return esc(item.url || (registry.previewBase + item.slug));
}

function countLabel(n) {
  const mod100 = n % 100;
  const mod10 = n % 10;
  if (mod100 >= 11 && mod100 <= 14) return `${n} документов`;
  if (mod10 === 1) return `${n} документ`;
  if (mod10 >= 2 && mod10 <= 4) return `${n} документа`;
  return `${n} документов`;
}

function svg(pathData) {
  return `<svg viewBox="0 0 24 24" fill="none"><path d="${esc(pathData)}" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

function primaryCard(related = false) {
  const item = registry.primary;
  return `<a class="ui-link-panel__featured" href="${href(item)}">
        <div class="ui-link-panel__featured-icon">
          ${svg(item.iconPath)}
        </div>
        <div>
          <strong>${esc(item.title)}</strong>
          <span>${esc(related ? item.relatedSummary : item.summary)}</span>
        </div>
        <span class="ui-link-panel__featured-chevron" aria-hidden="true">${svg('M8 5l7 7-7 7')}</span>
      </a>`;
}

function sectorRow(item) {
  return `<a class="ui-link-panel__row" href="${href(item)}">
          <span class="ui-link-panel__row-icon">${svg(item.iconPath)}</span>
          <div><strong>${esc(item.title)}</strong><span>${esc(item.summary)}</span></div>
          <span class="ui-badge">${countLabel(item.count)}</span>
          <span class="ui-link-panel__row-chevron">${svg('M8 5l7 7-7 7')}</span>
        </a>`;
}

function docsBlock(items, related = false) {
  return `<div class="ui-link-panel">
      ${primaryCard(related)}

      <div class="ui-link-panel__list">
        ${items.map(sectorRow).join('\n        ')}
      </div>
    </div>`;
}

function relatedBlock(currentSlug) {
  const items = registry.sectors.filter(item => item.slug !== currentSlug);
  return `<section class="normpage__related" aria-labelledby="related-docs">
    <h2 id="related-docs" class="ui-content-title">Дополнительная документация по маркировке трубопроводов</h2>
    ${docsBlock(items, true)}
  </section>`;
}

function validate() {
  if (!Array.isArray(registry.sectors) || !registry.sectors.length) throw new Error('Registry has no sectors');
  const seen = new Set();
  for (const item of registry.sectors) {
    if (!item.slug || seen.has(item.slug)) throw new Error(`Duplicate or empty slug: ${item.slug}`);
    seen.add(item.slug);
    if (!Number.isInteger(item.count) || item.count < 1) throw new Error(`Invalid count for ${item.slug}`);
    const pagePath = path.join(pagesDir, item.slug + '.html');
    if (!fs.existsSync(pagePath)) throw new Error(`Missing page for registry item: ${item.slug}`);
  }
}

validate();

for (const item of registry.sectors) {
  const pagePath = path.join(pagesDir, item.slug + '.html');
  const source = fs.readFileSync(pagePath, 'utf8');
  const match = source.match(relatedMarker);
  if (!match) throw new Error(`Missing related marker in ${item.slug}.html`);
  if (match[1] !== item.slug) throw new Error(`Related marker slug mismatch in ${item.slug}.html`);
  const generated = `<!-- AUTO:MARKIROVKA_NORMDOCS:RELATED slug=${item.slug} -->
  ${relatedBlock(item.slug)}
  <!-- /AUTO:MARKIROVKA_NORMDOCS:RELATED -->`;
  fs.writeFileSync(pagePath, source.replace(relatedMarker, generated), 'utf8');
}

const hubPath = path.join(pagesDir, 'markirovka-truboprovodov.html');
const hubSource = fs.readFileSync(hubPath, 'utf8');
if (!indexMarker.test(hubSource)) throw new Error('Missing normative index marker in markirovka-truboprovodov.html');
const hubGenerated = `<!-- AUTO:MARKIROVKA_NORMDOCS:INDEX -->
    ${docsBlock(registry.sectors, false)}
    <!-- /AUTO:MARKIROVKA_NORMDOCS:INDEX -->`;
fs.writeFileSync(hubPath, hubSource.replace(indexMarker, hubGenerated), 'utf8');

console.log(`Generated normative navigation for ${registry.sectors.length} sector pages`);
