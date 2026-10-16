(function(){
  if (window.__magazinotUiInitialized) return;
  window.__magazinotUiInitialized = true;


  function initPageTitle(){
    const root = document.querySelector('.mk-ui[data-ui-page-title]');
    if (!root) return;
    const title = Array.from(document.querySelectorAll('h1')).find(el => el.textContent.trim() === 'dev_preview');
    if (!title) return;
    title.textContent = root.dataset.uiPageTitle;
    title.classList.add('ui-dev-h1');
  }

  function initAccordion(){
    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.querySelectorAll('.ui-accordion details').forEach(details => {
      const summary = details.querySelector('summary');
      if (!summary || details.dataset.uiAccordionReady === '1') return;
      details.dataset.uiAccordionReady = '1';
      let animation = null;
      function finish(open){
        animation = null;
        details.style.height = '';
        details.style.overflow = '';
        if (!open) details.removeAttribute('open');
        details.classList.remove('is-closing');
      }
      function expand(){
        if (animation) animation.cancel();
        details.classList.remove('is-closing');
        const startHeight = details.offsetHeight;
        details.setAttribute('open','');
        const endHeight = details.offsetHeight;
        if (reduceMotion || typeof details.animate !== 'function') return finish(true);
        details.style.height = startHeight + 'px';
        details.style.overflow = 'hidden';
        animation = details.animate({height:[startHeight+'px',endHeight+'px']},{duration:280,easing:'cubic-bezier(.2,.7,.2,1)'});
        animation.onfinish = () => finish(true);
        animation.oncancel = () => { animation = null; };
      }
      function collapse(){
        if (animation) animation.cancel();
        details.classList.add('is-closing');
        const startHeight = details.offsetHeight;
        const endHeight = summary.offsetHeight;
        if (reduceMotion || typeof details.animate !== 'function') return finish(false);
        details.style.height = startHeight + 'px';
        details.style.overflow = 'hidden';
        animation = details.animate({height:[startHeight+'px',endHeight+'px']},{duration:240,easing:'cubic-bezier(.2,.7,.2,1)'});
        animation.onfinish = () => finish(false);
        animation.oncancel = () => { animation = null; };
      }
      summary.addEventListener('click',event => {
        event.preventDefault();
        if (details.open) collapse(); else expand();
      });
    });
  }

  function initTabs(){
    document.querySelectorAll('.ui-tabs').forEach(tabs => {
      if (tabs.dataset.uiTabsReady === '1') return;
      const tablist = tabs.querySelector('[role="tablist"]');
      if (!tablist) return;
      const buttons = Array.from(tablist.querySelectorAll('[role="tab"]'));
      const panels = buttons
        .map(button => document.getElementById(button.getAttribute('aria-controls')))
        .filter(Boolean);
      if (!buttons.length || panels.length !== buttons.length) return;

      tabs.dataset.uiTabsReady = '1';

      function activate(button, moveFocus = false){
        buttons.forEach((item,index) => {
          const selected = item === button;
          item.setAttribute('aria-selected', selected ? 'true' : 'false');
          item.tabIndex = selected ? 0 : -1;
          panels[index].hidden = !selected;
        });
        if (moveFocus) button.focus();
      }

      buttons.forEach((button,index) => {
        button.addEventListener('click',() => activate(button));
        button.addEventListener('keydown',event => {
          let next = null;
          if (event.key === 'ArrowRight') next = buttons[(index + 1) % buttons.length];
          if (event.key === 'ArrowLeft') next = buttons[(index - 1 + buttons.length) % buttons.length];
          if (event.key === 'Home') next = buttons[0];
          if (event.key === 'End') next = buttons[buttons.length - 1];
          if (!next) return;
          event.preventDefault();
          activate(next,true);
        });
      });

      activate(buttons.find(button => button.getAttribute('aria-selected') === 'true') || buttons[0]);
    });
  }


  function initLegacyActions(){
    if (document.documentElement.dataset.uiLegacyActionsReady === '1') return;
    document.documentElement.dataset.uiLegacyActionsReady = '1';
    document.addEventListener('click',event => {
      const unavailableCard = event.target.closest('a.ui-media-card--coming-soon');
      if (unavailableCard) {
        event.preventDefault();
        return;
      }
      const priceLink=event.target.closest('[data-ui-price-download]');
      if(priceLink){
        event.preventDefault();
        const category=Number(priceLink.dataset.uiPriceDownload);
        if(Number.isSafeInteger(category)&&category>0&&typeof window.download_price==='function'){
          window.download_price(priceLink,category);
        }
        return;
      }
      const link = event.target.closest('[data-ui-email-order]');
      if (!link || typeof window.uh_pages !== 'function') return;
      event.preventDefault();
      window.uh_pages(link);
    });
  }

  function initCarousels(){
    document.querySelectorAll('[data-ui-carousel]').forEach(carousel => {
      if (carousel.dataset.uiCarouselReady === '1') return;
      const viewport = carousel.querySelector('.ui-carousel__viewport');
      const track = carousel.querySelector('.ui-carousel__track');
      const prev = carousel.querySelector('[data-ui-carousel-prev]');
      const next = carousel.querySelector('[data-ui-carousel-next]');
      if (!viewport || !track || !prev || !next) return;
      carousel.dataset.uiCarouselReady = '1';

      function step(){
        const item = track.querySelector('.ui-carousel__item');
        if (!item) return Math.max(240, viewport.clientWidth * .8);
        const styles = getComputedStyle(track);
        const gap = parseFloat(styles.columnGap || styles.gap || '0') || 0;
        return item.getBoundingClientRect().width + gap;
      }

      function update(){
        const max = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
        prev.disabled = viewport.scrollLeft <= 2;
        next.disabled = viewport.scrollLeft >= max - 2;
        carousel.classList.toggle('is-static', max <= 2);
      }

      prev.addEventListener('click',() => viewport.scrollBy({left:-step(),behavior:'smooth'}));
      next.addEventListener('click',() => viewport.scrollBy({left:step(),behavior:'smooth'}));
      viewport.addEventListener('scroll',update,{passive:true});
      window.addEventListener('resize',update);
      requestAnimationFrame(update);
    });
  }

  function initDialogs(){
    document.querySelectorAll('[data-ui-dialog-open]').forEach(button => {
      if (button.dataset.uiDialogReady === '1') return;
      button.dataset.uiDialogReady = '1';
      const id = button.getAttribute('data-ui-dialog-open');
      const dialog = id ? document.getElementById(id) : null;
      if (!dialog || typeof dialog.showModal !== 'function') return;
      button.addEventListener('click',() => dialog.showModal());
    });

    document.querySelectorAll('.ui-dialog').forEach(dialog => {
      if (dialog.dataset.uiDialogReady === '1') return;
      dialog.dataset.uiDialogReady = '1';
      dialog.addEventListener('click',event => {
        if (event.target.closest('[data-ui-dialog-close]')) dialog.close();
      });
      dialog.addEventListener('click',event => {
        if (event.target !== dialog) return;
        const rect = dialog.getBoundingClientRect();
        const inside = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
        if (!inside) dialog.close();
      });
    });
  }

  function initPopovers(){
    document.querySelectorAll('[data-ui-popover]').forEach(popover => {
      if (popover.dataset.uiPopoverReady === '1') return;
      const toggle = popover.querySelector('[data-ui-popover-toggle]');
      const panel = popover.querySelector('.ui-popover__panel');
      if (!toggle || !panel) return;
      popover.dataset.uiPopoverReady = '1';

      function setOpen(open){
        panel.hidden = !open;
        toggle.setAttribute('aria-expanded',open ? 'true' : 'false');
        if(!open)return;
        const rect=toggle.getBoundingClientRect();
        const width=Math.min(320,window.innerWidth-24);
        const topPreferred=rect.bottom+10;
        panel.style.width=width+'px';
        panel.style.left=Math.max(12,Math.min(rect.left,window.innerWidth-width-12))+'px';
        panel.style.top=topPreferred+'px';
        const height=panel.getBoundingClientRect().height;
        if(topPreferred+height>window.innerHeight-12 && rect.top>=height+10){
          panel.style.top=(rect.top-height-10)+'px';
        }
      }
      window.addEventListener('resize',()=>{if(!panel.hidden)setOpen(true)},{passive:true});
      window.addEventListener('scroll',()=>{if(!panel.hidden)setOpen(false)},{passive:true});

      toggle.addEventListener('click',event => {
        event.stopPropagation();
        setOpen(panel.hidden);
      });

      document.addEventListener('click',event => {
        if (!popover.contains(event.target)) setOpen(false);
      });

      document.addEventListener('keydown',event => {
        if (event.key === 'Escape' && !panel.hidden) {
          setOpen(false);
          toggle.focus();
        }
      });
    });
  }


  function initSelectboxes(){
    document.querySelectorAll('[data-ui-selectbox]').forEach(selectbox => {
      if (selectbox.dataset.uiSelectboxReady === '1') return;
      const button = selectbox.querySelector('.ui-selectbox__button');
      const list = selectbox.querySelector('.ui-selectbox__list');
      const value = selectbox.querySelector('[data-ui-selectbox-value]');
      const input = selectbox.querySelector('[data-ui-selectbox-input]');
      const options = Array.from(selectbox.querySelectorAll('.ui-selectbox__option'));
      if (!button || !list || !value || !options.length) return;
      selectbox.dataset.uiSelectboxReady = '1';

      function setOpen(open){
        selectbox.classList.toggle('is-open',open);
        list.hidden = !open;
        button.setAttribute('aria-expanded',open ? 'true' : 'false');
        if (open) {
          const selected = options.find(item => item.getAttribute('aria-selected') === 'true') || options[0];
          options.forEach(item => item.classList.toggle('is-active',item === selected));
        }
      }

      function selectOption(option,focusButton=true){
        options.forEach(item => {
          const selected = item === option;
          item.setAttribute('aria-selected',selected ? 'true' : 'false');
          item.classList.toggle('is-active',selected);
        });
        value.textContent = option.textContent.trim();
        if (input) {
          input.value = option.dataset.value || option.textContent.trim();
          input.dispatchEvent(new Event('change',{bubbles:true}));
        }
        setOpen(false);
        if (focusButton) button.focus();
      }

      function move(delta){
        const current = options.findIndex(item => item.classList.contains('is-active'));
        const next = options[(Math.max(0,current) + delta + options.length) % options.length];
        options.forEach(item => item.classList.toggle('is-active',item === next));
        next.scrollIntoView({block:'nearest'});
      }

      button.addEventListener('click',() => setOpen(list.hidden));
      button.addEventListener('keydown',event => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault();
          if (list.hidden) setOpen(true); else move(event.key === 'ArrowDown' ? 1 : -1);
        }
        if (event.key === 'Enter' || event.key === ' ') {
          if (!list.hidden) {
            event.preventDefault();
            const active = options.find(item => item.classList.contains('is-active'));
            if (active) selectOption(active);
          }
        }
        if (event.key === 'Escape' && !list.hidden) {
          event.preventDefault();
          setOpen(false);
        }
      });
      options.forEach(option => {
        option.tabIndex = -1;
        option.addEventListener('click',() => selectOption(option));
        option.addEventListener('mousemove',() => options.forEach(item => item.classList.toggle('is-active',item === option)));
      });
      document.addEventListener('click',event => {
        if (!selectbox.contains(event.target)) setOpen(false);
      });
    });
  }

  function initSegmentedControls(){
    document.querySelectorAll('.ui-segmented').forEach(group => {
      if (group.dataset.uiSegmentedReady === '1') return;
      const buttons = Array.from(group.querySelectorAll('button[aria-pressed]'));
      if (!buttons.length) return;
      group.dataset.uiSegmentedReady = '1';
      buttons.forEach(button => button.addEventListener('click',() => {
        buttons.forEach(item => item.setAttribute('aria-pressed',item === button ? 'true' : 'false'));
      }));
    });
  }

  function initRemovableChips(){
    document.querySelectorAll('.ui-chip--removable').forEach(chip => {
      if (chip.dataset.uiChipReady === '1') return;
      const button = chip.querySelector('.ui-chip__remove');
      if (!button) return;
      chip.dataset.uiChipReady = '1';
      button.addEventListener('click',() => chip.remove());
    });
  }

  function initUploads(){
    document.querySelectorAll('.ui-upload').forEach(upload => {
      if (upload.dataset.uiUploadReady === '1') return;
      const input = upload.querySelector('input[type="file"]');
      if (!input) return;
      upload.dataset.uiUploadReady = '1';

      function setState(files){
        upload.classList.toggle('has-files',!!(files && files.length));
        const meta = upload.querySelector('.ui-upload__meta');
        if (meta && files && files.length) meta.textContent = files.length === 1 ? files[0].name : files.length + ' файлов выбрано';
      }

      input.addEventListener('change',() => setState(input.files));
      ['dragenter','dragover'].forEach(type => upload.addEventListener(type,event => {
        event.preventDefault();
        upload.classList.add('is-dragover');
      }));
      ['dragleave','drop'].forEach(type => upload.addEventListener(type,event => {
        event.preventDefault();
        upload.classList.remove('is-dragover');
      }));
      upload.addEventListener('drop',event => {
        const files = event.dataTransfer && event.dataTransfer.files;
        if (!files || !files.length) return;
        try {
          const transfer = new DataTransfer();
          Array.from(files).forEach(file => transfer.items.add(file));
          input.files = transfer.files;
          input.dispatchEvent(new Event('change',{bubbles:true}));
        } catch (_) {
          setState(files);
        }
      });
    });
  }

  function initMobileUiKitSections(){
    if(!window.matchMedia('(max-width:700px)').matches)return;
    document.querySelectorAll('[data-ui-mobile-section]').forEach(section=>{
      const heading=section.querySelector(':scope > h2');
      if(!heading||heading.querySelector('button'))return;
      const text=heading.textContent;
      const button=document.createElement('button');
      button.type='button';
      button.textContent=text;
      button.setAttribute('aria-expanded','false');
      heading.replaceChildren(button);
      const content=document.createElement('div');
      content.className='ui-kit__mobile-section-body';
      while(heading.nextSibling)content.appendChild(heading.nextSibling);
      section.appendChild(content);
      button.addEventListener('click',()=>{
        const opened=section.toggleAttribute('data-mobile-open');
        button.setAttribute('aria-expanded',String(opened));
      });
    });
  }
  function initMarkerCatalogs(){
    document.querySelectorAll('[data-ui-marker-catalog]').forEach(catalog => {
      if (catalog.dataset.readyMarkerCatalog) return;
      const tabs = catalog.querySelector('[data-marker-tabs]');
      const intro = catalog.querySelector('[data-marker-intro]');
      const body = catalog.querySelector('[data-marker-body]');
      if (!tabs || !intro || !body) return;
      catalog.dataset.readyMarkerCatalog = '1';
      const matrix = catalog.classList.contains('ui-marker-catalog--matrix') || !!catalog.querySelector('.ui-marker-catalog__matrix');
      const colors = Object.fromEntries(['water','steam','air','gas','acid','alkali','liquid','other'].map(key => {
        const tokens = getComputedStyle(catalog);
        return [key, [tokens.getPropertyValue('--medium-' + key).trim(), tokens.getPropertyValue('--medium-' + key + '-text').trim()]];
      }));
      const names = {water:'ВОДА',steam:'ПАР',air:'ВОЗДУХ',gas:'ГАЗЫ',acid:'КИСЛОТЫ',alkali:'ЩЕЛОЧИ',liquid:'ЖИДКОСТИ',other:'ПРОЧИЕ ВЕЩЕСТВА'};
      const safe = value => String(value == null ? '' : value);
      // Sign codes transcribed from the saved competitor HTML (two sign slots per row).
      const hazardMap = {"water":{"1021":"16","1048":"05"},"air":{"3033":"11"},"gas":{"4002":"01","4005":"03","4008":"01","4010":"01","4011":"01","4012":"01","4013":"01,03","4014":"01","4022":"01,18","4023":"03","4025":"01","4028":"11","4030":"01","4032":"03","4033":"01,03","4038":"01","4039":"01","4041":"01","4042":"01","4043":"01","4044":"01,03","4054":"03,04","4055":"03,04","4057":"03","4058":"01,18","4059":"04","4060":"01","4061":"03","4062":"01","4066":"01","4067":"01"},"acid":{"5002":"04,11","5003":"04","5004":"01,03","5005":"18","5006":"04","5008":"04","5011":"03","5013":"18","5014":"04","5015":"04","5016":"04","5017":"04,03","5019":"04","5020":"04","5021":"04","5022":"04","5023":"04","5024":"01,03","5025":"03","5026":"04","5028":"04","5029":"04","5030":"04","5031":"18","5032":"18","5033":"04,11","5034":"04","5035":"04","5036":"03","5037":"18"},"alkali":{"6002":"04","6003":"03","6004":"04","6005":"03","6006":"18","6007":"04","6008":"04,18","6009":"04","6010":"04","6011":"04","6012":"04","6013":"04","6014":"01,18","6016":"04","6017":"04","6018":"03,11","6020":"01,18"},"liquid":{"7002":"01,03","7003":"03","7004":"01,18","7005":"01","7006":"01,03","7007":"18","7009":"01,03","7011":"01,18","7012":"18","7014":"01","7015":"01,18","7021":"01","7023":"01","7025":"18","7029":"01","7030":"01,03","7036":"03","7037":"01,18","7043":"01","7044":"01","7045":"04,11","7046":"01","7048":"01","7052":"01,03","7059":"18","7060":"01,18","7062":"18","7063":"18","7065":"03","7074":"01,18","7075":"01","7076":"18","7079":"01"}};
      // The original PNG files are deployed to /assets/img/pipemarkers/hazards/.
      const mobile=document.createElement('div');
      mobile.className='ui-marker-catalog__mobile';
      mobile.setAttribute('aria-label','Позиции каталога — мобильный список');
      const viewport=catalog.querySelector('.ui-marker-catalog__table');
      if(viewport)viewport.insertAdjacentElement('afterend',mobile);
      function renderCategory(category){
        const [color,ink] = colors[category.id] || [category.color || '#287c84',category.textColor || '#fff'];
        catalog.style.setProperty('--marker-color',color);
        catalog.style.setProperty('--marker-text',ink);
        catalog.style.setProperty('--marker-soft',color+'18');
        intro.textContent = category.description || '';
        body.replaceChildren();
        // A new category always starts at the first article; avoid retaining scroll from the previous one.
        const tableViewport=catalog.querySelector('.ui-marker-catalog__table');
        if(tableViewport) tableViewport.scrollLeft=0;
        const items = category.items || [];
        items.forEach(item => {
          const tr = document.createElement('tr');
          if (item.highlight || item.alert) tr.classList.add('ui-marker-catalog__row--warning');
          const label = document.createElement('td');
          if (safe(item.name).trim()) {
            const chip=document.createElement('span');
            chip.className='ui-marker-catalog__label'+(item.highlight || item.alert ? ' ui-marker-catalog__label--warning' : '');
            chip.textContent=safe(item.name);
            label.appendChild(chip);
          } else {
            const blank=document.createElement('span');
            blank.className='ui-marker-catalog__blank';
            blank.setAttribute('aria-label','Пустой маркер без надписи');
            label.appendChild(blank);
            const info=document.createElement('span');
            info.className='ui-marker-catalog__info ui-tooltip';
            const trigger=document.createElement('button');
            trigger.type='button';
            trigger.className='ui-marker-catalog__info-trigger';
            trigger.setAttribute('aria-label','Что означает пустой маркер?');
            trigger.innerHTML='<svg class="ui-icon" aria-hidden="true"><use href="/assets/icons/ui-icons.svg#info"></use></svg>';
            const hint=document.createElement('span');
            hint.className='ui-tooltip__bubble';
            hint.setAttribute('role','tooltip');
            hint.textContent='Пустой маркер — надпись можно нанести самостоятельно.';
            info.append(trigger,hint);
            label.appendChild(info);
            // The tooltip is moved to body while visible so table overflow cannot clip it.
            let portalOpen=false;
            const placeHint=()=>{
              if(!portalOpen){document.body.appendChild(hint);portalOpen=true;}
              const rect=trigger.getBoundingClientRect();
              const width=Math.min(260,window.innerWidth-24);
              hint.style.position='fixed';
              hint.style.width=width+'px';
              hint.style.maxWidth='none';
              hint.style.zIndex='10000';
              hint.style.bottom='auto';
              hint.style.transform='none';
              hint.style.left=Math.max(12,Math.min(rect.left+rect.width/2-width/2,window.innerWidth-width-12))+'px';
              const height=hint.getBoundingClientRect().height;
              hint.style.top=(rect.top-height-10>=8?rect.top-height-10:rect.bottom+10)+'px';
              hint.style.opacity='1';
              hint.style.pointerEvents='none';
              hint.setAttribute('aria-hidden','false');
            };
            const hideHint=()=>{
              if(!portalOpen)return;
              hint.style.opacity='0';
              hint.setAttribute('aria-hidden','true');
              info.appendChild(hint);
              portalOpen=false;
            };
            trigger.addEventListener('mouseenter',placeHint);
            trigger.addEventListener('mouseleave',hideHint);
            trigger.addEventListener('focus',placeHint);
            trigger.addEventListener('blur',hideHint);
            trigger.addEventListener('keydown',event=>{if(event.key==='Escape')hideHint();});
            window.addEventListener('scroll',hideHint,{passive:true});
            window.addEventListener('resize',hideHint);
          }
          const danger = document.createElement('td');
          danger.className = 'ui-marker-catalog__hazard-cell';
          const signs = hazardMap[category.id]?.[safe(item.code)]?.split(',') || [];
          if (signs.length) {
            danger.classList.add('ui-marker-catalog__hazard-list');
            signs.forEach(sign => {
              const image=document.createElement('img');
              image.className='ui-marker-catalog__sign';
              image.src='/assets/img/pipemarkers/hazards/w'+sign+'-32x30.png';
              image.alt='Знак опасности W'+sign;
              image.width=32;
              image.height=30;
              image.loading='lazy';
              image.decoding='async';
              danger.appendChild(image);
            });
          }
          tr.append(label,danger);
          const articles = Array.isArray(item.codes) && item.codes.length === 6
            ? item.codes : Array.from({length:6},(_,i) => 'F0'+(i+1)+'-'+safe(item.code));
          articles.forEach(article => {
            const cell = document.createElement('td');
            cell.className = 'ui-marker-catalog__articles';
            cell.textContent=safe(article);
            tr.appendChild(cell);
          });
          body.appendChild(tr);
        });
        mobile.replaceChildren();
        items.forEach(item=>{
          const details=document.createElement('details');
          const summary=document.createElement('summary');
          summary.textContent=safe(item.name).trim() || 'Маркер без надписи';
          const dl=document.createElement('dl');
          const articles=Array.isArray(item.codes)&&item.codes.length===6
            ? item.codes : Array.from({length:6},(_,i)=>'F0'+(i+1)+'-'+safe(item.code));
          articles.forEach((code,i)=>{
            const pair=document.createElement('div');
            const dt=document.createElement('dt');
            dt.textContent='P'+(i+1);
            const dd=document.createElement('dd');
            dd.textContent=safe(code);
            pair.append(dt,dd);
            dl.appendChild(pair);
          });
          details.append(summary,dl);
          mobile.appendChild(details);
        });
        const count = catalog.querySelector('[data-marker-count]');
        if (count) count.textContent = items.length+' позиций';
        tabs.querySelectorAll('[role="tab"]').forEach(tab => {
          const active = tab.dataset.category === category.id;
          tab.setAttribute('aria-selected',active ? 'true' : 'false');
          tab.tabIndex = active ? 0 : -1;
        });
      }
      function install(categories){
        tabs.replaceChildren();
        categories.forEach((category,index) => {
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'ui-marker-catalog__tab';
          button.role = 'tab';
          button.id = 'marker-tab-'+category.id;
          button.dataset.category = category.id;
          button.textContent = names[category.id] || category.label;
          const [color,ink] = colors[category.id] || [category.color,category.textColor];
          button.style.setProperty('--marker-tab-color',color);
          button.style.setProperty('--marker-tab-text',ink);
          button.style.setProperty('--marker-tab-muted',color);
          button.setAttribute('aria-selected',index===0 ? 'true':'false');
          button.tabIndex = index===0 ? 0 : -1;
          button.addEventListener('click',()=>renderCategory(category));
          tabs.appendChild(button);
        });
        tabs.addEventListener('keydown',event => {
          if (!['ArrowRight','ArrowLeft','Home','End'].includes(event.key)) return;
          const buttons = Array.from(tabs.querySelectorAll('[role="tab"]'));
          const current = buttons.indexOf(document.activeElement);
          let next = event.key==='Home' ? 0 : event.key==='End' ? buttons.length-1 :
            (current+(event.key==='ArrowRight' ? 1 : -1)+buttons.length)%buttons.length;
          event.preventDefault();
          buttons[next].focus();
          renderCategory(categories[next]);
        });
        if (categories.length) renderCategory(categories[0]);
        else intro.textContent = 'Нет данных для отображения.';
      }
      fetch(catalog.dataset.source,{credentials:'same-origin'}).then(response=>{
        if (!response.ok) throw new Error('HTTP '+response.status);
        return response.json();
      }).then(data=>install(Array.isArray(data.categories) ? data.categories : [])).catch(()=>{
        intro.textContent='Не удалось загрузить каталог. Обновите страницу.';
        body.replaceChildren();
      });
    });
  }

  function initQuantityControls(){
    document.querySelectorAll('.ui-quantity').forEach(control => {
      if (control.dataset.uiQuantityReady === '1') return;
      const input = control.querySelector('input[type="number"]');
      const buttons = control.querySelectorAll('button');
      if (!input || buttons.length < 2) return;
      control.dataset.uiQuantityReady = '1';

      function change(delta){
        const min = input.min === '' ? -Infinity : Number(input.min);
        const max = input.max === '' ? Infinity : Number(input.max);
        const step = input.step === '' ? 1 : Number(input.step);
        const current = Number(input.value) || 0;
        input.value = String(Math.min(max,Math.max(min,current + delta * step)));
        input.dispatchEvent(new Event('change',{bubbles:true}));
      }

      buttons[0].addEventListener('click',() => change(-1));
      buttons[buttons.length - 1].addEventListener('click',() => change(1));
    });
  }

  function initDocTables(){
    const wraps = Array.from(document.querySelectorAll('.doc-table-wrap'));

    wraps.forEach(wrap => {
      const table = wrap.querySelector('.doc-table');
      if (!table) return;

      const rows = Array.from(table.rows);
      if (rows.length) {
        const colCount = Math.max(...rows.map(row => row.cells.length));

        for (let col = 0; col < colCount; col++) {
          const cells = rows
            .map(row => row.cells[col])
            .filter(Boolean)
            .filter(cell => Number(cell.colSpan || 1) === 1);

          if (cells.length < 2) continue;

          const compact = cells.every(cell => {
            if (cell.querySelector('img, svg, input, textarea, select, button')) return false;
            const text = cell.textContent.replace(/\s+/g,' ').trim();
            return text.length > 0 && text.length <= 14;
          });

          if (compact) cells.forEach(cell => cell.classList.add('doc-table__compact-col'));
        }
      }

      let shell = wrap.parentElement;
      if (!shell || !shell.classList.contains('doc-table-shell')) {
        shell = document.createElement('div');
        shell.className = 'doc-table-shell';
        wrap.parentNode.insertBefore(shell, wrap);
        shell.appendChild(wrap);
      }

      function updateScrollHint(){
        const overflow = Math.ceil(wrap.scrollWidth) > Math.floor(wrap.clientWidth) + 1;
        const atStart = wrap.scrollLeft <= 2;
        const atEnd = wrap.scrollLeft + wrap.clientWidth >= wrap.scrollWidth - 2;

        shell.classList.toggle('is-scrollable', overflow);
        shell.classList.toggle('is-at-start', !overflow || atStart);
        shell.classList.toggle('is-at-end', !overflow || atEnd);
      }

      wrap.addEventListener('scroll', updateScrollHint, {passive:true});
      window.addEventListener('resize', updateScrollHint);

      if ('ResizeObserver' in window) {
        const observer = new ResizeObserver(updateScrollHint);
        observer.observe(wrap);
        observer.observe(table);
      }

      table.querySelectorAll('img').forEach(img => {
        if (!img.complete) img.addEventListener('load', updateScrollHint, {once:true});
      });

      requestAnimationFrame(() => requestAnimationFrame(updateScrollHint));
    });
  }

  function initLightbox(){
    if (document.querySelector('.doc-lightbox')) return;

    function getCandidates(){
      return Array.from(document.querySelectorAll('.docpage__figure-media img, .doc-table img, .ui-gallery img, .ui-figure img[data-ui-lightbox]'));
    }

    let candidates = getCandidates();
    if (!candidates.length) return;

    let lastTrigger = null;
    let previousOverflow = '';

    const overlay = document.createElement('div');
    overlay.className = 'doc-lightbox';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Просмотр изображения');
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML = '<button class="doc-lightbox__close" type="button" aria-label="Закрыть"><span aria-hidden="true"></span></button><div class="doc-lightbox__stage"><img class="doc-lightbox__image" alt=""></div>';
    document.body.appendChild(overlay);

    const modalImage = overlay.querySelector('.doc-lightbox__image');
    const closeButton = overlay.querySelector('.doc-lightbox__close');

    function isReduced(img){
      if (!img.complete || !img.naturalWidth || !img.naturalHeight) return false;
      const rect = img.getBoundingClientRect();
      return img.naturalWidth > rect.width + 2 || img.naturalHeight > rect.height + 2;
    }

    function refreshZoomability(){
      candidates = getCandidates();
      candidates.forEach(img => {
        const zoomable = isReduced(img);
        img.classList.toggle('docpage__zoomable', zoomable);

        if (zoomable) {
          img.setAttribute('tabindex', '0');
          img.setAttribute('role', 'button');
          img.setAttribute('aria-label', 'Увеличить изображение');
        } else {
          img.removeAttribute('tabindex');
          img.removeAttribute('role');
          img.removeAttribute('aria-label');
        }
      });
    }

    function openLightbox(img){
      if (!isReduced(img)) return;

      lastTrigger = img;
      modalImage.src = img.currentSrc || img.src;
      modalImage.alt = img.alt || 'Изображение документа';
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      overlay.classList.add('is-open');
      overlay.setAttribute('aria-hidden', 'false');
      closeButton.focus();
    }

    function closeLightbox(){
      if (!overlay.classList.contains('is-open')) return;

      overlay.classList.remove('is-open');
      overlay.setAttribute('aria-hidden', 'true');
      modalImage.removeAttribute('src');
      document.body.style.overflow = previousOverflow;

      if (lastTrigger && document.contains(lastTrigger)) lastTrigger.focus();
    }

    document.addEventListener('click', event => {
      const img = event.target.closest('.docpage__figure-media img, .doc-table img, .ui-gallery img, .ui-figure img[data-ui-lightbox]');
      if (!img || !img.classList.contains('docpage__zoomable')) return;
      openLightbox(img);
    });

    document.addEventListener('keydown', event => {
      const img = event.target.closest('.docpage__figure-media img, .doc-table img, .ui-gallery img, .ui-figure img[data-ui-lightbox]');
      if (!img || !img.classList.contains('docpage__zoomable')) return;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openLightbox(img);
      }
    });

    candidates.forEach(img => {
      if (!img.complete) img.addEventListener('load', refreshZoomability, {once:true});
    });

    closeButton.addEventListener('click', closeLightbox);
    overlay.addEventListener('click', event => {
      if (event.target === overlay || event.target.classList.contains('doc-lightbox__stage')) closeLightbox();
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') closeLightbox();
    });

    let resizeFrame = 0;
    window.addEventListener('resize', () => {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(refreshZoomability);
    });

    requestAnimationFrame(refreshZoomability);
  }

  function initDownloadMenus(){
    if (document.documentElement.dataset.downloadMenusReady) return;
    document.documentElement.dataset.downloadMenusReady='1';
    document.addEventListener('click', event => {
      document.querySelectorAll('details[data-ui-download-menu][open]').forEach(menu => {
        if (!menu.contains(event.target) || event.target.closest('.ui-download-menu__link')) menu.open=false;
      });
    });
    document.addEventListener('keydown', event => {
      if (event.key !== 'Escape') return;
      document.querySelectorAll('details[data-ui-download-menu][open]').forEach(menu => {
        menu.open=false;
        menu.querySelector('summary')?.focus();
      });
    });
    document.addEventListener('toggle', event => {
      const menu=event.target;
      if (!menu.matches?.('details[data-ui-download-menu]') || !menu.open) return;
      document.querySelectorAll('details[data-ui-download-menu][open]').forEach(other => {
        if (other !== menu) other.open=false;
      });
    },true);
  }

  function initUiKitDirectory(){
    const host=document.querySelector('[data-ui-kit-directory]');
    if(!host || host.dataset.ready) return;
    host.dataset.ready='1';
    const translations={
      'Hero variants':'Первый экран и баннеры','Layout primitives':'Сетки и компоновка',
      'Feature / stat / product cards':'Карточки преимуществ и товаров',
      'Notes / alerts':'Примечания и предупреждения','Callout':'Акцентный блок',
      'Accordion / FAQ':'Аккордеон и вопросы','Tabs':'Вкладки',
      'Statuses / badges':'Статусы и метки','Switch / range / segmented':'Переключатели и ползунки',
      'Timeline':'Временная шкала','Banner / notification':'Баннеры и уведомления',
      'Responsive embed / video':'Адаптивное видео и встроенный контент',
      'Product / commerce summary':'Товар и оформление заказа','Figure / gallery':'Изображения и галерея',
      'Dialog / modal':'Диалоговые окна','Tooltip / popover':'Подсказки и всплывающие панели',
      'Progress / meter':'Индикаторы прогресса','Media object / avatar':'Медиаобъект и аватар',
      'Table variants':'Варианты таблиц','Image / figure modes':'Оформление изображений',
      'Data table':'Таблица данных','TOC / anchor navigation':'Оглавление и якоря',
      'Before / after':'До и после','Toast / snackbar':'Краткие уведомления',
      'Related links / link panel':'Связанные ссылки','Trust / testimonial':'Отзывы и доверие',
      'CTA':'Призыв к действию','Search / filters':'Поиск и фильтры',
      'Empty / error / loading states':'Пустые состояния, ошибки и загрузка',
      'Файлы / downloads':'Файлы и скачивание','Carousel':'Карусель карточек'
    };
    const supplementary=new Set(['Формы','Переключатели и ползунки','Индикаторы прогресса','Медиаобъект и аватар','Диалоговые окна','Краткие уведомления','Цитата, code и клавиши','Высоты интерактивных элементов','Пустые состояния, ошибки и загрузка','Статусы и метки']);
    const foundation=new Set(['Цветовая система','Типографика','Библиотека стандартных иконок','Кнопки, chips и состояния','Сетки и компоновка']);
    const media=new Set(['Изображения и галерея','Карусель карточек','Фотослайдер с автопереключением','Чередующиеся секции: фотография и текст','Оформление изображений','Адаптивное видео и встроенный контент','До и после']);
    const commerce=new Set(['Карточки','Карточки преимуществ и товаров','Активная и недоступная media-card','Товар и оформление заказа','Сравнение','Поиск и фильтры','Файлы и скачивание','Призыв к действию','Первый экран и баннеры','Отзывы и доверие']);
    const classify=name=>supplementary.has(name)?'Дополнительные элементы':foundation.has(name)?'Основы дизайна':media.has(name)?'Фотографии и медиа':commerce.has(name)?'Магазин и товары':'Контент и навигация';
    const groupNames=['Основы дизайна','Магазин и товары','Фотографии и медиа','Контент и навигация','Дополнительные элементы'];
    const headings=Array.from(document.querySelectorAll('.ui-kit__group > h2'));
    headings.forEach((heading,i)=>{
      const label=heading.textContent.trim();
      heading.textContent=translations[label]||label;
      if(!heading.parentElement.id) heading.parentElement.id='ui-kit-section-'+(i+1);
      if(!heading.parentElement.querySelector(':scope > .ui-kit__hint, :scope > p.ui-kit__hint')){
        const hint=document.createElement('p');
        hint.className='ui-kit__hint';
        hint.textContent='Пример универсального элемента интерфейса. Подходит для страниц каталога, карточек товаров, справочных материалов и личного кабинета — в зависимости от контекста.';
        heading.after(hint);
      }
    });
    groupNames.forEach(name=>{
      const items=headings.filter(heading=>classify(heading.textContent.trim())===name);
      if(!items.length)return;
      const section=document.createElement('section');section.className='ui-kit__directory-group';
      const title=document.createElement('h3');title.textContent=name;section.appendChild(title);
      const list=document.createElement('ul');
      items.forEach(heading=>{
        const li=document.createElement('li'),link=document.createElement('a');
        link.href='#'+heading.parentElement.id;link.textContent=heading.textContent;li.appendChild(link);list.appendChild(li);
      });
      section.appendChild(list);host.appendChild(section);
    });
  }
  function initPhotoSliders(){
    document.querySelectorAll('[data-ui-photo-slider]').forEach(root=>{
      if(root.dataset.ready)return;root.dataset.ready='1';
      const slides=Array.from(root.querySelectorAll('.ui-photo-slider__slide'));
      const dots=root.querySelector('.ui-photo-slider__dots');
      if(slides.length<2||!dots)return;
      let index=0,paused=false;
      const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
      const buttons=slides.map((slide,i)=>{
        const b=document.createElement('button');b.type='button';b.className='ui-photo-slider__dot';
        b.setAttribute('aria-label','Показать фото '+(i+1)+' из '+slides.length);
        b.addEventListener('click',()=>show(i));dots.appendChild(b);return b;
      });
      function show(i){
        index=(i+slides.length)%slides.length;
        slides.forEach((slide,n)=>{slide.hidden=n!==index;slide.classList.toggle('is-active',n===index)});
        buttons.forEach((b,n)=>b.setAttribute('aria-current',n===index?'true':'false'));
      }
      root.querySelector('[data-slide-prev]')?.addEventListener('click',()=>show(index-1));
      root.querySelector('[data-slide-next]')?.addEventListener('click',()=>show(index+1));
      root.addEventListener('mouseenter',()=>paused=true);
      root.addEventListener('mouseleave',()=>paused=false);
      root.addEventListener('focusin',()=>paused=true);
      root.addEventListener('focusout',e=>{if(!root.contains(e.relatedTarget))paused=false});
      let visible=true;
      if('IntersectionObserver' in window){
        const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting},{threshold:.15});
        observer.observe(root);
      }
      document.addEventListener('visibilitychange',()=>{if(document.hidden)paused=true;else if(!root.matches(':hover')&&!root.contains(document.activeElement))paused=false});
      show(0);
      const interval=Math.max(3000,parseInt(root.dataset.interval,10)||5000);
      setInterval(()=>{if(!paused&&visible&&!document.hidden&&!reduced.matches)show(index+1)},interval);
    });
  }

  function initScrollCues(){
    const selectors=[
      ['.ui-kit__nav','.ui-kit__nav'],
      ['.ui-tabs__list','.ui-tabs__list'],
      ['.ui-carousel','.ui-carousel__viewport'],
      ['.ui-table-wrap','.ui-table-wrap']
    ];
    const register=(host,scroller)=>{
      if(host.dataset.scrollCueReady)return;
      host.dataset.scrollCueReady='1';
      host.classList.add('ui-scroll-cue');
      const update=()=>{
        const max=Math.max(0,scroller.scrollWidth-scroller.clientWidth);
        host.dataset.scrollLeft=String(scroller.scrollLeft>3);
        host.dataset.scrollRight=String(scroller.scrollLeft<max-3);
      };
      scroller.addEventListener('scroll',update,{passive:true});
      window.addEventListener('resize',update,{passive:true});
      if('ResizeObserver' in window){
        const observer=new ResizeObserver(update);
        observer.observe(scroller);
        if(scroller.firstElementChild)observer.observe(scroller.firstElementChild);
      }
      update();
    };
    selectors.forEach(([selector,inner])=>{
      document.querySelectorAll(selector).forEach(element=>{
        let host=element;
        if(selector==='.ui-table-wrap'){
          if(!element.parentElement.classList.contains('ui-table-scroll-shell')){
            const shell=document.createElement('div');
            shell.className='ui-table-scroll-shell';
            element.before(shell);
            shell.appendChild(element);
          }
          host=element.parentElement;
        }
        const scroller=selector==='.ui-table-wrap'?element:(host.matches(inner)?host:host.querySelector(inner));
        if(scroller)register(host,scroller);
      });
    });
  }
  function initBoundedTooltips(){
    document.querySelectorAll('.ui-kit .ui-tooltip:not(.ui-marker-catalog__info)').forEach(root=>{
      if(root.dataset.boundedReady)return;
      const trigger=root.querySelector('button'),bubble=root.querySelector('.ui-tooltip__bubble');
      if(!trigger||!bubble)return;
      root.dataset.boundedReady='1';
      let visible=false;
      function place(){
        if(!visible)return;
        const rect=trigger.getBoundingClientRect();
        const width=Math.min(240,window.innerWidth-24);
        bubble.style.width=width+'px';
        bubble.style.maxWidth='none';
        const left=Math.max(12,Math.min(rect.left+rect.width/2-width/2,window.innerWidth-width-12));
        bubble.style.left=left+'px';
        bubble.style.bottom='auto';
        const height=bubble.getBoundingClientRect().height;
        const above=rect.top>height+18;
        bubble.style.top=(above?rect.top-height-10:rect.bottom+10)+'px';
        bubble.style.setProperty('--tip-arrow-left',Math.max(12,Math.min(rect.left+rect.width/2-left,width-12))+'px');
        bubble.dataset.placement=above?'above':'below';
      }
      function show(){
        if(visible)return;
        visible=true;
        document.body.appendChild(bubble);
        bubble.classList.add('ui-tooltip__bubble--portal');
        bubble.style.opacity='1';
        bubble.style.visibility='visible';
        place();
      }
      function hide(){
        if(!visible)return;
        visible=false;
        bubble.style.opacity='0';
        bubble.classList.remove('ui-tooltip__bubble--portal');
        root.appendChild(bubble);
      }
      trigger.addEventListener('mouseenter',show);
      trigger.addEventListener('mouseleave',hide);
      trigger.addEventListener('focus',show);
      trigger.addEventListener('blur',hide);
      trigger.addEventListener('keydown',event=>{if(event.key==='Escape')hide()});
      window.addEventListener('resize',place,{passive:true});
      window.addEventListener('scroll',()=>{if(visible)hide()},{passive:true});
    });
  }

  function initSteppers(){
    document.querySelectorAll('[data-ui-stepper]').forEach(root=>{
      if(root.dataset.uiStepperReady==='1')return;
      const controls=Array.from(root.querySelectorAll('[data-step]'));
      const panels=Array.from(root.querySelectorAll('[data-step-panel]'));
      const prev=root.querySelector('[data-step-prev]');
      const next=root.querySelector('[data-step-next]');
      const progress=root.querySelector('[data-step-progress]');
      if(controls.length<2||controls.length!==panels.length||!prev||!next)return;
      root.dataset.uiStepperReady='1';
      let active=0;
      const activate=index=>{
        active=Math.max(0,Math.min(index,controls.length-1));
        controls.forEach((button,i)=>{
          if(i===active)button.setAttribute('aria-current','step');
          else button.removeAttribute('aria-current');
          panels[i].hidden=i!==active;
        });
        prev.disabled=active===0;
        next.disabled=active===controls.length-1;
        if(progress)progress.textContent='Шаг '+(active+1)+' из '+controls.length;
      };
      controls.forEach((button,i)=>button.addEventListener('click',()=>activate(i)));
      prev.addEventListener('click',()=>activate(active-1));
      next.addEventListener('click',()=>activate(active+1));
      activate(0);
    });
  }

  function initTimelineConnectors(){
    document.querySelectorAll('.ui-timeline--horizontal').forEach(line=>{
      const count=line.querySelectorAll(':scope > .ui-timeline__item').length;
      if(count>0){
        line.style.setProperty('--timeline-count',String(count));
        line.style.setProperty('--timeline-last-col',(100/count)+'%');
      }
    });
  }

  function initUi(){
    initPageTitle();
    initAccordion();
    initTabs();
    initSteppers();
    initTimelineConnectors();
    initLegacyActions();
    initCarousels();
    initScrollCues();
    initBoundedTooltips();
    initPhotoSliders();
    initUiKitDirectory();
    initDialogs();
    initPopovers();
    initSelectboxes();
    initDownloadMenus();
    initSegmentedControls();
    initRemovableChips();
    initUploads();
      initMobileUiKitSections();
    initMarkerCatalogs();
    initQuantityControls();
    initDocTables();
    initLightbox();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initUi, {once:true});
  } else {
    initUi();
  }
})();
