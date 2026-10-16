import fs from 'node:fs';
import { chromium } from 'playwright';

const html = fs.readFileSync('pages/ui-kit.html', 'utf8');
const css = fs.readFileSync('magazinot_gen.css', 'utf8');
const data=JSON.parse(fs.readFileSync('site-assets/data/ui-kit-marker-demo.json','utf8'));
data.categories[0].items[0].code='1021'; // Exercise the existing W16 hazard mapping in the browser.
const fixture=JSON.stringify(data);
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
      if (/^\/assets\/icons\/hazards\/w[0-9]{2}\.svg$/.test(url.pathname)) {
        const filename='site-assets/icons/hazards/'+url.pathname.split('/').pop();
        return route.fulfill({status:200,contentType:'image/svg+xml',body:fs.readFileSync(filename)});
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
    if(width<=700){
      const mobileCatalog=page.locator('[data-source="/assets/data/ui-kit-marker-demo.json"]').locator('xpath=ancestor::section[@data-ui-mobile-section]');
      await mobileCatalog.locator('h2 button').click();
    }
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
    const firstRow = page.locator('[data-source="/assets/data/ui-kit-marker-demo.json"] tbody tr').first();
    if (width > 700) {
      const rows=page.locator('[data-source="/assets/data/ui-kit-marker-demo.json"] tbody tr');
      const positions=await rows.evaluateAll(elements=>elements.map(row=>({
        inset:Math.round(row.cells[0].getBoundingClientRect().left),
        content:Math.round(row.cells[0].firstElementChild?.getBoundingClientRect().left||0),
        height:Math.round(row.getBoundingClientRect().height)
      })));
      const headingLeft=await page.locator('[data-source="/assets/data/ui-kit-marker-demo.json"] thead tr:first-child th:first-child').evaluate(el=>Math.round(el.getBoundingClientRect().left+parseFloat(getComputedStyle(el).paddingLeft)));
      if(Math.abs(headingLeft-positions[0].content)>2)
        throw new Error('Marker column header and labels not aligned: header '+headingLeft+', labels '+positions[0].content);
      if(new Set(positions.map(p=>p.content)).size!==1)
        throw new Error('Marker labels are not aligned: '+JSON.stringify(positions));
      if(new Set(positions.map(p=>p.height)).size!==1)
        throw new Error('Marker rows are not equal height: '+JSON.stringify(positions));
    } else {
      const sections=page.locator('[data-ui-mobile-section]');
      const toggle=sections.first().locator('h2 button');
      if(await toggle.getAttribute('aria-expanded')!=='false')
        throw new Error('Mobile UI Kit sections must start collapsed');
      await toggle.click();
      if(await toggle.getAttribute('aria-expanded')!=='true')
        throw new Error('Mobile UI Kit section did not open');
      const catalogSection=page.locator('[data-source="/assets/data/ui-kit-marker-demo.json"]').locator('xpath=ancestor::section[@data-ui-mobile-section]');

      const mobileItems=catalogSection.locator('.ui-marker-catalog__mobile details');
      if(await mobileItems.count()!==6)
        throw new Error('Expected six mobile accordion entries');
      await mobileItems.first().locator('summary').click();
      if(!(await mobileItems.first().evaluate(el=>el.open)))
        throw new Error('Mobile marker details do not expand');
    }
    const sizes=await page.locator('[data-source="/assets/data/ui-kit-marker-demo.json"] thead small').allTextContents();
    if(sizes.some(x=>x.includes('?')||!x.includes('×')))
      throw new Error('Marker dimensions must always use ×, not ?');
    if (width <= 700) {
      const stepSection=page.locator('[data-ui-stepper]').first().locator('xpath=ancestor::section[@data-ui-mobile-section]');
      await stepSection.locator('h2 button').click();
    }
    const dialogSection=page.locator('[data-ui-info-dialog]').first().locator('xpath=ancestor::section[@data-ui-mobile-section]');
    if(width<=700)await dialogSection.locator('h2 button').click();
    const dialogDemo=dialogSection.locator('[data-ui-info-dialog]').first();
    await dialogDemo.locator('[data-info-open]').click();
    const infoDialog=dialogDemo.locator('dialog');
    if(!(await infoDialog.evaluate(el=>el.open)))throw new Error('Information popup did not open');
    const dialogHeight=await infoDialog.evaluate(el=>el.getBoundingClientRect().height);
    if(dialogHeight>900)throw new Error('Information popup exceeds screen height: '+dialogHeight);
    const contentMetrics=await infoDialog.locator('.ui-info-dialog__body').evaluate(el=>({scroll:el.scrollHeight,visible:el.clientHeight}));
    if(contentMetrics.scroll<=contentMetrics.visible)throw new Error('Showcase dialog must demonstrate actual vertical scrolling');
    const figureGap=await infoDialog.locator('.ui-info-dialog__figure').evaluate(el=>parseFloat(getComputedStyle(el).marginBottom));
    if(figureGap<12)throw new Error('Image-to-copy spacing too small');
    await infoDialog.locator('.ui-info-dialog__body').evaluate(el=>{el.scrollTop=el.scrollHeight});
    const scrollPosition=await infoDialog.locator('.ui-info-dialog__body').evaluate(el=>el.scrollTop);
    if(scrollPosition<20)throw new Error('Dialog inner scrolling did not work');

    await infoDialog.getByRole('button',{name:'ОК',exact:true}).click();
    if(await infoDialog.evaluate(el=>el.open))throw new Error('Information popup did not close');
    const legend=page.locator('[data-source="/assets/data/ui-kit-marker-demo.json"] .ui-marker-catalog__legend-item');
    if(await legend.count()!==8)throw new Error('All 8 hazard legend entries must be visible');
    if((await legend.allTextContents()).some(x=>!x.trim()))
      throw new Error('Each hazard icon needs an accessible meaning');
    const imageState=await legend.locator('img').evaluateAll(async images=>{
      await Promise.all(images.map(img=>img.decode().catch(()=>{})));
      return images.map(img=>({src:img.getAttribute('src'),loaded:img.naturalWidth>0}));
    });
    if(imageState.some(item=>!item.loaded))
      throw new Error('Hazard pictogram missing: '+JSON.stringify(imageState));
    if(width>700){
      await tabs.first().click();
      const hazardTrigger=page.locator('[data-source="/assets/data/ui-kit-marker-demo.json"] .ui-marker-catalog__hazard-trigger').first();
    if(await hazardTrigger.count()!==1)throw new Error('Expected a hazard pictogram in test data');
    await hazardTrigger.focus();
    if((await hazardTrigger.getAttribute('aria-label'))!=='Радиоактивные вещества')
      throw new Error('Hazard accessible label was not populated');
    await hazardTrigger.click();
    if(!(await hazardTrigger.locator('xpath=..').evaluate(el=>el.classList.contains('ui-tooltip--open'))))
      throw new Error('Hazard tooltip did not open on click');
    await hazardTrigger.press('Escape');
    if(await hazardTrigger.locator('xpath=..').evaluate(el=>el.classList.contains('ui-tooltip--open')))
      throw new Error('Hazard tooltip not dismissed with Escape');
    }
    const shortHint=page.locator('[data-ui-short-tooltip]').first();
    await shortHint.locator('button').click();
    if(await shortHint.locator('button').getAttribute('aria-expanded')!=='true')
      throw new Error('Short tooltip not opened');
    await shortHint.locator('button').press('Escape');
    if(await shortHint.locator('button').getAttribute('aria-expanded')!=='false')
      throw new Error('Short tooltip not dismissed with Escape');
    const stepper = page.locator('[data-ui-stepper]').first();
    const panels = stepper.locator('[data-step-panel]');
    const previous = stepper.locator('[data-step-prev]');
    const next = stepper.locator('[data-step-next]');
    if (await stepper.locator('[data-step]').count() !== 3) throw new Error('Stepper must show three stages');
    if (await previous.isEnabled()) throw new Error('Previous must be disabled on first stage');
    if (!(await panels.nth(1).isHidden())) throw new Error('Inactive step should be hidden');
    await next.click();
    if (!(await stepper.locator('[data-step]').first().getAttribute('data-step-complete')!==null)) throw new Error('Completed step lacks state');
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
