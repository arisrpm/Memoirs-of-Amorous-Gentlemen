(() => {
  'use strict';

  /**
   * Memoirs of Amorous Gentlemen
   * Cast Grid + Cast Modal + Biography Navigation
   */

  const MODULE = '[Memoirs Cast]';
  const SELECTOR = '#moag-cast';

  if (window.MemoirsCast?.initialized) {
    return;
  }

  let castData = [];
  let modal = null;
  let lastTrigger = null;
  let currentCastIndex = -1;
  let modalRequestId = 0;

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
   * Does this cast member have a biography?
   */
  const hasBiography = member => {
    return Boolean(
      String(member?.bio || '').trim()
    );
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

    const hasBio =
      hasBiography(member);

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
  // BIOGRAPHY NAVIGATION
  // ------------------------------------------------------------

  /**
   * Find the next/previous cast member with a bio.
   *
   * direction:
   *  1 = next
   * -1 = previous
   *
   * Navigation wraps around the cast array.
   */
  const getAdjacentBioIndex = (
    startIndex,
    direction
  ) => {
    const total = castData.length;

    if (!total) {
      return -1;
    }

    let index = startIndex;

    for (
      let checked = 0;
      checked < total;
      checked++
    ) {
      index =
        (index + direction + total) %
        total;

      if (
        index !== startIndex &&
        hasBiography(castData[index])
      ) {
        return index;
      }
    }

    return -1;
  };

  /**
   * Number of cast members that actually have bios.
   */
  const getBiographyCount = () => {
    return castData.filter(
      hasBiography
    ).length;
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

      <button
        class="
          moag-cast-modal__nav
          moag-cast-modal__nav--prev
        "
        type="button"
        aria-label="Previous cast biography"
        data-modal-prev
      >
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          focusable="false"
        >
          <path
            d="M15.5 4.5L8 12l7.5 7.5"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>

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

      <button
        class="
          moag-cast-modal__nav
          moag-cast-modal__nav--next
        "
        type="button"
        aria-label="Next cast biography"
        data-modal-next
      >
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          focusable="false"
        >
          <path
            d="M8.5 4.5L16 12l-7.5 7.5"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
    `;

    document.body.appendChild(
      element
    );

    element.addEventListener(
      'click',
      event => {

        // CLOSE
        const closeTrigger =
          event.target.closest(
            '[data-modal-close]'
          );

        if (closeTrigger) {
          closeModal();
          return;
        }

        // PREVIOUS
        const previousTrigger =
          event.target.closest(
            '[data-modal-prev]'
          );

        if (previousTrigger) {
          navigateModal(-1);
          return;
        }

        // NEXT
        const nextTrigger =
          event.target.closest(
            '[data-modal-next]'
          );

        if (nextTrigger) {
          navigateModal(1);
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
  // UPDATE NAVIGATION STATE
  // ------------------------------------------------------------

  const updateNavigationState = () => {
    if (!modal) {
      return;
    }

    const previousButton =
      modal.querySelector(
        '[data-modal-prev]'
      );

    const nextButton =
      modal.querySelector(
        '[data-modal-next]'
      );

    const biographyCount =
      getBiographyCount();

    /**
     * With zero or one biography there is
     * nowhere useful to navigate.
     */
    const shouldShowNavigation =
      biographyCount > 1;

    if (previousButton) {
      previousButton.hidden =
        !shouldShowNavigation;
    }

    if (nextButton) {
      nextButton.hidden =
        !shouldShowNavigation;
    }
  };

  // ------------------------------------------------------------
  // LOAD MODAL MEMBER
  // ------------------------------------------------------------

  const loadModalMember = async (
    index,
    options = {}
  ) => {
    const {
      focusClose = false,
    } = options;

    const member =
      castData[index];

    if (
      !member ||
      !hasBiography(member)
    ) {
      return;
    }

    const modalElement =
      createModal();

    const content =
      modalElement.querySelector(
        '.moag-cast-modal__content'
      );

    if (!content) {
      return;
    }

    currentCastIndex = index;

    /**
     * Every member load gets a unique ID.
     *
     * If somebody quickly clicks next/previous
     * before the previous Google Doc finishes,
     * the old request cannot overwrite the new bio.
     */
    const requestId =
      ++modalRequestId;

    content.innerHTML =
      renderModalContent(member);

    /**
     * Reset biography scroll position when
     * changing cast members.
     */
    const loadingBio =
      content.querySelector(
        '.moag-cast-modal__bio'
      );

    if (loadingBio) {
      loadingBio.scrollTop = 0;
    }

    updateNavigationState();

    try {
      const bioHTML =
        await Memoirs.getGoogleDoc(
          member.bio
        );

      /**
       * Ignore stale responses.
       */
      if (
        requestId !== modalRequestId
      ) {
        return;
      }

      /**
       * Modal may have been closed while
       * the Google Doc was loading.
       */
      if (
        !modalElement.classList.contains(
          'is-open'
        )
      ) {
        return;
      }

      /**
       * User may have navigated elsewhere.
       */
      if (
        currentCastIndex !== index
      ) {
        return;
      }

      const bio =
        modalElement.querySelector(
          '.moag-cast-modal__bio'
        );

      if (bio) {
        bio.innerHTML = bioHTML;
        bio.scrollTop = 0;
      }

      if (focusClose) {
        const closeButton =
          modalElement.querySelector(
            '.moag-cast-modal__close'
          );

        if (closeButton) {
          closeButton.focus();
        }
      }
    } catch (error) {
      /**
       * Don't show an error from an old request
       * after navigating to somebody else.
       */
      if (
        requestId !== modalRequestId ||
        currentCastIndex !== index
      ) {
        return;
      }

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
  // OPEN MODAL
  // ------------------------------------------------------------

  const openModal = async (
    member,
    trigger
  ) => {
    if (
      !member ||
      !hasBiography(member)
    ) {
      return;
    }

    const index =
      castData.indexOf(member);

    if (index < 0) {
      return;
    }

    const modalElement =
      createModal();

    lastTrigger =
      trigger || null;

    modalElement.hidden = false;

    modalElement.classList.add(
      'is-open'
    );

    document.body.classList.add(
      'moag-modal-open'
    );

    await loadModalMember(
      index
    );

    /**
     * Focus close button after opening.
     *
     * We intentionally do NOT do this when
     * navigating between cast members.
     */
    const closeButton =
      modalElement.querySelector(
        '.moag-cast-modal__close'
      );

    if (
      closeButton &&
      modalElement.classList.contains(
        'is-open'
      )
    ) {
      closeButton.focus();
    }
  };

  // ------------------------------------------------------------
  // NAVIGATE MODAL
  // ------------------------------------------------------------

  const navigateModal = direction => {
    if (
      !modal ||
      modal.hidden ||
      currentCastIndex < 0
    ) {
      return;
    }

    const newIndex =
      getAdjacentBioIndex(
        currentCastIndex,
        direction
      );

    if (newIndex < 0) {
      return;
    }

    loadModalMember(
      newIndex
    );
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

    /**
     * Invalidate any biography request that
     * may still be running.
     */
    modalRequestId++;

    modal.classList.remove(
      'is-open'
    );

    modal.hidden = true;

    document.body.classList.remove(
      'moag-modal-open'
    );

    currentCastIndex = -1;

    if (lastTrigger) {
      lastTrigger.focus();
    }

    lastTrigger = null;
  };

  // ------------------------------------------------------------
  // EVENTS
  // ------------------------------------------------------------

  const bindEvents = container => {

    // GRID CLICK
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

        if (
          !member ||
          !hasBiography(member)
        ) {
          return;
        }

        openModal(
          member,
          trigger
        );
      }
    );

    // KEYBOARD
    document.addEventListener(
      'keydown',
      event => {
        if (
          !modal ||
          modal.hidden
        ) {
          return;
        }

        // ESCAPE
        if (event.key === 'Escape') {
          event.preventDefault();

          closeModal();

          return;
        }

        // PREVIOUS
        if (event.key === 'ArrowLeft') {
          event.preventDefault();

          navigateModal(-1);

          return;
        }

        // NEXT
        if (event.key === 'ArrowRight') {
          event.preventDefault();

          navigateModal(1);
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

      console.log(
        `${MODULE} ${getBiographyCount()} biography member(s) available for modal navigation.`
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
    navigateModal,
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