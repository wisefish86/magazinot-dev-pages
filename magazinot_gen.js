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

  function initDocLightbox(){
    const pages = Array.from(document.querySelectorAll('.docpage'));
    if (!pages.length || document.querySelector('.doc-lightbox')) return;

    function getCandidates(){
      return pages
        .flatMap(page => Array.from(page.querySelectorAll('.docpage__figure-media img, .doc-table img')))
        .filter(Boolean);
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

    pages.forEach(page => {
      page.addEventListener('click', event => {
        const img = event.target.closest('.docpage__figure-media img, .doc-table img');
        if (!img || !img.classList.contains('docpage__zoomable')) return;
        openLightbox(img);
      });

      page.addEventListener('keydown', event => {
        const img = event.target.closest('.docpage__figure-media img, .doc-table img');
        if (!img || !img.classList.contains('docpage__zoomable')) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openLightbox(img);
        }
      });
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
    initDocTables();
    initDocLightbox();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initUi, {once:true});
  } else {
    initUi();
  }
})();
