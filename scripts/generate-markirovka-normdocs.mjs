import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const pagesDir = path.join(root, 'pages');
const registryPath = path.join(root, 'site-assets', 'data', 'markirovka', 'markirovka-normdocs.json');
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

function icon(id) {
  const safeId=String(id||'').replace(/[^a-z0-9-]/g,'');
  return `<svg class="mot-icon" aria-hidden="true"><use href="/assets/icons/ui-icons.svg#${safeId}"></use></svg>`;
}

function primaryCard(related = false) {
  const item = registry.primary;
  return `<a class="mot-link-panel__featured" href="${href(item)}">
        <div class="mot-link-panel__featured-icon">
          ${icon(item.iconId)}
        </div>
        <div>
          <strong>${esc(item.title)}</strong>
          <span>${esc(related ? item.relatedSummary : item.summary)}</span>
        </div>
        <span class="mot-link-panel__featured-chevron" aria-hidden="true">${icon('chevron-right')}</span>
      </a>`;
}

function sectorRow(item) {
  return `<a class="mot-link-panel__row" href="${href(item)}">
          <span class="mot-link-panel__row-icon">${icon(item.iconId)}</span>
          <div><strong>${esc(item.title)}</strong><span>${esc(item.summary)}</span></div>
          <span class="mot-badge">${countLabel(item.count)}</span>
          <span class="mot-link-panel__row-chevron">${icon('chevron-right')}</span>
        </a>`;
}

function docsBlock(items, related = false) {
  return `<div class="mot-link-panel">
      ${primaryCard(related)}

      <div class="mot-link-panel__list">
        ${items.map(sectorRow).join('\n        ')}
      </div>
    </div>`;
}

function relatedBlock(currentSlug) {
  const items = registry.sectors.filter(item => item.slug !== currentSlug);
  return `<section class="mot-normpage__related" aria-labelledby="related-docs">
    <h2 id="related-docs" class="mot-content-title">Дополнительная документация по маркировке трубопроводов</h2>
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
