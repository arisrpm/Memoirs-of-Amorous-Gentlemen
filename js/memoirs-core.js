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

  /**
   * Run a callback once the DOM is ready.
   *
   * This allows individual modules to work whether they are loaded
   * through Squarespace Code Injection or directly on a page.
   */
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

  /**
   * Fetch a tab from the project's Google Sheet.
   *
   * Example:
   * Memoirs.getSheet('Cast')
   */
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
          let message = `Google Sheets request failed: ${response.status}`;

          try {
            const responseData = await response.json();

            if (responseData?.error?.message) {
              message += ` - ${responseData.error.message}`;
            }
          } catch (_) {
            // Use the original HTTP error.
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
        // Remove failed requests so a later attempt can retry.
        cache.sheets.delete(cacheKey);

        error(`Unable to load sheet "${sheetName}".`, err);

        throw err;
      });

    cache.sheets.set(cacheKey, request);

    return request;
  }

  // ------------------------------------------------------------
  // GOOGLE DOCS
  // ------------------------------------------------------------

  /**
   * Extract a Google Doc ID from a standard Google Docs URL.
   */
  function getGoogleDocId(value) {
    if (!value || typeof value !== 'string') {
      return '';
    }

    const match = value.match(
      /docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/
    );

    return match ? match[1] : '';
  }

  /**
   * Fetch a Google Doc as HTML.
   *
   * The document must be accessible publicly / to anyone with the link.
   */
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

        error(`Unable to load Google Doc "${docId}".`, err);

        throw err;
      });

    cache.docs.set(docId, request);

    return request;
  }

  /**
   * Strip Google Docs document-level markup while preserving
   * useful content formatting.
   */
  function cleanGoogleDocHTML(html) {
    if (!html) return '';

    const parser = new DOMParser();

    const doc = parser.parseFromString(html, 'text/html');

    // We want the document's content, not Google's full HTML document.
    const body = doc.body;

    if (!body) {
      return '';
    }

    // Remove content we definitely don't want injected into Squarespace.
    body.querySelectorAll(
      'script, style, meta, link, title'
    ).forEach(element => {
      element.remove();
    });

    // Remove Google-generated classes and IDs.
    body.querySelectorAll('*').forEach(element => {
      element.removeAttribute('class');
      element.removeAttribute('id');

      /**
       * Google Docs frequently exports presentation styles inline.
       *
       * We don't want its fonts, sizes, colors, margins, etc. overriding
       * the Memoirs website design.
       *
       * Semantic elements such as <strong>, <em>, <a>, <ul>, <ol>, etc.
       * remain intact.
       */
      element.removeAttribute('style');
    });

    return body.innerHTML.trim();
  }

  // ------------------------------------------------------------
  // GOOGLE DRIVE IMAGES
  // ------------------------------------------------------------

  /**
   * Extract a Google Drive file ID from common shared URLs.
   */
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

  /**
   * Convert a Google Drive share URL into an image-friendly URL.
   *
   * Normal Squarespace/CDN image URLs are returned untouched.
   */
  function normalizeImageUrl(value) {
    if (!value || typeof value !== 'string') {
      return '';
    }

    const url = value.trim();

    const fileId = getGoogleDriveFileId(url);

    if (!fileId) {
      return url;
    }

    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1600`;
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

  /**
   * Build a complete social URL from a username/handle.
   *
   * Full URLs are also accepted and returned untouched.
   */
  function buildSocialUrl(platform, value) {
    if (!platform || !value) {
      return '';
    }

    let username = String(value).trim();

    if (!username) {
      return '';
    }

    // Allow advanced users to provide a complete URL.
    if (/^https?:\/\//i.test(username)) {
      return username;
    }

    const key = platform.toLowerCase();

    const baseUrl = socialPlatforms[key];

    if (!baseUrl) {
      warn(`Unknown social platform: ${platform}`);
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
    if (!value) return false;

    try {
      new URL(value);
      return true;
    } catch (_) {
      return false;
    }
  }

  function clearCache(type = 'all') {
    if (type === 'all' || type === 'sheets') {
      cache.sheets.clear();
    }

    if (type === 'all' || type === 'docs') {
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