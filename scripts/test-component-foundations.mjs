import fs from 'node:fs';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const css=fs.readFileSync('magazinot_gen.css','utf8').replace(/@import[^;]+;/g,'');
const browser=await chromium.launch({headless:true});
try{
  const page=await browser.newPage({viewport:{width:1200,height:900},reducedMotion:'reduce'});
  await page.route('**/*',route=>route.abort());
  const frame='.mot-card,.mot-feature-card,.mot-stat-card,.mot-product-card,.mot-testimonial';
  for(const kit of [false,true]){
    await page.setContent(`<!doctype html><html><head><style>${css}</style></head><body>
      <main class="mk-ui${kit?' mot-kit':''}">
        <article class="mot-card"><div class="mot-card__icon"></div><p>Card</p></article>
        <article class="mot-feature-card"><div class="mot-feature-card__icon"></div><p>Feature</p></article>
        <article class="mot-stat-card">Stat</article>
        <article class="mot-product-card">Product</article>
        <article class="mot-testimonial">Testimonial</article>
        <div class="mot-field"><input class="mot-input"><textarea class="mot-textarea"></textarea></div>
        <div class="mot-selectbox"><button class="mot-selectbox__button">Select</button><ul class="mot-selectbox__list" hidden></ul></div>
        <button class="mot-icon-btn">Icon</button>
        <button class="mot-btn mot-btn--primary">Action</button>
      </main></body></html>`);
    await page.addStyleTag({content:'*,*::before,*::after{transition:none!important;animation:none!important}'});
    const defaults=await page.locator(frame).evaluateAll(elements=>elements.map(el=>{
      const style=getComputedStyle(el);
      return {border:style.borderTopWidth,radius:style.borderTopLeftRadius,background:style.backgroundColor};
    }));
    for(const [index,value] of defaults.entries()){
      assert.equal(value.border,'1px');assert.equal(value.radius,'16px');
      assert.equal(value.background,index===4?'rgb(250, 246, 242)':'rgb(255, 255, 255)');
    }
    // State tokens must be available on ordinary .mk-ui pages, not just the gallery.
    for(const [state,color] of [['is-error','rgb(168, 79, 79)'],['is-success','rgb(63, 118, 93)']]){
      await page.locator('.mot-field').evaluate((el,state)=>el.classList.add(state),state);
      assert.equal(await page.locator('.mot-input').evaluate(el=>getComputedStyle(el).borderTopColor),color);
      await page.locator('.mot-field').evaluate((el,state)=>el.classList.remove(state),state);
    }
    await page.keyboard.press('Tab');
    for(const [selector,opacity] of [['.mot-input','0.12'],['.mot-textarea','0.12'],['.mot-selectbox__button','0.11']]){
      await page.locator(selector).focus();
      const shadow=await page.locator(selector).evaluate(el=>getComputedStyle(el).boxShadow);
      assert.ok(shadow.includes(opacity)&&shadow.includes('3px'),selector+': wrong focus ring '+shadow);
    }
    await page.locator('.mot-selectbox').evaluate(el=>el.classList.add('is-open'));
    assert.ok((await page.locator('.mot-selectbox__button').evaluate(el=>getComputedStyle(el).boxShadow)).includes('0.08'));

    // A family token must update every participant, including connected control parts.
    await page.locator('.mk-ui').evaluate(root=>{
      const tokens={'--mot-card-border':'2px solid rgb(30,60,90)','--mot-card-radius':'21px',
        '--mot-card-surface':'rgb(240,242,244)','--c-warm-soft':'rgb(246,239,232)',
        '--mot-card-icon-size':'52px','--mot-control-radius':'19px',
        '--mot-field-border':'2px solid rgb(20,40,60)','--mot-field-surface':'rgb(248,249,250)',
        '--mot-field-focus-color':'40,80,120',
        '--mot-focus-outline':'3px solid rgb(150,80,40)'};
      for(const [name,value] of Object.entries(tokens))root.style.setProperty(name,value);
    });
    const themed=await page.locator(frame).evaluateAll(elements=>elements.map(el=>{
      const style=getComputedStyle(el);
      return {border:style.borderTopWidth,color:style.borderTopColor,radius:style.borderTopLeftRadius,background:style.backgroundColor};
    }));
    for(const [index,value] of themed.entries()){
      assert.equal(value.border,'2px');assert.equal(value.color,'rgb(30, 60, 90)');assert.equal(value.radius,'21px');
      assert.equal(value.background,index===4?'rgb(246, 239, 232)':'rgb(240, 242, 244)');
    }
    for(const selector of ['.mot-card__icon','.mot-feature-card__icon']){
      assert.equal(await page.locator(selector).evaluate(el=>getComputedStyle(el).width),'52px');
    }
    assert.ok((await page.locator('.mot-feature-card').evaluate(el=>getComputedStyle(el).gridTemplateColumns)).startsWith('52px'));
    for(const selector of ['.mot-input','.mot-textarea','.mot-selectbox__button']){
      const style=await page.locator(selector).evaluate(el=>{const s=getComputedStyle(el);return [s.borderTopWidth,s.borderTopLeftRadius,s.backgroundColor];});
      assert.deepEqual(style,['2px','19px','rgb(248, 249, 250)']);
    }
    const corners=await page.locator('.mot-selectbox__list').evaluate(el=>{const s=getComputedStyle(el);return [s.borderTopLeftRadius,s.borderBottomLeftRadius];});
    assert.deepEqual(corners,['0px','19px']);
    assert.equal(await page.locator('.mot-selectbox__button').evaluate(el=>getComputedStyle(el).borderBottomLeftRadius),'0px');
    assert.equal(await page.locator('.mot-icon-btn').evaluate(el=>getComputedStyle(el).borderTopLeftRadius),'19px');
    for(const selector of ['.mot-input','.mot-selectbox__button']){
      await page.locator(selector).focus();
      assert.match(await page.locator(selector).evaluate(el=>getComputedStyle(el).boxShadow),/rgba\(40,\s*80,\s*120,/);
    }
    for(const selector of ['.mot-icon-btn','.mot-btn']){
      await page.locator(selector).focus();
      assert.deepEqual(await page.locator(selector).evaluate(el=>{const s=getComputedStyle(el);return [s.outlineWidth,s.outlineColor];}),['3px','rgb(150, 80, 40)']);
    }
  }
  console.log('Shared card/field foundations, focus states and theme overrides verified with and without UI Kit.');
}finally{await browser.close();}
