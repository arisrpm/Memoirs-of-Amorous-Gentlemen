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
  // SOCIAL ICONS
  // ------------------------------------------------------------

  /**
   * SVG icons use currentColor.
   *
   * That means their color can be controlled entirely
   * through CSS on .moag-cast-modal__links a.
   */
  const socialIcons = {

    facebook: `
      <svg
        viewBox="0 0 640 640"
        aria-hidden="true"
        focusable="false"
      >
        <path
          fill="currentColor"
          d="M240 363.3L240 576L356 576L356 363.3L442.5 363.3L460.5 265.5L356 265.5L356 230.9C356 179.2 376.3 159.4 428.7 159.4C445 159.4 458.1 159.8 465.7 160.6L465.7 71.9C451.4 68 416.4 64 396.2 64C289.3 64 240 114.5 240 223.4L240 265.5L174 265.5L174 363.3L240 363.3z"
        />
      </svg>
    `,

    twitter: `
      <svg
        viewBox="0 0 640 640"
        aria-hidden="true"
        focusable="false"
      >
        <path
          fill="currentColor"
          d="M453.2 112L523.8 112L369.6 288.2L551 528L409 528L297.7 382.6L170.5 528L99.8 528L264.7 339.5L90.8 112L236.4 112L336.9 244.9L453.2 112zM428.4 485.8L467.5 485.8L215.1 152L173.1 152L428.4 485.8z"
        />
      </svg>
    `,

    instagram: `
      <svg
        viewBox="0 0 640 640"
        aria-hidden="true"
        focusable="false"
      >
        <path
          fill="currentColor"
          d="M320.3 205C256.8 204.8 205.2 256.2 205 319.7C204.8 383.2 256.2 434.8 319.7 435C383.2 435.2 434.8 383.8 435 320.3C435.2 256.8 383.8 205.2 320.3 205zM319.7 245.4C360.9 245.2 394.4 278.5 394.6 319.7C394.8 360.9 361.5 394.4 320.3 394.6C279.1 394.8 245.6 361.5 245.4 320.3C245.2 279.1 278.5 245.6 319.7 245.4zM413.1 200.3C413.1 185.5 425.1 173.5 439.9 173.5C454.7 173.5 466.7 185.5 466.7 200.3C466.7 215.1 454.7 227.1 439.9 227.1C425.1 227.1 413.1 215.1 413.1 200.3zM542.8 227.5C541.1 191.6 532.9 159.8 506.6 133.6C480.4 107.4 448.6 99.2 412.7 97.4C375.7 95.3 264.8 95.3 227.8 97.4C192 99.1 160.2 107.3 133.9 133.5C107.6 159.7 99.5 191.5 97.7 227.4C95.6 264.4 95.6 375.3 97.7 412.3C99.4 448.2 107.6 480 133.9 506.2C160.2 532.4 191.9 540.6 227.8 542.4C264.8 544.5 375.7 544.5 412.7 542.4C448.6 540.7 480.4 532.5 506.6 506.2C532.8 480 541 448.2 542.8 412.3C544.9 375.3 544.9 264.5 542.8 227.5zM495 452C487.2 471.6 472.1 486.7 452.4 494.6C422.9 506.3 352.9 503.6 320.3 503.6C287.7 503.6 217.6 506.2 188.2 494.6C168.6 486.8 153.5 471.7 145.6 452C133.9 422.5 136.6 352.5 136.6 319.9C136.6 287.3 134 217.2 145.6 187.8C153.4 168.2 168.5 153.1 188.2 145.2C217.7 133.5 287.7 136.2 320.3 136.2C352.9 136.2 423 133.6 452.4 145.2C472 153 487.1 168.1 495 187.8C506.7 217.3 504 287.3 504 319.9C504 352.5 506.7 422.6 495 452z"
        />
      </svg>
    `,

    youtube: `
      <svg
        viewBox="0 0 640 640"
        aria-hidden="true"
        focusable="false"
      >
        <path
          fill="currentColor"
          d="M581.7 188.1C575.5 164.4 556.9 145.8 533.4 139.5C490.9 128 320.1 128 320.1 128C320.1 128 149.3 128 106.7 139.5C83.2 145.8 64.7 164.4 58.4 188.1C47 231 47 320.4 47 320.4C47 320.4 47 409.8 58.4 452.7C64.7 476.3 83.2 494.2 106.7 500.5C149.3 512 320.1 512 320.1 512C320.1 512 490.9 512 533.5 500.5C557 494.2 575.5 476.3 581.8 452.7C593.2 409.8 593.2 320.4 593.2 320.4C593.2 320.4 593.2 231 581.8 188.1zM264.2 401.6L264.2 239.2L406.9 320.4L264.2 401.6z"
        />
      </svg>
    `,

    website: `
      <svg
        viewBox="0 0 640 640"
        aria-hidden="true"
        focusable="false"
      >
        <path
          fill="currentColor"
          d="M304 70.1C313.1 61.9 326.9 61.9 336 70.1L568 278.1C577.9 286.9 578.7 302.1 569.8 312C560.9 321.9 545.8 322.7 535.9 313.8L527.9 306.6L527.9 511.9C527.9 547.2 499.2 575.9 463.9 575.9L175.9 575.9C140.6 575.9 111.9 547.2 111.9 511.9L111.9 306.6L103.9 313.8C94 322.6 78.9 321.8 70 312C61.1 302.2 62 287 71.8 278.1L304 70.1zM320 120.2L160 263.7L160 512C160 520.8 167.2 528 176 528L224 528L224 424C224 384.2 256.2 352 296 352L344 352C383.8 352 416 384.2 416 424L416 528L464 528C472.8 528 480 520.8 480 512L480 263.7L320 120.3zM272 528L368 528L368 424C368 410.7 357.3 400 344 400L296 400C282.7 400 272 410.7 272 424L272 528z"
        />
      </svg>
    `,

    tiktok: `
      <svg
        viewBox="0 0 640 640"
        aria-hidden="true"
        focusable="false"
      >
        <path
          fill="currentColor"
          d="M544.5 273.9C500.5 274 457.5 260.3 421.7 234.7L421.7 413.4C421.7 446.5 411.6 478.8 392.7 506C373.8 533.2 347.1 554 316.1 565.6C285.1 577.2 251.3 579.1 219.2 570.9C187.1 562.7 158.3 545 136.5 520.1C114.7 495.2 101.2 464.1 97.5 431.2C93.8 398.3 100.4 365.1 116.1 336C131.8 306.9 156.1 283.3 185.7 268.3C215.3 253.3 248.6 247.8 281.4 252.3L281.4 342.2C266.4 337.5 250.3 337.6 235.4 342.6C220.5 347.6 207.5 357.2 198.4 369.9C189.3 382.6 184.4 398 184.5 413.8C184.6 429.6 189.7 444.8 199 457.5C208.3 470.2 221.4 479.6 236.4 484.4C251.4 489.2 267.5 489.2 282.4 484.3C297.3 479.4 310.4 469.9 319.6 457.2C328.8 444.5 333.8 429.1 333.8 413.4L333.8 64L421.8 64C421.7 71.4 422.4 78.9 423.7 86.2C426.8 102.5 433.1 118.1 442.4 131.9C451.7 145.7 463.7 157.5 477.6 166.5C497.5 179.6 520.8 186.6 544.6 186.6L544.6 274z"
        />
      </svg>
    `,
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
          platform: key,
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
        platform: 'website',
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

            const icon =
              socialIcons[link.platform] || '';

            return `
              <a
                class="
                  moag-cast-modal__social
                  moag-cast-modal__social--${escapeAttribute(link.platform)}
                "
                href="${escapeAttribute(link.url)}"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="${escapeAttribute(link.label)}"
                title="${escapeAttribute(link.label)}"
              >
                ${icon}

                <span class="moag-cast-modal__social-label">
                  ${escapeHTML(link.label)}
                </span>
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

  const getAdjacentBioIndex = (
    startIndex,
    direction
  ) => {
    const total = castData.length;

    if (!total) {
      return -1;
    }

    for (
      let index = startIndex + direction;
      index >= 0 && index < total;
      index += direction
    ) {
      if (hasBiography(castData[index])) {
        return index;
      }
    }

    return -1;
  };

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

        const closeTrigger =
          event.target.closest(
            '[data-modal-close]'
          );

        if (closeTrigger) {
          closeModal();
          return;
        }

        const previousTrigger =
          event.target.closest(
            '[data-modal-prev]'
          );

        if (previousTrigger) {
          navigateModal(-1);
          return;
        }

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

    const previousIndex =
      getAdjacentBioIndex(
        currentCastIndex,
        -1
      );

    const nextIndex =
      getAdjacentBioIndex(
        currentCastIndex,
        1
      );

    if (previousButton) {
      previousButton.hidden =
        previousIndex < 0;
    }

    if (nextButton) {
      nextButton.hidden =
        nextIndex < 0;
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

    const requestId =
      ++modalRequestId;

    content.innerHTML =
      renderModalContent(member);

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

      if (
        requestId !== modalRequestId
      ) {
        return;
      }

      if (
        !modalElement.classList.contains(
          'is-open'
        )
      ) {
        return;
      }

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

    document.addEventListener(
      'keydown',
      event => {
        if (
          !modal ||
          modal.hidden
        ) {
          return;
        }

        if (event.key === 'Escape') {
          event.preventDefault();

          closeModal();

          return;
        }

        if (event.key === 'ArrowLeft') {
          event.preventDefault();

          navigateModal(-1);

          return;
        }

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