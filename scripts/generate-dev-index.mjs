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
    description: meta.description || '',
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
  const badge = page.status ? `<span class="dev-badge">${esc(page.status)}</span>` : '';
  const description = page.description ? `<div class="dev-description">${esc(page.description)}</div>` : '';
  return `<li class="dev-page"><a href="${href}">${esc(page.title)}</a>${badge}${description}</li>`;
}

function renderNode(n, depth = 0) {
  const pages = [...n.pages].sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, 'ru'));
  const children = [...n.children.values()].sort((a, b) => a.name.localeCompare(b.name, 'ru'));
  const body = [
    pages.length ? `<ul class="dev-pages">${pages.map(pageHtml).join('')}</ul>` : '',
    ...children.map((child) => renderNode(child, depth + 1)),
  ].join('');

  if (!n.name) return body;
  const open = depth <= 2 ? ' open' : '';
  return `<details class="dev-group depth-${depth}"${open}><summary>${esc(n.name)}</summary><div class="dev-group-body">${body}</div></details>`;
}

const count = walk(pagesDir).filter((f) => path.resolve(f) !== path.resolve(outputFile)).length;
const generated = new Date().toISOString();

const html = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>DEV-каталог MagazinOT</title>
<style>
:root{font-family:Arial,sans-serif;color:#222;background:#f5f6f8}
*{box-sizing:border-box}
body{margin:0;padding:24px}
.dev-wrap{max-width:1050px;margin:0 auto}
.dev-head{background:#fff;border:1px solid #e3e5e8;border-radius:14px;padding:20px 22px;margin-bottom:16px}
h1{font-size:28px;margin:0 0 8px}
.dev-sub{color:#666;line-height:1.45}
.dev-group{background:#fff;border:1px solid #e3e5e8;border-radius:12px;margin:10px 0;overflow:hidden}
.dev-group .dev-group{margin:10px 0;background:#fafafa}
.dev-group summary{cursor:pointer;font-weight:700;padding:13px 16px;user-select:none}
.dev-group-body{padding:0 14px 12px 26px}
.dev-pages{list-style:none;margin:0;padding:0}
.dev-page{padding:10px 0;border-top:1px solid #eceef1}
.dev-page:first-child{border-top:0}
.dev-page a{font-weight:600;color:#185abc;text-decoration:none}
.dev-page a:hover{text-decoration:underline}
.dev-badge{display:inline-block;margin-left:8px;padding:2px 7px;border-radius:999px;background:#eee;font-size:12px;color:#555;vertical-align:1px}
.dev-description{margin-top:4px;color:#727272;font-size:13px;line-height:1.4}
.dev-foot{margin-top:16px;color:#888;font-size:12px}
@media(max-width:640px){body{padding:12px}.dev-group-body{padding-left:16px}h1{font-size:23px}}
</style>
</head>
<body>
<div class="dev-wrap">
  <div class="dev-head">
    <h1>DEV-каталог MagazinOT</h1>
    <div class="dev-sub">Автоматический хаб по всем HTML-страницам репозитория. Иерархия строится по служебному полю <code>dev-path</code>; количество уровней не ограничено.</div>
  </div>
  ${renderNode(root)}
  <div class="dev-foot">Страниц: ${count}. Каталог пересобран: ${generated}.</div>
</div>
</body>
</html>
`;

fs.writeFileSync(outputFile, html, 'utf8');
console.log(`Generated ${path.relative(process.cwd(), outputFile)} with ${count} pages`);
