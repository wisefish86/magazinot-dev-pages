import fs from 'node:fs';
import { chromium } from 'playwright';

const html = fs.readFileSync('pages/ui-kit.html', 'utf8');
const css = fs.readFileSync('magazinot_gen.css', 'utf8');
const js = fs.readFileSync('magazinot_gen.js', 'utf8');
const data=JSON.parse(fs.readFileSync('site-assets/data/ui-kit-marker-demo.json','utf8'));
data.categories[0].items[0].code='1021'; // Exercise the existing W16 hazard mapping in the browser.
const fixture=JSON.stringify(data);
const palette = JSON.parse(fs.readFileSync('site-assets/data/markirovka/medium-colors.json', 'utf8')).categories;
const icons = fs.readFileSync('site-assets/icons/ui-icons.svg','utf8');
const source = '<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>' + css + '</style></head><body>' + html + '<script>' + js + '</script></body></html>';
const browser = await chromium.launch({ headless: true });
try {
  for (const width of [1440, 980, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await page.route('https://ui-kit.test/**', route => {
      const url = new URL(route.request().url());
      if (url.pathname === '/assets/data/ui-kit-marker-demo.json') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: fixture });
      }
      if (/^\/assets\/img\/pipemarkers\/hazards\/w[0-9]{2}-32x30\.png$/.test(url.pathname)) {
        const filename='source-reference/reference/magazinot/pipemarkers/hazards/'+url.pathname.split('/').pop();
        if(fs.existsSync(filename))return route.fulfill({status:200,contentType:'image/png',body:fs.readFileSync(filename)});
        const fallback='site-assets/icons/hazards/'+url.pathname.split('/').pop().replace('-32x30.png','.svg');
        return route.fulfill({status:200,contentType:'image/svg+xml',body:fs.readFileSync(fallback)});
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
      if(await sections.count()===0)throw new Error('Missing mobile UI Kit sections');
      const firstSection=sections.first();
      if(!(await firstSection.isVisible()))throw new Error('Mobile UI Kit section is hidden');
      const catalogSection=page.locator('[data-source="/assets/data/ui-kit-marker-demo.json"]').locator('xpath=ancestor::section[@data-ui-mobile-section]');

      const mobileTable=catalogSection.locator('.ui-marker-catalog__table');
      const mobileLayout=await mobileTable.evaluate(el=>({visible:!!(el.offsetWidth||el.offsetHeight),client:el.clientWidth,scroll:el.scrollWidth}));
      if(!mobileLayout.visible||mobileLayout.scroll<=mobileLayout.client)
        throw new Error('Mobile marker matrix must remain a horizontally scrollable table: '+JSON.stringify(mobileLayout));
      const firstCellPosition=await catalogSection.locator('[data-source="/assets/data/ui-kit-marker-demo.json"] .ui-marker-catalog__matrix tbody td:first-child').first().evaluate(el=>({position:getComputedStyle(el).position,inUiKit:!!el.closest('.ui-kit'),mobile:matchMedia('(max-width:700px)').matches}));
      if(firstCellPosition.position!=='sticky')throw new Error('Mobile marker names and colors must remain visible in a sticky first column; got '+JSON.stringify(firstCellPosition));
      await mobileTable.evaluate(el=>{el.scrollLeft=190;el.dispatchEvent(new Event('scroll'));});
      const stickyState=await mobileTable.evaluate(el=>{
        const cell=el.querySelector('tbody td:first-child');
        const cellRect=cell.getBoundingClientRect();
        const frame=el.getBoundingClientRect();
        return {scroll:el.scrollLeft,scrolled:el.dataset.scrollLeft,offset:cellRect.left-frame.left,shadow:getComputedStyle(cell).boxShadow};
      });
      if(stickyState.scroll<100||stickyState.scrolled!=='true'||Math.abs(stickyState.offset)>12||!stickyState.shadow.includes('rgba'))
        throw new Error('Pinned mobile first column must stay fixed and cast a depth shadow after scroll: '+JSON.stringify(stickyState));
      if(width===390)await mobileTable.screenshot({path:'visual-snapshots/review/ui-kit-matrix-scrolled-390.png'});
      await mobileTable.evaluate(el=>{el.scrollLeft=0;el.dispatchEvent(new Event('scroll'));});

      if(await catalogSection.locator('.ui-marker-catalog__mobile').count())
        throw new Error('Mobile marker accordion must not replace the comparison table');
    }
    const sizes=await page.locator('[data-source="/assets/data/ui-kit-marker-demo.json"] thead small').allTextContents();
    if(sizes.some(x=>x.includes('?')||!x.includes('×')))
      throw new Error('Marker dimensions must always use ×, not ?');
    const mojibake=await page.locator('body').innerText();
    if(/ВОДА(?:\s*\?){2,}|\d\s*\?\s*\d/.test(mojibake))
      throw new Error('Visible marker copy contains broken question-mark symbols');
    const dialogSection=page.locator('[data-ui-info-dialog]').first().locator('xpath=ancestor::section[@data-ui-mobile-section]');
    const dialogDemo=dialogSection.locator('[data-ui-info-dialog]').first();
    await dialogDemo.locator('[data-info-open]').click();
    const infoDialog=dialogDemo.locator('dialog');
    if(!(await infoDialog.evaluate(el=>el.open)))throw new Error('Information popup did not open');
    const closeIcon=infoDialog.locator('[data-info-close] use[href$="#close"]');
    if(await closeIcon.count()!==1)throw new Error('Information popup close control must use the shared close icon');
    const closeAlign=await infoDialog.evaluate(el=>{
      const heading=el.querySelector('.ui-info-dialog__heading h3').getBoundingClientRect();
      const close=el.querySelector('.ui-info-dialog__close').getBoundingClientRect();
      return Math.abs((heading.top+heading.bottom)/2-(close.top+close.bottom)/2);
    });
    if(closeAlign>7)throw new Error('Information dialog close must align with title center; deviation '+closeAlign);
    const glyphs=await infoDialog.locator('.ui-dimension-times').evaluateAll(els=>els.map(el=>getComputedStyle(el,'::before').content));
    if(glyphs.length!==3||glyphs.some(value=>!value.includes('×')))throw new Error('Dimensions must render visible CSS ×, not ?: '+JSON.stringify(glyphs));
    const dialogCopy=await infoDialog.innerText();
    if(/\d+\?\d+ мм/.test(dialogCopy))throw new Error('Broken dimensions in dialog');
    if(!dialogCopy.includes('→ → →')||/ВОДА(?:\s*\?){2,}/.test(dialogCopy))throw new Error('Information popup arrows must render correctly: '+dialogCopy);
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
    const visibleTable=page.locator('.ui-table:visible').first();
    const tableGrid=await visibleTable.locator('thead th').first().evaluate(el=>({
      header:getComputedStyle(el).backgroundColor,
      right:getComputedStyle(el).borderRightWidth,
      bottom:getComputedStyle(el).borderBottomWidth
    }));
    if(tableGrid.header!=='rgb(237, 242, 244)'||tableGrid.right==='0px'||tableGrid.bottom==='0px')
      throw new Error('Tables must share the Data table header and visible internal grid: '+JSON.stringify(tableGrid));
    const tableStyleVariants=await page.locator('.ui-table thead th, .doc-table--headed tbody tr:first-child th').evaluateAll(cells=>[...new Set(cells.filter(el=>el.offsetParent!==null).map(el=>{
      const style=getComputedStyle(el);
      const borderColors=[style.borderRightWidth!=='0px'&&style.borderRightColor,style.borderBottomWidth!=='0px'&&style.borderBottomColor].filter(Boolean);
      return [style.backgroundColor,...new Set(borderColors)].join('|');
    }))]);
    if(tableStyleVariants.length!==1)throw new Error('Every table header must share one fill and one grid color: '+JSON.stringify(tableStyleVariants));
    const tableRows=visibleTable.locator('tbody tr');
    if(await tableRows.count()>1){
      const stripes=await tableRows.evaluateAll(rows=>rows.slice(0,2).map(row=>getComputedStyle(row.cells[row.cells.length-1]).backgroundColor));
      if(stripes[0]===stripes[1])throw new Error('Table rows must use one shared zebra stripe treatment');
      if(width>700){
        await tableRows.nth(1).hover();
        const hover=await tableRows.nth(1).locator('td').last().evaluate(el=>getComputedStyle(el).backgroundColor);
        if(hover===stripes[1])throw new Error('Table row hover must be stronger than the zebra stripe');
      }
    }
    const carousel=page.locator('[data-ui-carousel]').first();
    const fade=await carousel.evaluate(el=>({right:el.dataset.scrollRight,opacity:getComputedStyle(el,'::after').opacity,width:parseFloat(getComputedStyle(el,'::after').width)}));
    if(fade.right==='true'&&(fade.opacity!=='1'||fade.width<50))
      throw new Error('Carousel right edge must fade smoothly while more cards remain: '+JSON.stringify(fade));
    if(fade.right==='true'&&await carousel.evaluate(el=>getComputedStyle(el,'::after').display==='none'))
      throw new Error('Carousel fade is hidden by a later CSS override');
    const mediaHero=page.locator('.ui-hero--media').first();
    const mediaJoin=await mediaHero.evaluate(el=>{
      const media=el.querySelector('.ui-hero__media');
      const root=getComputedStyle(el),image=getComputedStyle(media);
      return {gap:root.gap,padding:root.padding,borderLeft:image.borderLeftWidth,borderTop:image.borderTopWidth};
    });
    if(mediaJoin.gap!=='0px'||mediaJoin.padding!=='0px')throw new Error('Media hero image must join the card without an outer gap: '+JSON.stringify(mediaJoin));
    if(width>760&&mediaJoin.borderLeft==='0px')throw new Error('Desktop media hero needs one internal divider');
    if(width<=700&&mediaJoin.borderTop==='0px')throw new Error('Mobile media hero needs one internal divider');
    const downloadLinks=page.locator('.ui-download-menu__panel').first().locator('.ui-download-menu__link');
    if(await downloadLinks.count()>1){
      const divider=await downloadLinks.first().evaluate(el=>getComputedStyle(el).borderBottomWidth);
      if(divider!=='0px')throw new Error('Download menu must use spacing and hover without dividers');
    }
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
      if((await hazardTrigger.getAttribute('aria-label'))!=='Радиоактивные вещества')
        throw new Error('Hazard accessible label was not populated');
      await hazardTrigger.focus();
      const portal=page.locator('body > .ui-marker-catalog__tooltip-portal');
      await portal.waitFor({state:'visible',timeout:2000});
      if(await portal.count()!==1)throw new Error('Hazard tooltip must escape the table');
      const bounds=await portal.evaluate(el=>({left:el.getBoundingClientRect().left,right:el.getBoundingClientRect().right,width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height}));
      if(bounds.width<150||bounds.height>90||bounds.left<0||bounds.right>width)
        throw new Error('Hazard tooltip is clipped or unreadable: '+JSON.stringify(bounds));
      await hazardTrigger.press('Escape');
      if(await portal.count())throw new Error('Hazard tooltip not dismissed with Escape');
    }
    const portfolio=page.locator('.ui-gallery--portfolio').first();
    await portfolio.locator('img').first().click();
    const lightbox=page.locator('.doc-lightbox.is-open.has-gallery');
    if(await lightbox.count()!==1)throw new Error('Portfolio gallery lightbox must open with navigation and thumbnails');
    if(await lightbox.locator('.doc-lightbox__thumb').count()!==4)throw new Error('Portfolio lightbox must show four thumbnails');
    await lightbox.locator('.doc-lightbox__next').click();
    if(!(await lightbox.locator('.doc-lightbox__caption').innerText()).startsWith('2 / 4'))
      throw new Error('Portfolio gallery next arrow did not navigate to second image');
    await lightbox.locator('.doc-lightbox__thumb').nth(3).click();
    if(!(await lightbox.locator('.doc-lightbox__caption').innerText()).startsWith('4 / 4'))
      throw new Error('Portfolio thumbnail navigation failed');
    await lightbox.locator('.doc-lightbox__close').click();
    if(await page.locator('.doc-lightbox.is-open').count())throw new Error('Gallery lightbox failed to close');
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
    const completedMark=await stepper.locator('[data-step]').first().locator('.ui-stepper__number').evaluate(el=>{
      const icon=getComputedStyle(el,'::before');return {content:icon.content,border:icon.borderRightWidth,transform:icon.transform};
    });
    if(completedMark.content==='none'||completedMark.border==='0px'||completedMark.transform==='none')
      throw new Error('Completed step must use a CSS drawn check, not a recoded glyph: '+JSON.stringify(completedMark));
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
