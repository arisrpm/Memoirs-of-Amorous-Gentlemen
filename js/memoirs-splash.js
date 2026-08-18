(() => {
  'use strict';

  /**
   * Memoirs of Amorous Gentlemen
   * Splash Video
   */

  const MODULE = '[Memoirs Splash]';
  const SELECTOR = '#moag-splash';
  const BREAKPOINT = 1024;

  if (window.MemoirsSplash?.initialized) {
    return;
  }

  let container = null;
  let desktopVideo = null;
  let mobileVideo = null;
  let activeVideo = null;

  // ------------------------------------------------------------
  // HELPERS
  // ------------------------------------------------------------

  const isMobile = () => {
    return window.innerWidth <= BREAKPOINT;
  };

  const prefersReducedMotion = () => {
    return window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;
  };

  const getActiveVideo = () => {
    return isMobile()
      ? mobileVideo
      : desktopVideo;
  };

  // ------------------------------------------------------------
  // FINAL FRAME
  // ------------------------------------------------------------

  const showFinalFrame = video => {
    if (!video) {
      return;
    }

    const seekToEnd = () => {
      /**
       * Seeking to duration exactly can occasionally
       * produce a blank frame depending on the browser.
       *
       * Back off very slightly from the absolute end.
       */
      const finalTime = Math.max(
        0,
        video.duration - 0.05
      );

      try {
        video.currentTime = finalTime;
      } catch (error) {
        console.warn(
          `${MODULE} Unable to seek to final frame.`,
          error
        );
      }
    };

    if (
      Number.isFinite(video.duration) &&
      video.duration > 0
    ) {
      seekToEnd();
      return;
    }

    video.addEventListener(
      'loadedmetadata',
      seekToEnd,
      {
        once: true,
      }
    );
  };

  // ------------------------------------------------------------
  // PLAY VIDEO
  // ------------------------------------------------------------

  const playVideo = video => {
    if (!video) {
      return;
    }

    video.loop = false;
    video.muted = true;

    /**
     * Reduced motion:
     * don't animate the splash.
     * Show its finished state instead.
     */
    if (prefersReducedMotion()) {
      video.pause();
      showFinalFrame(video);
      return;
    }

    /**
     * If this video has already finished,
     * leave it sitting on its final frame.
     */
    if (video.ended) {
      return;
    }

    const playPromise = video.play();

    if (
      playPromise &&
      typeof playPromise.catch === 'function'
    ) {
      playPromise.catch(error => {
        console.warn(
          `${MODULE} Autoplay prevented.`,
          error
        );
      });
    }
  };

  // ------------------------------------------------------------
  // SWITCH ACTIVE VIDEO
  // ------------------------------------------------------------

  const updateActiveVideo = () => {
    const nextVideo = getActiveVideo();

    if (!nextVideo) {
      return;
    }

    /**
     * Nothing changed.
     */
    if (nextVideo === activeVideo) {
      return;
    }

    /**
     * Stop the video that is no longer visible.
     */
    if (activeVideo) {
      activeVideo.pause();
    }

    activeVideo = nextVideo;

    playVideo(activeVideo);
  };

  // ------------------------------------------------------------
  // VIDEO EVENTS
  // ------------------------------------------------------------

  const bindVideoEvents = video => {
    if (!video) {
      return;
    }

    video.loop = false;
    video.muted = true;

    /**
     * Explicitly pause at completion.
     *
     * The browser naturally holds the last frame,
     * but this makes our intent clear and prevents
     * anything else from restarting it.
     */
    video.addEventListener(
      'ended',
      () => {
        video.pause();

        console.log(
          `${MODULE} Video completed. Holding final frame.`
        );
      }
    );
  };

  // ------------------------------------------------------------
  // RESIZE
  // ------------------------------------------------------------

  let resizeTimer = null;

  const handleResize = () => {
    clearTimeout(resizeTimer);

    resizeTimer = setTimeout(
      updateActiveVideo,
      100
    );
  };

  // ------------------------------------------------------------
  // INIT
  // ------------------------------------------------------------

  const init = () => {
    container =
      document.querySelector(SELECTOR);

    if (!container) {
      return;
    }

    desktopVideo =
      container.querySelector(
        '.moag-splash__video--desktop'
      );

    mobileVideo =
      container.querySelector(
        '.moag-splash__video--mobile'
      );

    if (!desktopVideo || !mobileVideo) {
      console.warn(
        `${MODULE} Splash videos not found.`
      );

      return;
    }

    bindVideoEvents(desktopVideo);
    bindVideoEvents(mobileVideo);

    updateActiveVideo();

    window.addEventListener(
      'resize',
      handleResize
    );

    console.log(
      `${MODULE} Initialized.`
    );
  };

  // ------------------------------------------------------------
  // PUBLIC MODULE
  // ------------------------------------------------------------

  window.MemoirsSplash = {
    initialized: true,
    init,
  };

  // ------------------------------------------------------------
  // START
  // ------------------------------------------------------------

  if (document.readyState === 'loading') {
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