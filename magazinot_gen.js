(function(){
  function initDocLightbox(){
    const pages = Array.from(document.querySelectorAll('.docpage'));
    if (!pages.length || document.querySelector('.doc-lightbox')) return;

    const candidates = pages
      .flatMap(page => Array.from(page.querySelectorAll('.docpage__figure-media img, .doc-table img')))
      .filter(img => !/\/[^/]*color-[^/]*\.(?:png|webp|jpe?g|gif|svg)$/i.test(img.currentSrc || img.src));

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

    candidates.forEach(img => {
      if (!img.complete) img.addEventListener('load', refreshZoomability, {once:true});

      img.addEventListener('click', () => {
        if (img.classList.contains('docpage__zoomable')) openLightbox(img);
      });

      img.addEventListener('keydown', event => {
        if (!img.classList.contains('docpage__zoomable')) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openLightbox(img);
        }
      });
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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDocLightbox, {once:true});
  } else {
    initDocLightbox();
  }
})();
