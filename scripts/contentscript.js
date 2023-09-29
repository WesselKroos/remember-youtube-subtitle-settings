(function () {
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
    retainPosition: false,
    positionStyle: ''
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

    const menuitem = e.composedPath().find(el => el?.classList?.contains('ytp-menuitem'));
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
  
  // Position

  // let captionWindow;
  // let classObserver;
  // let styleObserver;
  // let updatingPositionStyle = false;
  let styleElem;
  let ytdApp = document.querySelector('ytd-app')
  let position = null;

  const updatePosition = async () => {
    // console.log('update position', position)
    if(position === null) {
      styleElem.textContent = ''
      return
    }


    const normal = position?.normal
    const generated = position?.generated

    styleElem.textContent = `
      .ytp-caption-window-bottom:not(.ytp-caption-window-rollup):not(.ytp-dragging) {
        ${normal?.left !== undefined ? `left: ${normal?.left} !important;` : ''}
        ${normal?.top !== undefined ? `top: ${normal?.top} !important;` : ''}
        ${normal?.right !== undefined ? `right: ${normal?.right} !important;` : ''}
        ${normal?.bottom !== undefined ? `bottom: ${normal?.bottom} !important;` : ''}
        ${((parseFloat(normal?.bottom) ?? 100) < 7) ? 'margin-bottom: 0 !important;' : ''}
      }

      .ytp-caption-window-bottom.ytp-caption-window-rollup:not(.ytp-dragging) {
        ${generated?.left !== undefined ? `left: ${generated?.left} !important;` : ''}
        ${generated?.marginLeft !== undefined ? `margin-left: ${generated?.marginLeft} !important;` : ''}
        ${generated?.top !== undefined ? `top: ${generated?.top} !important;` : ''}
        ${generated?.right !== undefined ? `right: ${generated?.right} !important;` : ''}
        ${generated?.bottom !== undefined ? `bottom: ${generated?.bottom} !important;` : ''}
        ${((parseFloat(generated?.bottom) ?? 100) < 7) ? 'margin-bottom: 0 !important;' : ''}
      }
    `

    // console.log(styleElem.textContent)
  }

  const initPosition = async () => {
    try {
      styleElem = document.createElement('style')
      try {
        position = JSON.parse(await localStorage.getItem('subtitle-position'))
      } catch(ex) {
        console.warn(ex)
      }
      // console.log('initial position', position)
      updatePosition()
      document.body.appendChild(styleElem)

      let moved = false
      let captionWindow
      const onMoveEnd = async (e) => {
        window.removeEventListener('mouseup', onMoveEnd)
        window.removeEventListener('touchend', onMoveEnd)
        if(!moved) return

        try {
          // console.log('onMoveEnd', captionWindow, e.target)
          if(!captionWindow || !document.contains(captionWindow)) return

          const isAutoGenerated = captionWindow.classList.contains('ytp-caption-window-rollup')

          const newPosition = {
            left: captionWindow.style.left || undefined,
            right: captionWindow.style.right || undefined,
            top: captionWindow.style.top || undefined,
            bottom: captionWindow.style.bottom || undefined
          }
          if(isAutoGenerated) {
            const captionWindowMarginLeft = parseFloat(captionWindow.style.marginLeft)
            if(!isNaN(captionWindowMarginLeft)) {
              const container = captionWindow.closest('.ytp-caption-window-container')
              const containerWidth = parseFloat(container.clientWidth)
              newPosition.marginLeft = `${(captionWindowMarginLeft / containerWidth) * 100}%`
            }
          }
          position = {
            normal: isAutoGenerated ? position?.normal : newPosition,
            generated: !isAutoGenerated ? position?.generated : newPosition
          }

          // console.log('save', position)

          localStorage.setItem('subtitle-position', JSON.stringify(position))
          updatePosition()
        } catch(ex) {
          console.error(ex)
        }
      }
      const onMove = () => {
        moved = true
        window.removeEventListener('mousemove', onMove)
        window.removeEventListener('touchmove', onMove)
      }
      const onMoveStart = (e) => {
        captionWindow = e.target.closest('.ytp-caption-window-bottom, .ytp-caption-window-rollup')
        if(!captionWindow) return

        moved = false
        window.addEventListener('mousemove', onMove)
        window.addEventListener('touchmove', onMove)
        window.addEventListener('mouseup', onMoveEnd)
        window.addEventListener('touchend', onMoveEnd)
      }
      window.addEventListener('mousedown', onMoveStart)
      window.addEventListener('touchstart', onMoveStart)
    } catch(ex) {
      console.error(ex)
    }

    // captionWindow = document.querySelector('.ytp-caption-window-bottom')
    // if(!captionWindow) return

    // // console.log('initPosition', captionWindow, settings.positionStyle)
    
    // if(!styleElem) {
    //   styleElem = document.createElement('style')
    //   styleElem.textContent = '.captions-text { transform: none !important; }'
    //   document.body.appendChild(styleElem)
    //   // console.log(styleElem)
    // }

    // if(classObserver) classObserver.disconnect()
    // classObserver = new MutationObserver((mutationsList) => {
    //   // console.log('retainPosition', settings.retainPosition)
    //   if(!ytdApp) ytdApp = document.querySelector('ytd-app')
    //   if(ytdApp.__data?.data?.page !== 'watch') return
    //   if(!settings.retainPosition) return
    //   // console.log('class changed')

    //   const oldValue = mutationsList[0].oldValue
    //   const target = mutationsList[0].target
    //   const newValue = target.className
    //   // console.log(oldValue === newValue)
    //   if(oldValue === newValue) return

    //   // console.log(oldValue, newValue)
    //   const dragCompleted = oldValue.includes('ytp-dragging') && !newValue.includes('ytp-dragging')
    //   if(!dragCompleted) {
    //     updatingPositionStyle = true
    //     return
    //   }

    //   updatingPositionStyle = false
    //   const positionStyle = target.attributes.style.value.split(';').map(prop => {
    //     const [name, value] = prop.split(':')
    //     if(name.trim() === 'width') return
    //     if(name.trim() === 'height') return
    //     if(name.trim() === 'margin-left') return 'transform: translateX(-50%)'
    //     return prop
    //   }).filter(p => p).join(';')

    //   setSetting('positionStyle', positionStyle)
    //   console.log('dragged positionStyle to', positionStyle)
    // })
    // classObserver.observe(captionWindow, {
    //   attributes: true,
    //   attributeFilter: ['class'],
    //   attributeOldValue: true
    // })
    // // console.log('observing class change on', captionWindow)

    // const setCaptionPosition = () => {
    //   // console.log('setCaptionPosition', !settings.retainPosition, !settings.positionStyle, !captionWindow)
    //   if(!settings.retainPosition || !settings.positionStyle || !captionWindow) return
    //   if(captionWindow.attributes.style.value === settings.positionStyle) return

    //   // console.log('restored setCaptionPosition to', positionStyle)
    //   captionWindow.attributes.style.value = settings.positionStyle
    // }

    // if(styleObserver) styleObserver.disconnect()
    // styleObserver = new MutationObserver((mutationsList) => {
    //   // console.log('style changed', updatingPositionStyle, !!positionStyle)
    //   if(updatingPositionStyle || !settings.positionStyle || !captionWindow) return

    //   // const oldValue = mutationsList[0].oldValue
    //   // const newValue = captionWindow.attributes.style.value
    //   // // console.log(oldValue === newValue)
    //   // if(oldValue === newValue) return

    //   if(!captionWindow.attributes.style.value === settings.positionStyle) return

    //   // console.log('style incorrect. correcting...')
    //   setCaptionPosition()
    // })
    // styleObserver.observe(captionWindow, {
    //   attributes: true,
    //   attributeFilter: ['style'],
    //   attributeOldValue: true
    // })

    // setCaptionPosition()
  }

  // const isInsideCaptionWindow = (node) => {
  //   // if(node.classList?.contains('ytp-caption-segment')) return true
  //   // if(!node.parentNode) return false
  //   return (
  //     node.parentNode?.classList?.contains('caption-visual-line') ||
  //     node.parentNode?.classList?.contains('captions-text')
  //   )
  // }

  // const mutationsHasAddedNodes = mutations => mutations.find(mutation => (
  //   mutation.addedNodes?.length && 
  //   [...mutation.addedNodes].find(addedNode => (
  //     addedNode.tagName &&  // ignore text nodes
  //     addedNode.tagName !== 'svg' &&
  //     isInsideCaptionWindow(addedNode)
  //   )
  // )))

  const elementObserver = new MutationObserver((mutations) => {
    if(!ytdApp) ytdApp = document.querySelector('ytd-app')
    if(ytdApp.__data?.data?.page !== 'watch') return

    elementObserver.disconnect()
    // if(!mutationsHasAddedNodes(mutations)) return

    // console.log('caption window changed')
    initPosition()
  })
  elementObserver.observe(document.body, {
    childList: true,
    subtree:  true
  })
})()