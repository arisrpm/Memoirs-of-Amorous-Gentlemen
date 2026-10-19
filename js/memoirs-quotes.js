(() => {
  'use strict';

  /**
   * Memoirs of Amorous Gentlemen
   * Quotes Rotator — Google Sheets + Smooth Fade
   *
   * Supported HTML in Google Sheets:
   *
   * <br>
   * <em>...</em>
   * <i>...</i>
   * <strong>...</strong>
   * <b>...</b>
   */

  const MODULE = '[Memoirs Quotes]';

  // ------------------------------------------------------------
  // CONFIG
  // ------------------------------------------------------------

  const config = {
    sheetId:
      '1tafXwiXrdLaZnofHTEQ1A0OQMRqcrawLxOe6n2aK0-I',

    sheetName:
      'Quotes',

    apiKey:
      'AIzaSyD7t8x-ium7nbqFzQZ8M9-9bSVNfyqo9ek',

    selector:
      '#moag-quotes',

    // Time each quote remains fully visible. Speed Up
    displayDuration: 4000,

    // Fade-out and fade-in duration (each).
    fadeDuration: 700,
  };

  // ------------------------------------------------------------
  // STATE
  // ------------------------------------------------------------

  let quotes = [];
  let currentIndex = 0;
  let timer = null;

  // ------------------------------------------------------------
  // SAFE RICH TEXT
  // ------------------------------------------------------------

  const richText = value => {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')

      // Restore allowed formatting tags.
      .replace(
        /&lt;(\/?(?:em|strong|i|b)\s*)&gt;/gi,
        '<$1>'
      )

      // Restore line breaks.
      .replace(
        /&lt;br\s*\/?&gt;/gi,
        '<br>'
      );
  };

  // ------------------------------------------------------------
  // GET QUOTES
  // ------------------------------------------------------------

  const getQuotes = async () => {
    const range = encodeURIComponent(
      `${config.sheetName}!A:B`
    );

    const url =
      `https://sheets.googleapis.com/v4/spreadsheets/` +
      `${config.sheetId}/values/${range}` +
      `?key=${encodeURIComponent(config.apiKey)}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `Google Sheets request failed: ${response.status}`
      );
    }

    const data = await response.json();

    const rows = data.values || [];

    // First row contains column headings.
    return rows
      .slice(1)
      .map(row => ({
        quote: String(row[0] || '').trim(),
        author: String(row[1] || '').trim(),
      }))
      .filter(item => item.quote);
  };

  // ------------------------------------------------------------
  // RENDER QUOTE
  // ------------------------------------------------------------

  const renderQuote = (container, quote) => {
    const quoteElement = container.querySelector(
      '.moag-quotes__quote'
    );

    const authorElement = container.querySelector(
      '.moag-quotes__author'
    );

    if (!quoteElement || !authorElement) {
      return;
    }

    quoteElement.innerHTML = richText(quote.quote);

    authorElement.innerHTML = richText(quote.author);
    authorElement.hidden = !quote.author;
  };

  // ------------------------------------------------------------
  // SHOW INITIAL QUOTE
  // ------------------------------------------------------------

  const showInitialQuote = container => {
    const item = container.querySelector(
      '.moag-quotes__item'
    );

    if (!item || !quotes.length) {
      return;
    }

    renderQuote(container, quotes[0]);

    container.classList.remove('is-loading');

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        item.classList.add('is-visible');
      });
    });
  };

  // ------------------------------------------------------------
  // NEXT QUOTE
  // ------------------------------------------------------------

  const nextQuote = container => {
    const item = container.querySelector(
      '.moag-quotes__item'
    );

    if (!item || quotes.length <= 1) {
      return;
    }

    // Fade out current quote.
    item.classList.remove('is-visible');

    timer = window.setTimeout(() => {
      currentIndex =
        (currentIndex + 1) % quotes.length;

      renderQuote(container, quotes[currentIndex]);

      // Fade in new quote.
      requestAnimationFrame(() => {
        item.classList.add('is-visible');
      });

      // Schedule next rotation after the quote is visible.
      timer = window.setTimeout(
        () => nextQuote(container),
        config.displayDuration + config.fadeDuration
      );

    }, config.fadeDuration);
  };

  // ------------------------------------------------------------
  // START / STOP
  // ------------------------------------------------------------

  const startRotation = container => {
    stopRotation();

    if (quotes.length <= 1) {
      return;
    }

    timer = window.setTimeout(
      () => nextQuote(container),
      config.displayDuration + config.fadeDuration
    );
  };

  const stopRotation = () => {
    if (timer !== null) {
      window.clearTimeout(timer);
      timer = null;
    }
  };

  // ------------------------------------------------------------
  // VISIBILITY
  // ------------------------------------------------------------

  const handleVisibility = container => {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        stopRotation();
      } else {
        startRotation(container);
      }
    });
  };

  // ------------------------------------------------------------
  // INIT
  // ------------------------------------------------------------

  const init = async () => {
    const container = document.querySelector(
      config.selector
    );

    if (!container) {
      return;
    }

    container.classList.add('is-loading');

    try {
      quotes = await getQuotes();

      console.log(
        `${MODULE} Loaded ${quotes.length} quote(s).`,
        quotes
      );

      if (!quotes.length) {
        container.hidden = true;
        return;
      }

      currentIndex = 0;

      showInitialQuote(container);

      const reducedMotion = window.matchMedia(
        '(prefers-reduced-motion: reduce)'
      ).matches;

      if (!reducedMotion && quotes.length > 1) {
        startRotation(container);
        handleVisibility(container);
      }

    } catch (error) {
      console.error(
        `${MODULE} Unable to load quotes.`,
        error
      );

      container.hidden = true;
    }
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