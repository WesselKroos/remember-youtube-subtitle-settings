(function () {
  
  const waitForDomElement = (check, containerSelector, callback) => {
    if (check()) {
      callback()
    } else {
      const observer = new MutationObserver((mutationsList, observer) => {
        if (!check()) return
        observer.disconnect()
        callback()
      })
      observer.observe(document.querySelector(containerSelector), {
        childList: true,
        subtree: true
      })
      return observer
    }
  }

  const getYouTubeHostLanguageCode = () => {
    const cookies = document.cookie
      .split('; ')
      .reduce((list, cookie) => {
        const parts = cookie.split('=');
        list[parts[0]] = parts.splice(1).join('=');
        return list
      }, []);
    const params = new URLSearchParams(cookies.PREF || '');
    return params.get('hl') || '';
  };

  // const additionalPreferredLanguageCodes = [];
  // const html = document.querySelector('html');
  let settings = {
    preferredLanguageCodes: [getYouTubeHostLanguageCode() || 'en'],
    updatePreferredLanguageCodesOnManualSelection: true,
    autoEnable: true,
    autoEnableExceptOnVideoInPreferredLanguage: true,
    autoEnableExceptOnVideoInLanguageCodes: [],
    showGeneratedCaption: true,
    showTranslatedCaption: true,
    // ...JSON.parse(html.dataset.youtubeSubtitleSettings || '{}')
  };
  // console.log('settings:', settings);

  const setSetting = (name, value) => {
    settings[name] = value;
    window.postMessage({
      injectedscript: 'youtube-subtitle',
      type: 'settings',
      settings: settings
    }, "*");
  };

  window.addEventListener('message', function ({ data }) {
    if (data.contentscript !== 'youtube-subtitle') return;
    if (data.type === 'settings') {
      // console.log('Settings from contentscript to injected script:', data.settings);
      settings = {
        ...settings,
        ...data.settings
      };

      if(settings.autoEnable)
        setCaption(true);
    }
  }, true); // useCapture: true

  // const settingsObserver = new MutationObserver((mutationsList, observer) => {
  //     const newSettings = JSON.parse(html.dataset.youtubeSubtitleSettings || {});
  //     for(let name of Object.keys(newSettings)) {
  //         settings[name] = newSettings[name];
  //     }
  // });
  // settingsObserver.observe(html, {
  //     attributes: true,
  //     attributeFilter: ['data-youtube-subtitle-settings']
  // });

  // const ignoreTitles = [];

  // const settingsObserver = new MutationObserver((mutationsList, observer) => {
  //     const newSettings = JSON.parse(html.dataset.youtubeSubtitleSettings || {});
  //     for(let name of Object.keys(newSettings)) {
  //         settings[name] = newSettings[name];
  //     }
  // });
  // settingsObserver.observe(html, {
  //     attributes: true,
  //     attributeFilter: ['data-youtube-subtitle-settings']
  // });

  // const ignoreTitles = [];

  const setCaption = (allowTurnOff = false) => {
    // console.log('setCaption', settings);
    try {
      const player = document.querySelector('#movie_player');
      if (!player) {
        // console.warn('Cannot set caption. No #movie_player found on the page.');
        return;
      }

      // var title = document.querySelector('.title')?.textContent;
      // var excludedTitle = ignoreTitles.find(substring => title.indexOf(substring) !== -1);
      // if (excludedTitle) {
      //     // console.log(`Video title contains excluded substring: "${excludedTitle}" in "${title}"`);
      //     if (allowTurnOff)
      //         player.setOption('captions', 'track', {});
      //     return;
      // }

      // const preferredLanguageCodes = [...additionalPreferredLanguageCodes];
      // const preferredLanguageCodes = []
      // const storedPreferredLanguage = localStorage.getItem('youtube-subtitles.preferred-language')
      // if (storedPreferredLanguage) {
      //     settings.preferredLanguageCodes.push(storedPreferredLanguage);
      // }
      // if (!settings.preferredLanguageCodes.length) {
      //     const youTubeHostLanguageCode = getYouTubeHostLanguageCode();
      //     if (youTubeHostLanguageCode) {
      //         settings.preferredLanguageCodes.push(youTubeHostLanguageCode);
      //     }
      // }
      // console.log('preferredLanguageCodes:', settings.preferredLanguageCodes);


      // List available captions
      let languages = player.getOption('captions', 'tracklist', {
        includeAsr: true // Generated caption
      }) || [];
      if(!languages.length) {
        player.toggleSubtitles();
        languages = player.getOption('captions', 'tracklist', {
          includeAsr: true // Generated caption
        }) || [];
        player.toggleSubtitles();
        // console.log('subtitles was probably not enabled. Enable for a short term and got captions:', languages);
      }
      // console.log('languages', languages);

      const videoLanguage = languages.find(language => (
        (language.is_default || language.kind === 'asr')
      ));
      if (
        videoLanguage && (
          (settings.autoEnableExceptOnVideoInPreferredLanguage && (
            settings.preferredLanguageCodes.find(plc => plc.startsWith(videoLanguage?.languageCode))
          )) ||
          settings.autoEnableExceptOnVideoInLanguageCodes.find(plc => plc.startsWith(videoLanguage?.languageCode))
        )
      ) {
        if (allowTurnOff)
          player.setOption('captions', 'track', {});
        return;
      }

      // Current caption
      const currentLanguage = player.getOption('captions', 'track');
      // console.log('currentLanguage', currentLanguage);
      if (
        settings.preferredLanguageCodes.find(plc => plc.startsWith(currentLanguage?.translationLanguage?.languageCode)) ||
        (
          settings.preferredLanguageCodes.find(plc => plc.startsWith(currentLanguage?.languageCode)) &&
          !currentLanguage?.translationLanguage
        )
      ) {
        // console.log(`Caption already in the preferred language "${currentLanguage?.translationLanguage?.languageCode || currentLanguage?.languageCode}"`);
        return;
      }

      let language = settings.preferredLanguageCodes
        .map(preferredLanguageCode =>
          languages.find(language => (
            language?.languageCode?.startsWith(preferredLanguageCode) &&
            (settings.showGeneratedCaption || language.kind !== 'asr')
          ))
        )
        .find(language => language);

      if (!language && settings.showTranslatedCaption) {
        // console.log(`No "${settings.preferredLanguageCodes}" captions found. Searching for translateable captions`, languages);

        const translationSourceLanguage = languages
          .sort((a, b) => (a.is_default === b.is_default)
            ? 0
            : (a.is_default ? -1 : 1)
          )
          .find(language => (
            language.is_translateable &&
            (settings.showGeneratedCaption || language.kind !== 'asr')
          ));

        if (translationSourceLanguage) {
          // List available caption translations
          const translationLanguages = player.getOption('captions', 'translationLanguages') || [];
          const translationLanguage = settings.preferredLanguageCodes
            .map(preferredLanguageCode =>
              translationLanguages.find(tl => preferredLanguageCode === tl?.languageCode)
            )
            .find(language => language);

          if (translationLanguage) {
            language = translationSourceLanguage;
            language.translationLanguage = translationLanguage;
          } else {
            // console.log(`No translatable "${settings.preferredLanguageCodes}" languages found`, translationLanguages);
          }
        } else {
          // console.log('No translateable caption found.');
        }
      }

      if (!language) {
        // console.warn(`No "${settings.preferredLanguageCodes}" caption found`);
        return;
      }

      // console.log(`Setting caption to "${language?.translationLanguage?.languageCode || language.languageCode}"`, language);
      player.setOption('captions', 'track', language);
    } catch (err) {
      console.error('Failed to set caption', err);
    }
  };

  document.addEventListener('click', e => {
    if (
      e.target.classList.contains('ytp-subtitles-button') &&
      e.target.getAttribute('aria-pressed') === 'true'
    ) {
      setTimeout(setCaption, 1);
      return;
    }
  });

  const getPlayer = (() => {
    let player;
    return () => {
      if (!player || !player.isConnected) {
        player = document.querySelector('#movie_player');
        if (!player) {
          throw new Error('No #movie_playeron the page');
        }
      }
      return player;
    };
  })();

  const getPlayerCaptionLanguageCode = () => {
    let language = (getPlayer().getOption('captions', 'track') || {});
    if (language?.translationLanguage) {
      language = language.translationLanguage;
    }
    // console.log(language)
    return language?.languageCode;
  }

  document.addEventListener('mouseup', e => {
    if(!settings.updatePreferredLanguageCodesOnManualSelection) return;

    const menuitem = e.path.find(el => el?.classList?.contains('ytp-menuitem'));
    if (menuitem) {
      const previousLanguageCode = getPlayerCaptionLanguageCode();
      setTimeout(() => {
        const currentLanguageCode = getPlayerCaptionLanguageCode();
        if (currentLanguageCode !== previousLanguageCode) {
          const plc = [currentLanguageCode];
          if(currentLanguageCode.includes('-')) {
            plc.push(currentLanguageCode.split('-')[0])
          }
          setSetting('preferredLanguageCodes', plc);
          // localStorage.setItem('youtube-subtitles.preferred-language', currentLanguageCode);
          // console.log('Language changed from', previousLanguageCode, 'to', currentLanguageCode);
        }
      }, 0);
    }
  });

  document.addEventListener('keyup', e => {
    if (e.key !== 'c') {
      return;
    }

    const subtitlesBtn = document.querySelector('.ytp-subtitles-button');
    if (subtitlesBtn.getAttribute('aria-pressed') === 'false') {
      return;
    }

    setTimeout(setCaption, 1);
  });

  const init = () => {
    const isWatchPageUrl = () => (location.pathname === '/watch');
    const onPageNavigationFinished = (e) => {
      if (!isWatchPageUrl()) return;
      if(!settings.autoEnable) return;

      setCaption(true);
    }
    document.addEventListener('yt-navigate-finish', onPageNavigationFinished);
    document.removeEventListener('readystatechange', init);
    if(!settings.autoEnable) return;
  
    setCaption(true);
  };

  if(document.readyState === 'complete') {
    init();
  } else {
    document.addEventListener('readystatechange', init);
  }
})()