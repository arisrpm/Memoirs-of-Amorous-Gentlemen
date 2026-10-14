(() => {
  'use strict';

  const MODULE = '[Memoirs Splash]';

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

    splash.dataset.controlsInitialized = 'true';

    const playButton = controls.querySelector(
      '[data-action="play"]'
    );

    const muteButton = controls.querySelector(
      '[data-action="mute"]'
    );

    const replayButton = controls.querySelector(
      '[data-action="replay"]'
    );

    const mediaQuery = window.matchMedia(
      '(max-width: 767px)'
    );

    let activeVideo = null;

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

    const isPaused = activeVideo.paused || activeVideo.ended;
    const isMuted = activeVideo.muted;

    // Play / Pause
    playButton.setAttribute(
        'aria-label',
        isPaused ? 'Play video' : 'Pause video'
    );

    const playIcon = playButton.querySelector('[data-icon="play"]');
    const pauseIcon = playButton.querySelector('[data-icon="pause"]');

    playIcon.style.display = isPaused ? '' : 'none';
    pauseIcon.style.display = isPaused ? 'none' : '';

    // Mute / Unmute
    muteButton.setAttribute(
        'aria-label',
        isMuted ? 'Unmute video' : 'Mute video'
    );

    const mutedIcon = muteButton.querySelector('[data-icon="muted"]');
    const volumeIcon = muteButton.querySelector('[data-icon="volume"]');

    mutedIcon.style.display = isMuted ? '' : 'none';
    volumeIcon.style.display = isMuted ? 'none' : '';
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

      activeVideo.currentTime = 0;

      try {
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
      ['play', 'pause', 'ended', 'volumechange'].forEach(
        eventName => {
          video.addEventListener(
            eventName,
            updateControls
          );
        }
      );
    });

    // ----------------------------------------------------------
    // RESPONSIVE VIDEO HANDLING
    // ----------------------------------------------------------

    const handleViewportChange = () => {
      const previousVideo = activeVideo;

      activeVideo = getActiveVideo();

      if (previousVideo && previousVideo !== activeVideo) {
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
      mediaQuery.addListener(handleViewportChange);
    }

    // ----------------------------------------------------------
    // INITIALIZE
    // ----------------------------------------------------------

    activeVideo = getActiveVideo();

    // Stop hidden video from playing.
    const inactiveVideo =
      activeVideo === desktop ? mobile : desktop;

    inactiveVideo.pause();

    updateControls();

    console.log(`${MODULE} Controls initialized.`);
  };

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