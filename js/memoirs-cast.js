(() => {
  'use strict';

  /**
   * Memoirs of Amorous Gentlemen
   * Cast Grid
   */

  const MODULE = '[Memoirs Cast]';
  const SELECTOR = '#moag-cast';

  // Prevent duplicate initialization.
  if (window.MemoirsCast?.initialized) {
    return;
  }

  // ------------------------------------------------------------
  // HELPERS
  // ------------------------------------------------------------

  const escapeHTML = (value = '') => {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  // ------------------------------------------------------------
  // CAST CARD
  // ------------------------------------------------------------

  const renderCastCard = (member, index) => {
    const name = escapeHTML(member.name || '');
    const role = escapeHTML(member.role || '');
    const image = escapeHTML(member.image_url || '');

    return `
      <article
        class="moag-cast__member"
        data-cast-index="${index}"
      >
        <button
          class="moag-cast__trigger"
          type="button"
          data-cast-index="${index}"
          aria-label="View ${name}"
        >

          <div class="moag-cast__image">
            ${
              image
                ? `<img src="${image}" alt="${name}" loading="lazy">`
                : `<div class="moag-cast__image-placeholder"></div>`
            }
          </div>

          <div class="moag-cast__info">
            <h3 class="moag-cast__name">${name}</h3>

            ${
              role
                ? `<div class="moag-cast__role">${role}</div>`
                : ''
            }
          </div>

        </button>
      </article>
    `;
  };

  // ------------------------------------------------------------
  // GRID
  // ------------------------------------------------------------

  const renderCast = (container, cast) => {
    if (!cast.length) {
      console.warn(`${MODULE} No cast members found.`);
      return;
    }

    container.innerHTML = `
      <div class="moag-cast">
        <div class="moag-cast__grid">
          ${cast.map(renderCastCard).join('')}
        </div>
      </div>
    `;
  };

  // ------------------------------------------------------------
  // INIT
  // ------------------------------------------------------------

  const init = async () => {
    const container = document.querySelector(SELECTOR);

    // Script can be loaded globally.
    // If #moag-cast isn't on this page, simply do nothing.
    if (!container) {
      return;
    }

    if (!window.Memoirs) {
      console.error(`${MODULE} Memoirs core is not available.`);
      return;
    }

    try {
      const cast = await Memoirs.getObjects('Cast');

      console.log(`${MODULE} Cast data:`, cast);

      renderCast(container, cast);

      console.log(`${MODULE} Rendered ${cast.length} cast member(s).`);
    } catch (error) {
      console.error(`${MODULE} Unable to render cast.`, error);
    }
  };

  // ------------------------------------------------------------
  // PUBLIC MODULE
  // ------------------------------------------------------------

  window.MemoirsCast = {
    initialized: true,
    init
  };

  // ------------------------------------------------------------
  // START
  // ------------------------------------------------------------

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();