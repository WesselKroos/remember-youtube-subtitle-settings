(function () {
    const additionalPreferredLanguageCodes = [];
    const showCaptionOnVideoInPreferredLanguage = true;
    const showGeneratedCaption = true;
    const showTranslatedCaption = true;
    const ignoreTitles = [];

    const getYouTubeHostLanguageCode = () => {
        const cookies = document.cookie
            .split('; ')
            .reduce((list, cookie) => {
              const parts = cookie.split('=');
              list[parts[0]] = parts.splice(1).join('=');
              return list
            }, []);
        const params = new URLSearchParams(cookies.PREF || '');
        const hostLanguage = params.get('hl') || '';
        const languageCode = hostLanguage.substr(0, 2);
        return languageCode;
    };

    const setCaption = () => {
        try {
            const player = document.querySelector('#movie_player');
            if (!player) {
                console.warn('Cannot set caption. No #movie_player found on the page.');
                return;
            }

            var title = document.querySelector('.title')?.textContent;
            var excludedTitle = ignoreTitles.find(substring => title.indexOf(substring) !== -1);
            if (excludedTitle) {
                console.log(`Video title contains excluded substring: "${excludedTitle}" in "${title}"`);
                player.setOption('captions', 'track', {});
                return;
            }

            const preferredLanguageCodes = [ ...additionalPreferredLanguageCodes];
            const youTubeHostLanguageCode = getYouTubeHostLanguageCode();
            if(youTubeHostLanguageCode) {
                preferredLanguageCodes.push(youTubeHostLanguageCode);
            }
            console.log('preferredLanguageCodes:', preferredLanguageCodes);

            // Current caption
            const currentLanguage = player.getOption('captions', 'track');
            console.log('currentLanguage', currentLanguage);
            if(
                preferredLanguageCodes.includes(currentLanguage?.translationLanguage?.languageCode) ||
                (
                    preferredLanguageCodes.includes(currentLanguage?.languageCode) &&
                    !currentLanguage?.translationLanguage
                )
            ) {
                console.log(`Caption already in the preferred language "${currentLanguage?.translationLanguage?.languageCode || currentLanguage?.languageCode}"`);
                return;
            }

            // List available captions
            const languages = player.getOption('captions', 'tracklist', {
                includeAsr: true // Generated caption
            }) || [];

            let language = languages
                .find(language =>
                    preferredLanguageCodes.includes(language.languageCode) &&
                    (showGeneratedCaption || language.kind !== 'asr')
                );

            if (
                language &&
                (!showCaptionOnVideoInPreferredLanguage && (language.is_default || language.kind === 'asr'))
            ) {
                console.log(`Not showing caption for the video in the default language "${language.languageCode}"`, language);
                return;
            }

            if (!language && showTranslatedCaption) {
                console.log(`No "${preferredLanguageCodes}" captions found. Searching for translateable captions`, languages);

                const translationSourceLanguage = languages
                    .sort((a, b) => (a.is_default === b.is_default)
                        ? 0
                        : (a.is_default ? -1 : 1)
                    )
                    .find(language => (
                        language.is_translateable &&
                        (showGeneratedCaption || language.kind !== 'asr')
                    ));

                if (translationSourceLanguage) {
                    // List available caption translations
                    const translationLanguages = player.getOption('captions', 'translationLanguages') || [];
                    const translationLanguage = translationLanguages
                        .find(language =>
                            preferredLanguageCodes.includes(language.languageCode)
                        );

                    if (translationLanguage) {
                        language = translationSourceLanguage;
                        language.translationLanguage = translationLanguage;
                    } else {
                        console.log(`No translatable "${preferredLanguageCodes}" languages found`, translationLanguages);
                    }
                } else {
                    console.log('No translateable caption found.');
                }
            }

            if (!language) {
                console.warn(`No "${preferredLanguageCodes}" caption found`);
                return;
            }

            console.log(`Setting caption to "${language?.translationLanguage?.languageCode || language.languageCode}"`, language);
            player.setOption('captions', 'track', language);
        } catch (err) {
            console.error('Failed to set caption', err);
        }
    };

    document.__defineSetter__('title', function (val) {
        document.querySelector('title').childNodes[0].nodeValue = val;
        const waitForTitle = setTimeout(setCaption, 100);
    });

    window.addEventListener('load', setCaption);

    document.addEventListener('click', e => {
        if (
            !e.target.classList.contains('ytp-subtitles-button') ||
            e.target.getAttribute('aria-pressed') === 'false'
        ) {
            return;
        }

        setTimeout(setCaption, 1);
    });

    document.addEventListener('keyup', e => {
        if(e.key !== 'c') {
            return;
        }

        const subtitlesBtn = document.querySelector('.ytp-subtitles-button');
        if (subtitlesBtn.getAttribute('aria-pressed') === 'false') {
            return;
        }

        setTimeout(setCaption, 1);
    });
})()