(function(){
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
        const overflow = wrap.scrollWidth > wrap.clientWidth + 2;
        const atStart = wrap.scrollLeft <= 2;
        const atEnd = wrap.scrollLeft + wrap.clientWidth >= wrap.scrollWidth - 2;

        shell.classList.toggle('is-scrollable', overflow);
        shell.classList.toggle('is-at-start', !overflow || atStart);
        shell.classList.toggle('is-at-end', !overflow || atEnd);
      }

      wrap.addEventListener('scroll', updateScrollHint, {passive:true});
      window.addEventListener('resize', updateScrollHint);
      requestAnimationFrame(updateScrollHint);
    });
  }

  function initDocLightbox(){
    const pages = Array.from(document.querySelectorAll('.docpage'));
    if (!pages.length || document.querySelector('.doc-lightbox')) return;

    function getCandidates(){
      return pages
        .flatMap(page => Array.from(page.querySelectorAll('.docpage__figure-media img, .doc-table img')))
        .filter(img => !/\/[^/]*color-[^/]*\.(?:png|webp|jpe?g|gif|svg)$/i.test(img.currentSrc || img.src));
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
    overlay.innerHTML = '<button class="doc-lightbox__close" type="button" aria-label="Закрыть">×</button><div class="doc-lightbox__stage"><img class="doc-lightbox__image" alt=""></div>';
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

  function initDocUi(){
    initDocTables();
    initDocLightbox();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDocUi, {once:true});
  } else {
    initDocUi();
  }
})();
