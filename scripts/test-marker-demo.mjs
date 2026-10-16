import fs from 'node:fs';
import { chromium } from 'playwright';

const html = fs.readFileSync('pages/ui-kit.html', 'utf8');
const css = fs.readFileSync('magazinot_gen.css', 'utf8');
const fixture = fs.readFileSync('site-assets/data/ui-kit-marker-demo.json', 'utf8');
const palette = JSON.parse(fs.readFileSync('site-assets/data/markirovka/medium-colors.json', 'utf8')).categories;
const icons = fs.readFileSync('site-assets/icons/ui-icons.svg','utf8');
const source = '<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>' + css + '</style></head><body>' + html + '</body></html>';
const browser = await chromium.launch({ headless: true });
try {
  for (const width of [1440, 980, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await page.route('https://ui-kit.test/**', route => {
      const url = new URL(route.request().url());
      if (url.pathname === '/assets/data/ui-kit-marker-demo.json') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: fixture });
      }
      if (url.pathname === '/assets/icons/ui-icons.svg') {
        return route.fulfill({ status: 200, contentType: 'image/svg+xml', body: icons });
      }
      if (url.pathname === '/') {
        return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: source });
      }
      return route.fulfill({ status: 404, body: '' });
    });
    await page.goto('https://ui-kit.test/', { waitUntil: 'domcontentloaded' });
    const tabs = page.locator('[data-source="/assets/data/ui-kit-marker-demo.json"] [role="tab"]');
    await tabs.first().waitFor({ state: 'visible', timeout: 10000 });
    if (await tabs.count() !== 3) throw new Error('Expected exactly 3 tabs at width ' + width);
    const names = await tabs.allTextContents();
    if (names.map(x => x.trim()).join('|') !== 'ВОДА|ПАР|ВОЗДУХ') throw new Error('Unexpected tab names: ' + names);
    for (let i = 0; i < 3; i++) {
      await tabs.nth(i).click();
      const selected = await tabs.nth(i).getAttribute('aria-selected');
      if (selected !== 'true') throw new Error('Tab not selected: ' + i);
      const id = ['water','steam','air'][i];
      const background = await page.locator('[data-source="/assets/data/ui-kit-marker-demo.json"]').evaluate(el => el.style.getPropertyValue('--marker-color'));
      if (background !== palette[id].background) throw new Error('Palette mismatch for ' + id + ' at ' + width + ': ' + background);

      const rows = await page.locator('[data-source="/assets/data/ui-kit-marker-demo.json"] [data-marker-body] tr').count();
      if (rows !== 6) throw new Error('Expected 6 rows in tab ' + i + ', got ' + rows);
      const count = await page.locator('[data-source="/assets/data/ui-kit-marker-demo.json"] [data-marker-count]').textContent();
      if (count.trim() !== '6 позиций') throw new Error('Incorrect item counter: ' + count);
    }
    const layout = await page.locator('[data-source="/assets/data/ui-kit-marker-demo.json"]').evaluate(root => {
      const wrap = root.querySelector('.ui-marker-catalog__table');
      const table = root.querySelector('.ui-marker-catalog__matrix');
      const cell = root.querySelector('tbody td:nth-child(3)');
      const style = getComputedStyle(cell);
      return {
        wrapperWidth: wrap.clientWidth,
        contentWidth: wrap.scrollWidth,
        cellBorder: style.borderLeftWidth,
        cellAlign: style.verticalAlign,
        tableWidth: table.getBoundingClientRect().width
      };
    });
    if (width >= 980 && layout.contentWidth > layout.wrapperWidth + 2) {
      throw new Error('Desktop catalog is clipped / scrolls horizontally at ' + width + ': ' + JSON.stringify(layout));
    }
    if (layout.cellBorder === '0px' || layout.cellAlign !== 'middle') {
      throw new Error('Missing grid or vertical alignment at ' + width + ': ' + JSON.stringify(layout));
    }
    const stepper = page.locator('[data-ui-stepper]').first();
    const panels = stepper.locator('[data-step-panel]');
    const previous = stepper.locator('[data-step-prev]');
    const next = stepper.locator('[data-step-next]');
    if (await stepper.locator('[data-step]').count() !== 3) throw new Error('Stepper must show three stages');
    if (await previous.isEnabled()) throw new Error('Previous must be disabled on first stage');
    if (!(await panels.nth(1).isHidden())) throw new Error('Inactive step should be hidden');
    await next.click();
    if (!(await panels.nth(1).isVisible()) || (await panels.nth(0).isVisible())) throw new Error('Stepper did not move to second panel');
    await next.click();
    if (!(await panels.nth(2).isVisible()) || (await next.isEnabled())) throw new Error('Stepper final panel error');
    await previous.click();
    if (!(await panels.nth(1).isVisible())) throw new Error('Stepper back navigation broken');
    await page.close();
  }
  console.log('Marker demo, canonical colors and interactive stepper verified at 1440/980/390px');
} finally {
  await browser.close();
}
