import fs from 'node:fs';
import path from 'node:path';

const pagesDir = path.resolve('pages');
const outputFile = path.join(pagesDir, 'index-gpt.html');
const previewBase = 'https://magazinot.ru/dev-preview--uid-0002286147/';

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return entry.isFile() && entry.name.endsWith('.html') ? [full] : [];
  });
}

function esc(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function metadata(html) {
  const meta = {};
  const re = /<!--\s*dev-([a-z0-9-]+)\s*:\s*([^]*?)-->/gi;
  for (const match of html.matchAll(re)) meta[match[1].toLowerCase()] = match[2].trim();
  return meta;
}

function titleFrom(html, fallback) {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match ? match[1].trim() : fallback;
}

function isFinalTitle(meta) {
  return ['final', 'approved', 'финальный', 'утвержден'].includes((meta['title-state'] || '').trim().toLowerCase());
}

function pageInfo(file) {
  const html = fs.readFileSync(file, 'utf8');
  const rel = path.relative(pagesDir, file).replaceAll('\\', '/');
  const meta = metadata(html);
  const slug = rel.replace(/\.html$/i, '');
  const fallback = path.basename(slug).replaceAll('-', ' ');
  return {
    title: meta.title || titleFrom(html, fallback),
    pathParts: (meta.path || 'Прочее').split('/').map((x) => x.trim()).filter(Boolean),
    status: meta.status || '',
    titleFinal: isFinalTitle(meta),
    order: Number.isFinite(Number(meta.order)) ? Number(meta.order) : 999,
    slug,
  };
}

function node(name = '') {
  return { name, children: new Map(), pages: [] };
}

const root = node();
for (const file of walk(pagesDir)) {
  if (path.resolve(file) === path.resolve(outputFile)) continue;
  const page = pageInfo(file);
  let current = root;
  for (const part of page.pathParts) {
    if (!current.children.has(part)) current.children.set(part, node(part));
    current = current.children.get(part);
  }
  current.pages.push(page);
}

function pageHtml(page) {
  const href = previewBase + '?page=' + encodeURIComponent(page.slug);
  const temporary = page.titleFinal ? '' : '<span class="dev-index-temp" title="Предварительное название">⏳</span> ';
  const badge = page.status ? ` <span class="dev-index-status">${esc(page.status)}</span>` : '';
  return `<li>${temporary}<a href="${href}">${esc(page.title)}</a>${badge}</li>`;
}

function renderNode(n, depth = 0) {
  const pages = [...n.pages].sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, 'ru'));
  const children = [...n.children.values()].sort((a, b) => a.name.localeCompare(b.name, 'ru'));
  const body = [
    pages.length ? `<ul>${pages.map(pageHtml).join('')}</ul>` : '',
    ...children.map((child) => renderNode(child, depth + 1)),
  ].join('');

  if (!n.name) return body;
  return `<section class="dev-index-group" style="--dev-depth:${Math.max(0, depth - 1)}"><div class="dev-index-heading">${esc(n.name)}</div>${body}</section>`;
}

function injectDocumentTitle(page) {
  const target = page.file || path.join(pagesDir, page.slug + '.html');
  const source = fs.readFileSync(target, 'utf8');
  const browserTitle = (page.titleFinal ? '' : '⏳ ') + page.title + ' | MagazinOT DEV';
  const script = '<script data-dev-document-title>document.title=' + JSON.stringify(browserTitle) + ';</script>';

  if (source.includes('data-dev-document-title')) return;

  const lower = source.toLowerCase();
  const bodyClose = lower.lastIndexOf('</body>');
  if (bodyClose >= 0) {
    fs.writeFileSync(target, source.slice(0, bodyClose) + script + '\n' + source.slice(bodyClose), 'utf8');
  } else {
    fs.writeFileSync(target, source + '\n' + script + '\n', 'utf8');
  }
}

for (const file of walk(pagesDir)) {
  if (path.resolve(file) === path.resolve(outputFile)) continue;
  const page = pageInfo(file);
  page.file = file;
  injectDocumentTitle(page);
}

const html = `<!-- Служебная страница-хаб. Намеренно без общей HTML-обёртки. -->
<style>
#dev-index-gpt{max-width:980px;margin:0 auto;padding:8px 0 24px;font-family:Arial,sans-serif;color:#222}
#dev-index-gpt .dev-index-group{margin:18px 0 0;padding-left:calc(var(--dev-depth) * 22px)}
#dev-index-gpt .dev-index-heading{font-size:20px;font-weight:700;margin:0 0 8px}
#dev-index-gpt .dev-index-group .dev-index-group .dev-index-heading{font-size:17px}
#dev-index-gpt ul{margin:0;padding:0 0 0 22px}
#dev-index-gpt li{margin:7px 0;line-height:1.4}
#dev-index-gpt a{color:#185abc;text-decoration:none}
#dev-index-gpt a:hover{text-decoration:underline}
#dev-index-gpt .dev-index-status{font-size:12px;color:#777}
#dev-index-gpt .dev-index-temp{font-size:13px}
@media(max-width:640px){#dev-index-gpt .dev-index-group{padding-left:calc(var(--dev-depth) * 12px)}}
</style>
<div id="dev-index-gpt">
${renderNode(root)}
</div>
<script data-dev-document-title>document.title='DEV-каталог MagazinOT';</script>
`;

fs.writeFileSync(outputFile, html, 'utf8');
console.log(`Generated ${path.relative(process.cwd(), outputFile)}`);
