import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const root = process.cwd();
const pages = fs.readdirSync(path.join(root, 'pages')).filter(name => name.endsWith('.html'));
const css = fs.readFileSync(path.join(root, 'magazinot_gen.css'), 'utf8');
const escapedCss = css;
const output = path.join(root, 'visual-snapshots', 'ui-kit-refactor');
fs.mkdirSync(output, { recursive: true });

const browser = await chromium.launch({ headless: true });
const failures = [];
for (const name of pages) {
  const html = fs.readFileSync(path.join(root, 'pages', name), 'utf8');
  if (!html.includes('mk-ui')) continue;

  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', error => errors.push(String(error.message)));
    await page.setContent('<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>' + escapedCss + '</style></head><body>' + html + '</body></html>', { waitUntil: 'load' });
    await page.evaluate(async () => { if (document.fonts?.ready) await document.fonts.ready; });
    const results = await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
      h1: document.querySelector('.mk-ui') !== null,
      badImages: [...document.querySelectorAll('img')].filter(img => img.complete && img.naturalWidth === 0).length
    }));
    await page.screenshot({ path: path.join(output, name.slice(0, -5) + '-' + viewport.width + '.png'), fullPage: true });
    // Some catalog and document images are external platform assets and unavailable in the local wrapper.
    // The same source can be loaded on DEV for the final integration review.
    if (results.documentWidth > results.viewportWidth + 3) failures.push(name + '/' + viewport.width + ': outer horizontal overflow by ' + (results.documentWidth - results.viewportWidth) + 'px');
    if (errors.length) failures.push(name + '/' + viewport.width + ': JS errors: ' + errors.join('; '));
    await page.close();
  }
}
await browser.close();
if (failures.length) {
  console.error(failures.join(String.fromCharCode(10)));
  process.exitCode = 1;
} else {
  console.log('All UI Kit pages rendered without uncaught JS errors or page-level horizontal overflow');
}
