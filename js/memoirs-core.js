(() => {
  'use strict';

  /**
   * Memoirs of Amorous Gentlemen
   * Shared Squarespace / Google Data Utilities
   */

  // Prevent the core from being initialized more than once.
  if (window.Memoirs?.initialized) {
    return;
  }

  // ------------------------------------------------------------
  // CONFIG
  // ------------------------------------------------------------

  const config = {
    sheetId: '1tafXwiXrdLaZnofHTEQ1A0OQMRqcrawLxOe6n2aK0-I',
    apiKey: 'AIzaSyD7t8x-ium7nbqFzQZ8M9-9bSVNfyqo9ek',
    debug: true,
  };

  // ------------------------------------------------------------
  // INTERNAL CACHE
  // ------------------------------------------------------------

  const cache = {
    sheets: new Map(),
    docs: new Map(),
  };

  // ------------------------------------------------------------
  // LOGGING
  // ------------------------------------------------------------

  function log(...args) {
    if (!config.debug) return;

    console.log('[Memoirs]', ...args);
  }

  function warn(...args) {
    console.warn('[Memoirs]', ...args);
  }

  function error(...args) {
    console.error('[Memoirs]', ...args);
  }

  // ------------------------------------------------------------
  // READY
  // ------------------------------------------------------------

  function ready(callback) {
    if (typeof callback !== 'function') return;

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback, {
        once: true,
      });
    } else {
      callback();
    }
  }

  // ------------------------------------------------------------
  // GOOGLE SHEETS
  // ------------------------------------------------------------

  async function getSheet(sheetName, options = {}) {
    if (!sheetName) {
      throw new Error('A Google Sheet tab name is required.');
    }

    if (!config.sheetId || !config.apiKey) {
      throw new Error(
        'Memoirs Google Sheet ID and API key must be configured.'
      );
    }

    const {
      forceRefresh = false,
    } = options;

    const cacheKey = sheetName.toLowerCase();

    if (!forceRefresh && cache.sheets.has(cacheKey)) {
      log(`Using cached sheet: ${sheetName}`);

      return cache.sheets.get(cacheKey);
    }

    const range = encodeURIComponent(sheetName);

    const url =
      `https://sheets.googleapis.com/v4/spreadsheets/` +
      `${config.sheetId}/values/${range}?key=${config.apiKey}`;

    log(`Fetching sheet: ${sheetName}`);

    const request = fetch(url)
      .then(async response => {
        if (!response.ok) {
          let message =
            `Google Sheets request failed: ${response.status}`;

          try {
            const responseData = await response.json();

            if (responseData?.error?.message) {
              message += ` - ${responseData.error.message}`;
            }
          } catch (_) {
            // Keep original HTTP error.
          }

          throw new Error(message);
        }

        return response.json();
      })
      .then(data => {
        const values = data.values || [];

        log(`Loaded sheet: ${sheetName}`, values);

        return values;
      })
      .catch(err => {
        cache.sheets.delete(cacheKey);

        error(
          `Unable to load sheet "${sheetName}".`,
          err
        );

        throw err;
      });

    cache.sheets.set(cacheKey, request);

    return request;
  }

  // ------------------------------------------------------------
  // SHEET OBJECTS
  // ------------------------------------------------------------

  /**
   * Convert a Google Sheet tab into an array of objects.
   *
   * Example:
   *
   * NAME | ROLE | IMAGE URL
   *
   * becomes:
   *
   * {
   *   name: '',
   *   role: '',
   *   image_url: ''
   * }
   */
  async function getObjects(sheetName, options = {}) {
    const rows = await getSheet(sheetName, options);

    if (!rows.length) {
      return [];
    }

    const normalizeHeader = value => {
      return String(value || '')
        .trim()
        .toLowerCase()
        .replace(/\(x\)/g, 'x')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
    };

    const headers = rows[0].map(normalizeHeader);

    return rows
      .slice(1)
      .filter(row => {
        return row.some(cell =>
          String(cell || '').trim()
        );
      })
      .map(row => {
        const object = {};

        headers.forEach((header, index) => {
          if (!header) return;

          object[header] =
            String(row[index] || '').trim();
        });

        /**
         * Normalize Twitter/X column.
         *
         * "TWITTER (X)" becomes twitter_x through the
         * header normalization above. The Cast module
         * expects member.twitter.
         */
        if (object.twitter_x && !object.twitter) {
          object.twitter = object.twitter_x;
        }

        return object;
      });
  }

  // ------------------------------------------------------------
  // GOOGLE DOCS
  // ------------------------------------------------------------

  function getGoogleDocId(value) {
    if (!value || typeof value !== 'string') {
      return '';
    }

    const match = value.match(
      /docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/
    );

    return match ? match[1] : '';
  }

  async function getGoogleDoc(docUrl, options = {}) {
    const docId = getGoogleDocId(docUrl);

    if (!docId) {
      warn('Invalid Google Doc URL:', docUrl);

      return '';
    }

    const {
      forceRefresh = false,
    } = options;

    if (!forceRefresh && cache.docs.has(docId)) {
      log(`Using cached Google Doc: ${docId}`);

      return cache.docs.get(docId);
    }

    const url =
      `https://docs.google.com/feeds/download/documents/export/Export` +
      `?id=${encodeURIComponent(docId)}&exportFormat=html`;

    log(`Fetching Google Doc: ${docId}`);

    const request = fetch(url)
      .then(response => {
        if (!response.ok) {
          throw new Error(
            `Google Doc request failed: ${response.status}`
          );
        }

        return response.text();
      })
      .then(html => {
        return cleanGoogleDocHTML(html);
      })
      .catch(err => {
        cache.docs.delete(docId);

        error(
          `Unable to load Google Doc "${docId}".`,
          err
        );

        throw err;
      });

    cache.docs.set(docId, request);

    return request;
  }

  // ------------------------------------------------------------
  // GOOGLE DOC HTML CLEANUP
  // ------------------------------------------------------------

  /**
   * Convert Google Docs presentation formatting into
   * semantic HTML before stripping Google's CSS/classes.
   *
   * This allows:
   *
   * font-style: italic
   *      ->
   * <em>
   *
   * font-weight: bold
   *      ->
   * <strong>
   *
   * The site's CSS can then completely control presentation.
   */
  function cleanGoogleDocHTML(html) {
    if (!html) {
      return '';
    }

    const parser = new DOMParser();

    const doc = parser.parseFromString(
      html,
      'text/html'
    );

    const body = doc.body;

    if (!body) {
      return '';
    }

    // ----------------------------------------------------------
    // REMOVE DOCUMENT-LEVEL JUNK
    // ----------------------------------------------------------

    body.querySelectorAll(
      'script, style, meta, link, title'
    ).forEach(element => {
      element.remove();
    });

    // ----------------------------------------------------------
    // DETECT GOOGLE DOC FORMATTING
    // BEFORE REMOVING CLASSES / STYLES
    // ----------------------------------------------------------

    body.querySelectorAll('span').forEach(span => {
      let isItalic = false;
      let isBold = false;

      /**
       * First inspect inline styles.
       */
      const inlineStyle =
        span.getAttribute('style') || '';

      if (
        /font-style\s*:\s*italic/i.test(
          inlineStyle
        )
      ) {
        isItalic = true;
      }

      const inlineWeight = inlineStyle.match(
        /font-weight\s*:\s*([^;]+)/i
      );

      if (inlineWeight) {
        const weight =
          inlineWeight[1].trim().toLowerCase();

        if (
          weight === 'bold' ||
          weight === 'bolder' ||
          parseInt(weight, 10) >= 600
        ) {
          isBold = true;
        }
      }

      /**
       * Google Docs frequently puts formatting inside
       * generated CSS classes rather than inline styles.
       *
       * getComputedStyle() lets us inspect the resolved
       * formatting while Google's <style> block still exists.
       */
      try {
        const computed =
          doc.defaultView?.getComputedStyle(span);

        if (computed) {
          if (
            computed.fontStyle === 'italic' ||
            computed.fontStyle === 'oblique'
          ) {
            isItalic = true;
          }

          const computedWeight =
            computed.fontWeight;

          if (
            computedWeight === 'bold' ||
            computedWeight === 'bolder' ||
            parseInt(computedWeight, 10) >= 600
          ) {
            isBold = true;
          }
        }
      } catch (_) {
        // Computed styles are supplemental only.
      }

      if (!isItalic && !isBold) {
        return;
      }

      /**
       * Preserve the span's contents rather than using
       * textContent so nested links/etc. survive.
       */
      let replacement;

      if (isItalic && isBold) {
        replacement =
          doc.createElement('strong');

        const em = doc.createElement('em');

        while (span.firstChild) {
          em.appendChild(span.firstChild);
        }

        replacement.appendChild(em);
      } else if (isItalic) {
        replacement =
          doc.createElement('em');

        while (span.firstChild) {
          replacement.appendChild(
            span.firstChild
          );
        }
      } else {
        replacement =
          doc.createElement('strong');

        while (span.firstChild) {
          replacement.appendChild(
            span.firstChild
          );
        }
      }

      span.replaceWith(replacement);
    });

    // ----------------------------------------------------------
    // CLEAN GOOGLE PRESENTATION ATTRIBUTES
    // ----------------------------------------------------------

    body.querySelectorAll('*').forEach(element => {
      element.removeAttribute('class');
      element.removeAttribute('id');
      element.removeAttribute('style');

      /**
       * Strip Google's extra presentation attributes while
       * preserving useful link attributes.
       */
      element.removeAttribute('dir');
    });

    // ----------------------------------------------------------
    // CLEAN LINKS
    // ----------------------------------------------------------

    body.querySelectorAll('a').forEach(link => {
      const href = link.getAttribute('href');

      if (!href) {
        return;
      }

      /**
       * Open external biography links in a new tab.
       */
      link.setAttribute(
        'target',
        '_blank'
      );

      link.setAttribute(
        'rel',
        'noopener noreferrer'
      );
    });

    return body.innerHTML.trim();
  }

  // ------------------------------------------------------------
  // GOOGLE DRIVE IMAGES
  // ------------------------------------------------------------

  function getGoogleDriveFileId(value) {
    if (!value || typeof value !== 'string') {
      return '';
    }

    const patterns = [
      /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/,
      /drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/,
      /drive\.google\.com\/uc\?.*?id=([a-zA-Z0-9_-]+)/,
    ];

    for (const pattern of patterns) {
      const match = value.match(pattern);

      if (match) {
        return match[1];
      }
    }

    return '';
  }

  function normalizeImageUrl(value) {
    if (!value || typeof value !== 'string') {
      return '';
    }

    const url = value.trim();

    const fileId =
      getGoogleDriveFileId(url);

    if (!fileId) {
      return url;
    }

    return (
      `https://drive.google.com/thumbnail` +
      `?id=${fileId}&sz=w1600`
    );
  }

  // ------------------------------------------------------------
  // SOCIAL URLS
  // ------------------------------------------------------------

  const socialPlatforms = {
    instagram: 'https://www.instagram.com/',
    facebook: 'https://www.facebook.com/',
    twitter: 'https://x.com/',
    tiktok: 'https://www.tiktok.com/@',
    youtube: 'https://www.youtube.com/@',
  };

  function buildSocialUrl(platform, value) {
    if (!platform || !value) {
      return '';
    }

    let username =
      String(value).trim();

    if (!username) {
      return '';
    }

    if (/^https?:\/\//i.test(username)) {
      return username;
    }

    const key =
      platform.toLowerCase();

    const baseUrl =
      socialPlatforms[key];

    if (!baseUrl) {
      warn(
        `Unknown social platform: ${platform}`
      );

      return '';
    }

    username = username
      .replace(/^@/, '')
      .replace(/^\/+/, '');

    return `${baseUrl}${username}`;
  }

  // ------------------------------------------------------------
  // GENERAL HELPERS
  // ------------------------------------------------------------

  function isValidUrl(value) {
    if (!value) {
      return false;
    }

    try {
      new URL(value);

      return true;
    } catch (_) {
      return false;
    }
  }

  function clearCache(type = 'all') {
    if (
      type === 'all' ||
      type === 'sheets'
    ) {
      cache.sheets.clear();
    }

    if (
      type === 'all' ||
      type === 'docs'
    ) {
      cache.docs.clear();
    }

    log(`Cache cleared: ${type}`);
  }

  // ------------------------------------------------------------
  // PUBLIC API
  // ------------------------------------------------------------

  window.Memoirs = {
    initialized: true,

    config,

    ready,

    getSheet,
    getObjects,

    getGoogleDoc,
    getGoogleDocId,

    normalizeImageUrl,
    getGoogleDriveFileId,

    buildSocialUrl,

    isValidUrl,
    clearCache,

    log,
    warn,
    error,
  };

  log('Core initialized.');
})();