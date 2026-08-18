(() => {
  'use strict';

  /**
   * Memoirs of Amorous Gentlemen
   * Cast Grid + Cast Modal
   */

  const MODULE = '[Memoirs Cast]';
  const SELECTOR = '#moag-cast';

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
   * Split the final word into the last-name line.
   *
   * Ari Simon
   * ->
   * Ari
   * Simon
   *
   * Sophia Anne Caruso
   * ->
   * Sophia Anne
   * Caruso
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
      firstName: parts
        .slice(0, -1)
        .join(' '),

      lastName:
        parts[parts.length - 1],
    };
  };

  // ------------------------------------------------------------
  // CAST CARD
  // ------------------------------------------------------------

  const renderCastCard = (member, index) => {
    const name =
      escapeHTML(member.name || '');

    const role =
      escapeHTML(member.role || '');

    const {
      firstName,
      lastName,
    } = splitName(member.name);

    const safeFirstName =
      escapeHTML(firstName);

    const safeLastName =
      escapeHTML(lastName);

    const image = escapeAttribute(
      Memoirs.normalizeImageUrl(
        member.image_url || ''
      )
    );

    const hasBio = Boolean(
      String(member.bio || '').trim()
    );

    const imageHTML = image
      ? `
        <div class="moag-cast__image">
          <img
            src="${image}"
            alt="${name}"
            loading="lazy"
          >
        </div>
      `
      : `
        <div class="moag-cast__image">
          <div class="moag-cast__image-placeholder"></div>
        </div>
      `;

    const infoHTML = `
      <div class="moag-cast__info">

        <h3 class="moag-cast__name">
          <span class="moag-cast__first-name">
            ${safeFirstName}
          </span>

          ${
            safeLastName
              ? `
                <span class="moag-cast__last-name">
                  ${safeLastName}
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
    `;

    /**
     * BIO EXISTS:
     * Render as interactive button.
     */
    if (hasBio) {
      return `
        <article
          class="moag-cast__member has-bio"
          data-cast-index="${index}"
        >

          <button
            class="moag-cast__trigger"
            type="button"
            data-cast-index="${index}"
            aria-label="View ${name}"
            aria-haspopup="dialog"
          >

            ${imageHTML}

            ${infoHTML}

          </button>

        </article>
      `;
    }

    /**
     * NO BIO:
     * Render normal non-interactive content.
     */
    return `
      <article
        class="moag-cast__member no-bio"
        data-cast-index="${index}"
      >

        <div class="moag-cast__static">

          ${imageHTML}

          ${infoHTML}

        </div>

      </article>
    `;
  };

  // ------------------------------------------------------------
  // GRID
  // ------------------------------------------------------------

  const renderCast = (container, cast) => {
    if (!cast.length) {
      console.warn(
        `${MODULE} No cast members found.`
      );

      return;
    }

    container.innerHTML = `
      <div class="moag-cast">

        <div class="moag-cast__grid">
          ${cast
            .map(renderCastCard)
            .join('')}
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

    platforms.forEach(
      ([key, label]) => {
        const value = member[key];

        if (!value) {
          return;
        }

        const url =
          Memoirs.buildSocialUrl(
            key,
            value
          );

        if (!url) {
          return;
        }

        links.push({
          label,
          url,
        });
      }
    );

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
    const links =
      getSocialLinks(member);

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
  // CREATE MODAL
  // ------------------------------------------------------------

  const createModal = () => {
    if (modal) {
      return modal;
    }

    const element =
      document.createElement('div');

    element.className =
      'moag-cast-modal';

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
          <span aria-hidden="true">
            &times;
          </span>
        </button>

        <div
          class="moag-cast-modal__content"
        ></div>

      </div>
    `;

    document.body.appendChild(element);

    element.addEventListener(
      'click',
      event => {
        const closeTrigger =
          event.target.closest(
            '[data-modal-close]'
          );

        if (closeTrigger) {
          closeModal();
        }
      }
    );

    modal = element;

    return modal;
  };

  // ------------------------------------------------------------
  // MODAL CONTENT
  // ------------------------------------------------------------

  const renderModalContent = (
    member,
    bioHTML = ''
  ) => {
    const name =
      escapeHTML(member.name || '');

    const role =
      escapeHTML(member.role || '');

    const {
      firstName,
      lastName,
    } = splitName(member.name);

    const safeFirstName =
      escapeHTML(firstName);

    const safeLastName =
      escapeHTML(lastName);

    const image = escapeAttribute(
      Memoirs.normalizeImageUrl(
        member.image_url || ''
      )
    );

    const socialLinks =
      renderSocialLinks(member);

    return `
      <div class="moag-cast-modal__layout">

        <div class="moag-cast-modal__media">

          <div class="moag-cast-modal__image">

            ${
              image
                ? `
                  <img
                    src="${image}"
                    alt="${name}"
                  >
                `
                : `
                  <div
                    class="moag-cast-modal__image-placeholder"
                  ></div>
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

              <span
                class="moag-cast-modal__first-name"
              >
                ${safeFirstName}
              </span>

              ${
                safeLastName
                  ? `
                    <span
                      class="moag-cast-modal__last-name"
                    >
                      ${safeLastName}
                    </span>
                  `
                  : ''
              }

            </h2>

            ${
              role
                ? `
                  <div
                    class="moag-cast-modal__role"
                  >
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
                <p
                  class="moag-cast-modal__loading"
                >
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

  const openModal = async (
    member,
    trigger
  ) => {
    if (!member) {
      return;
    }

    /**
     * Safety check.
     *
     * Even if openModal() is called manually,
     * members without biographies should not
     * open a modal.
     */
    if (!String(member.bio || '').trim()) {
      return;
    }

    const modalElement =
      createModal();

    const content =
      modalElement.querySelector(
        '.moag-cast-modal__content'
      );

    lastTrigger =
      trigger || null;

    content.innerHTML =
      renderModalContent(member);

    modalElement.hidden = false;

    modalElement.classList.add(
      'is-open'
    );

    document.body.classList.add(
      'moag-modal-open'
    );

    const closeButton =
      modalElement.querySelector(
        '.moag-cast-modal__close'
      );

    if (closeButton) {
      closeButton.focus();
    }

    try {
      const bioHTML =
        await Memoirs.getGoogleDoc(
          member.bio
        );

      /**
       * Member may have closed the modal
       * while Google Doc was loading.
       */
      if (
        !modalElement.classList.contains(
          'is-open'
        )
      ) {
        return;
      }

      const bio =
        modalElement.querySelector(
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

      const bio =
        modalElement.querySelector(
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
    if (
      !modal ||
      modal.hidden
    ) {
      return;
    }

    modal.classList.remove(
      'is-open'
    );

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
    container.addEventListener(
      'click',
      event => {
        const trigger =
          event.target.closest(
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

        const member =
          castData[index];

        if (!member) {
          return;
        }

        openModal(
          member,
          trigger
        );
      }
    );

    document.addEventListener(
      'keydown',
      event => {
        if (
          event.key === 'Escape' &&
          modal &&
          !modal.hidden
        ) {
          closeModal();
        }
      }
    );
  };

  // ------------------------------------------------------------
  // INIT
  // ------------------------------------------------------------

  const init = async () => {
    const container =
      document.querySelector(
        SELECTOR
      );

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
      castData =
        await Memoirs.getObjects(
          'Cast'
        );

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

  if (
    document.readyState === 'loading'
  ) {
    document.addEventListener(
      'DOMContentLoaded',
      init,
      {
        once: true,
      }
    );
  } else {
    init();
  }

})();