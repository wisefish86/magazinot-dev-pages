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
      }

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

  function initVariantSelectors(){
    document.querySelectorAll('[data-ui-variant-selector]').forEach(selector => {
      if (selector.dataset.readyVariant) return;
      selector.dataset.readyVariant = '1';

      selector.addEventListener('click',event => {
        const typeButton = event.target.closest('[data-variant-type]');
        const colorButton = event.target.closest('[data-variant-color]');

        if (typeButton) {
          selector.querySelectorAll('[data-variant-type]').forEach(button => button.setAttribute('aria-pressed',button === typeButton ? 'true' : 'false'));
          const output = selector.querySelector('[data-ui-variant-type-value]');
          if (output) output.textContent = typeButton.dataset.variantType || typeButton.textContent.trim();
        }

        if (colorButton) {
          selector.querySelectorAll('[data-variant-color]').forEach(button => button.setAttribute('aria-pressed',button === colorButton ? 'true' : 'false'));
          const preview = selector.querySelector('[data-ui-variant-preview]');
          const label = selector.querySelector('[data-ui-variant-label]');
          const output = selector.querySelector('[data-ui-variant-color-value]');
          if (preview) preview.style.setProperty('--variant-color',colorButton.dataset.variantColor || '#168446');
          if (label) label.textContent = colorButton.dataset.variantLabel || colorButton.textContent.trim();
          if (output) output.textContent = colorButton.dataset.variantName || colorButton.textContent.trim();
        }

        if (typeButton || colorButton) {
          const selectedType = selector.querySelector('[data-variant-type][aria-pressed="true"]');
          const selectedColor = selector.querySelector('[data-variant-color][aria-pressed="true"]');
          const caption = selector.querySelector('[data-ui-variant-caption]');
          if (caption && selectedType && selectedColor) caption.textContent = selectedType.dataset.variantType + ' · ' + selectedColor.dataset.variantName;
        }
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

  function initUi(){
    initPageTitle();
    initAccordion();
    initTabs();
    initLegacyActions();
    initCarousels();
    initDialogs();
    initPopovers();
    initSelectboxes();
    initSegmentedControls();
    initRemovableChips();
    initUploads();
    initVariantSelectors();
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
