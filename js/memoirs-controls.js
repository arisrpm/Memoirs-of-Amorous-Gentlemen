(() => {
  'use strict';

  const MODULE = '[Memoirs Splash]';

  // ------------------------------------------------------------
  // INIT
  // ------------------------------------------------------------

  const init = () => {
    const splash = document.querySelector('#moag-splash');

    if (!splash || splash.dataset.controlsInitialized === 'true') {
      return;
    }

    const desktop = splash.querySelector(
      '.moag-splash__video--desktop'
    );

    const mobile = splash.querySelector(
      '.moag-splash__video--mobile'
    );

    const controls = splash.querySelector(
      '.moag-splash__controls'
    );

    if (!desktop || !mobile || !controls) {
      return;
    }

    const playButton = controls.querySelector(
      '[data-action="play"]'
    );

    const muteButton = controls.querySelector(
      '[data-action="mute"]'
    );

    const replayButton = controls.querySelector(
      '[data-action="replay"]'
    );

    if (!playButton || !muteButton || !replayButton) {
      return;
    }

    const playIcon = playButton.querySelector(
      '[data-icon="play"]'
    );

    const pauseIcon = playButton.querySelector(
      '[data-icon="pause"]'
    );

    const mutedIcon = muteButton.querySelector(
      '[data-icon="muted"]'
    );

    const volumeIcon = muteButton.querySelector(
      '[data-icon="volume"]'
    );

    if (!playIcon || !pauseIcon || !mutedIcon || !volumeIcon) {
      return;
    }

    splash.dataset.controlsInitialized = 'true';

    const mediaQuery = window.matchMedia(
      '(max-width: 767px)'
    );

    let activeVideo = null;

    // ----------------------------------------------------------
    // PREPARE SVG ICONS
    // ----------------------------------------------------------

    // Remove HTML hidden attributes from SVG paths.
    // JavaScript will control visibility using display instead.

    [
      playIcon,
      pauseIcon,
      mutedIcon,
      volumeIcon
    ].forEach(icon => {
      icon.removeAttribute('hidden');
    });

    // ----------------------------------------------------------
    // GET ACTIVE VIDEO
    // ----------------------------------------------------------

    const getActiveVideo = () => {
      return mediaQuery.matches ? mobile : desktop;
    };

    // ----------------------------------------------------------
    // UPDATE CONTROLS
    // ----------------------------------------------------------

    const updateControls = () => {
      if (!activeVideo) {
        return;
      }

      const isPaused =
        activeVideo.paused || activeVideo.ended;

      const isMuted =
        activeVideo.muted || activeVideo.volume === 0;

      // --------------------------------------------------------
      // PLAY / PAUSE ICON
      // --------------------------------------------------------

      playButton.setAttribute(
        'aria-label',
        isPaused ? 'Play video' : 'Pause video'
      );

      playButton.setAttribute(
        'title',
        isPaused ? 'Play video' : 'Pause video'
      );

      playIcon.style.display =
        isPaused ? 'block' : 'none';

      pauseIcon.style.display =
        isPaused ? 'none' : 'block';

      // --------------------------------------------------------
      // MUTE / UNMUTE ICON
      // --------------------------------------------------------

      muteButton.setAttribute(
        'aria-label',
        isMuted ? 'Unmute video' : 'Mute video'
      );

      muteButton.setAttribute(
        'title',
        isMuted ? 'Unmute video' : 'Mute video'
      );

      mutedIcon.style.display =
        isMuted ? 'block' : 'none';

      volumeIcon.style.display =
        isMuted ? 'none' : 'block';
    };

    // ----------------------------------------------------------
    // PLAY / PAUSE
    // ----------------------------------------------------------

    playButton.addEventListener('click', async () => {
      if (!activeVideo) {
        return;
      }

      if (activeVideo.paused || activeVideo.ended) {
        try {
          await activeVideo.play();
        } catch (error) {
          console.warn(
            `${MODULE} Playback prevented.`,
            error
          );
        }
      } else {
        activeVideo.pause();
      }

      updateControls();
    });

    // ----------------------------------------------------------
    // MUTE / UNMUTE
    // ----------------------------------------------------------

    muteButton.addEventListener('click', () => {
      if (!activeVideo) {
        return;
      }

      activeVideo.muted = !activeVideo.muted;

      updateControls();
    });

    // ----------------------------------------------------------
    // REPLAY
    // ----------------------------------------------------------

    replayButton.addEventListener('click', async () => {
      if (!activeVideo) {
        return;
      }

      try {
        activeVideo.currentTime = 0;
        await activeVideo.play();
      } catch (error) {
        console.warn(
          `${MODULE} Replay prevented.`,
          error
        );
      }

      updateControls();
    });

    // ----------------------------------------------------------
    // VIDEO EVENTS
    // ----------------------------------------------------------

    [desktop, mobile].forEach(video => {
      [
        'play',
        'pause',
        'ended',
        'volumechange',
        'loadedmetadata'
      ].forEach(eventName => {
        video.addEventListener(
          eventName,
          updateControls
        );
      });
    });

    // ----------------------------------------------------------
    // RESPONSIVE VIDEO HANDLING
    // ----------------------------------------------------------

    const handleViewportChange = () => {
      const previousVideo = activeVideo;

      activeVideo = getActiveVideo();

      if (
        previousVideo &&
        previousVideo !== activeVideo
      ) {
        previousVideo.pause();
      }

      updateControls();
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener(
        'change',
        handleViewportChange
      );
    } else {
      mediaQuery.addListener(
        handleViewportChange
      );
    }

    // ----------------------------------------------------------
    // INITIALIZE
    // ----------------------------------------------------------

    activeVideo = getActiveVideo();

    // Pause the video hidden by the current breakpoint.
    const inactiveVideo =
      activeVideo === desktop ? mobile : desktop;

    inactiveVideo.pause();

    // Set the initial icon states.
    updateControls();

    console.log(
      `${MODULE} Controls initialized successfully.`
    );
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