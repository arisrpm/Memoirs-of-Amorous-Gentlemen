(() => {
  'use strict';

  /**
   * Memoirs of Amorous Gentlemen
   * Cast Grid + Cast Modal
   */

  const MODULE = '[Memoirs Cast]';
  const SELECTOR = '#moag-cast';

  // Prevent duplicate initialization.
  if (window.MemoirsCast?.initialized) {
    return;
  }

  let castData = [];
  let modal = null;
  let lastTrigger = null;

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

  const escapeAttribute = (value = '') => {
    return escapeHTML(value);
  };

  /**
   * Split a full name so the first/middle names appear on
   * the first line and the final name appears on the second.
   *
   * Example:
   * "Sophia Anne Caruso"
   *
   * firstName: "Sophia Anne"
   * lastName:  "Caruso"
   */
  const splitName = (fullName = '') => {
    const parts = String(fullName)
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (parts.length <= 1) {
      return {
        firstName: parts[0] || '',
        lastName: '',
      };
    }

    return {
      firstName: parts.slice(0, -1).join(' '),
      lastName: parts[parts.length - 1],
    };
  };

  /**
   * Return escaped split-name values for output.
   */
  const getDisplayName = member => {
    const {
      firstName,
      lastName,
    } = splitName(member.name || '');

    return {
      firstName: escapeHTML(firstName),
      lastName: escapeHTML(lastName),
      fullName: escapeHTML(member.name || ''),
    };
  };

  // ------------------------------------------------------------
  // CAST CARD
  // ------------------------------------------------------------

  const renderCastCard = (member, index) => {
    const {
      firstName,
      lastName,
      fullName,
    } = getDisplayName(member);

    const role = escapeHTML(member.role || '');

    const image = escapeAttribute(
      Memoirs.normalizeImageUrl(member.image_url || '')
    );

    return `
      <article
        class="moag-cast__member"
        data-cast-index="${index}"
      >
        <button
          class="moag-cast__trigger"
          type="button"
          data-cast-index="${index}"
          aria-label="View ${fullName}"
          aria-haspopup="dialog"
        >

          <div class="moag-cast__image">
            ${
              image
                ? `
                  <img
                    src="${image}"
                    alt="${fullName}"
                    loading="lazy"
                  >
                `
                : `
                  <div class="moag-cast__image-placeholder"></div>
                `
            }
          </div>

          <div class="moag-cast__info">

            <h3 class="moag-cast__name">
              <span class="moag-cast__first-name">
                ${firstName}
              </span>

              ${
                lastName
                  ? `
                    <span class="moag-cast__last-name">
                      ${lastName}
                    </span>
                  `
                  : ''
              }
            </h3>

            ${
              role
                ? `
                  <div class="moag-cast__role">
                    ${role}
                  </div>
                `
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
  // SOCIAL LINKS
  // ------------------------------------------------------------

  const getSocialLinks = member => {
    const links = [];

    const platforms = [
      ['instagram', 'Instagram'],
      ['facebook', 'Facebook'],
      ['twitter', 'X'],
      ['tiktok', 'TikTok'],
      ['youtube', 'YouTube'],
    ];

    platforms.forEach(([key, label]) => {
      const value = member[key];

      if (!value) {
        return;
      }

      const url = Memoirs.buildSocialUrl(key, value);

      if (!url) {
        return;
      }

      links.push({
        label,
        url,
      });
    });

    if (
      member.website &&
      Memoirs.isValidUrl(member.website)
    ) {
      links.push({
        label: 'Website',
        url: member.website,
      });
    }

    return links;
  };

  const renderSocialLinks = member => {
    const links = getSocialLinks(member);

    if (!links.length) {
      return '';
    }

    return `
      <div class="moag-cast-modal__links">
        ${links
          .map(link => {
            return `
              <a
                href="${escapeAttribute(link.url)}"
                target="_blank"
                rel="noopener noreferrer"
              >
                ${escapeHTML(link.label)}
              </a>
            `;
          })
          .join('')}
      </div>
    `;
  };

  // ------------------------------------------------------------
  // MODAL
  // ------------------------------------------------------------

  const createModal = () => {
    if (modal) {
      return modal;
    }

    const element = document.createElement('div');

    element.className = 'moag-cast-modal';
    element.hidden = true;

    element.innerHTML = `
      <div
        class="moag-cast-modal__backdrop"
        data-modal-close
      ></div>

      <div
        class="moag-cast-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="moag-cast-modal-title"
      >

        <button
          class="moag-cast-modal__close"
          type="button"
          aria-label="Close cast biography"
          data-modal-close
        >
          <span aria-hidden="true">&times;</span>
        </button>

        <div class="moag-cast-modal__content"></div>

      </div>
    `;

    document.body.appendChild(element);

    element.addEventListener('click', event => {
      const closeTrigger = event.target.closest(
        '[data-modal-close]'
      );

      if (closeTrigger) {
        closeModal();
      }
    });

    modal = element;

    return modal;
  };

  // ------------------------------------------------------------
  // MODAL CONTENT
  // ------------------------------------------------------------

  const renderModalContent = (member, bioHTML = '') => {
    const {
      firstName,
      lastName,
      fullName,
    } = getDisplayName(member);

    const role = escapeHTML(member.role || '');

    const image = escapeAttribute(
      Memoirs.normalizeImageUrl(member.image_url || '')
    );

    const socialLinks = renderSocialLinks(member);

    return `
      <div class="moag-cast-modal__layout">

        <div class="moag-cast-modal__media">

          <div class="moag-cast-modal__image">
            ${
              image
                ? `
                  <img
                    src="${image}"
                    alt="${fullName}"
                  >
                `
                : `
                  <div class="moag-cast-modal__image-placeholder"></div>
                `
            }
          </div>

        </div>

        <div class="moag-cast-modal__details">

          <header class="moag-cast-modal__header">

            <h2
              class="moag-cast-modal__name"
              id="moag-cast-modal-title"
            >
              <span class="moag-cast-modal__first-name">
                ${firstName}
              </span>

              ${
                lastName
                  ? `
                    <span class="moag-cast-modal__last-name">
                      ${lastName}
                    </span>
                  `
                  : ''
              }
            </h2>

            ${
              role
                ? `
                  <div class="moag-cast-modal__role">
                    ${role}
                  </div>
                `
                : ''
            }

          </header>

          <div class="moag-cast-modal__bio">
            ${
              bioHTML ||
              `
                <p class="moag-cast-modal__loading">
                  Loading biography...
                </p>
              `
            }
          </div>

          ${socialLinks}

        </div>

      </div>
    `;
  };

  // ------------------------------------------------------------
  // OPEN MODAL
  // ------------------------------------------------------------

  const openModal = async (member, trigger) => {
    if (!member) {
      return;
    }

    const modalElement = createModal();

    const content = modalElement.querySelector(
      '.moag-cast-modal__content'
    );

    lastTrigger = trigger || null;

    /**
     * Render immediately so the modal opens without waiting
     * for the Google Doc request.
     */
    content.innerHTML = renderModalContent(member);

    modalElement.hidden = false;
    modalElement.classList.add('is-open');

    document.body.classList.add('moag-modal-open');

    const closeButton = modalElement.querySelector(
      '.moag-cast-modal__close'
    );

    if (closeButton) {
      closeButton.focus();
    }

    // No biography URL supplied.
    if (!member.bio) {
      const bio = modalElement.querySelector(
        '.moag-cast-modal__bio'
      );

      if (bio) {
        bio.innerHTML = '';
      }

      return;
    }

    try {
      /**
       * Memoirs.getGoogleDoc() returns cleaned HTML.
       *
       * IMPORTANT:
       * Do NOT escape this HTML. The core has already removed
       * Google Docs presentation markup while preserving useful
       * semantic markup such as:
       *
       * <p>
       * <em>
       * <strong>
       * <a>
       * <ul>
       * <ol>
       * <li>
       */
      const bioHTML = await Memoirs.getGoogleDoc(
        member.bio
      );

      /**
       * The user may have closed the modal while the Google
       * Doc was loading.
       */
      if (
        !modalElement.classList.contains('is-open')
      ) {
        return;
      }

      const bio = modalElement.querySelector(
        '.moag-cast-modal__bio'
      );

      if (bio) {
        bio.innerHTML = bioHTML;
      }
    } catch (error) {
      console.error(
        `${MODULE} Unable to load biography for ${member.name}.`,
        error
      );

      const bio = modalElement.querySelector(
        '.moag-cast-modal__bio'
      );

      if (bio) {
        bio.innerHTML = `
          <p>
            Biography unavailable.
          </p>
        `;
      }
    }
  };

  // ------------------------------------------------------------
  // CLOSE MODAL
  // ------------------------------------------------------------

  const closeModal = () => {
    if (!modal || modal.hidden) {
      return;
    }

    modal.classList.remove('is-open');
    modal.hidden = true;

    document.body.classList.remove(
      'moag-modal-open'
    );

    if (lastTrigger) {
      lastTrigger.focus();
    }

    lastTrigger = null;
  };

  // ------------------------------------------------------------
  // EVENTS
  // ------------------------------------------------------------

  const bindEvents = container => {
    container.addEventListener('click', event => {
      const trigger = event.target.closest(
        '.moag-cast__trigger'
      );

      if (!trigger) {
        return;
      }

      const index = Number(
        trigger.dataset.castIndex
      );

      if (!Number.isInteger(index)) {
        return;
      }

      const member = castData[index];

      if (!member) {
        return;
      }

      openModal(member, trigger);
    });

    document.addEventListener('keydown', event => {
      if (
        event.key === 'Escape' &&
        modal &&
        !modal.hidden
      ) {
        closeModal();
      }
    });
  };

  // ------------------------------------------------------------
  // INIT
  // ------------------------------------------------------------

  const init = async () => {
    const container = document.querySelector(
      SELECTOR
    );

    /**
     * Script can be loaded globally.
     * If #moag-cast isn't on this page, simply do nothing.
     */
    if (!container) {
      return;
    }

    if (!window.Memoirs) {
      console.error(
        `${MODULE} Memoirs core is not available.`
      );

      return;
    }

    try {
      castData = await Memoirs.getObjects('Cast');

      console.log(
        `${MODULE} Cast data:`,
        castData
      );

      renderCast(
        container,
        castData
      );

      bindEvents(container);

      console.log(
        `${MODULE} Rendered ${castData.length} cast member(s).`
      );
    } catch (error) {
      console.error(
        `${MODULE} Unable to render cast.`,
        error
      );
    }
  };

  // ------------------------------------------------------------
  // PUBLIC MODULE
  // ------------------------------------------------------------

  window.MemoirsCast = {
    initialized: true,
    init,
    openModal,
    closeModal,
  };

  // ------------------------------------------------------------
  // START
  // ------------------------------------------------------------

  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      init,
      { once: true }
    );
  } else {
    init();
  }

})();