export default class Settings {
  html;

  // additionalPreferredLanguageCodes = [];
  // ignoreTitles = [];
  showCaptionOnVideoInPreferredLanguage = false;
  showGeneratedCaption = true;
  showTranslatedCaption = true;

  constructor(html) {
    this.html = html;
    this.updatesettings();
    this.sync();
  }

  updatesettings = () => {
    const newSettings = JSON.parse(this.html.dataset.youtubeSubtitleSettings || {});
    for (let name of Object.keys(newSettings)) {
      this[name] = newSettings[name];
    }
  }

  observer = new MutationObserver((mutationsList, observer) => {
    this.updatesettings();
    this.syncListeners.forEach(listener => listener());
  });
  sync = () => {
    this.observer.observe(this.html, {
      attributes: true,
      attributeFilter: ['data-youtube-subtitle-settings']
    });
  }
  desync = () => {
    this.observer.disconnect();
  }

  syncListeners = [];
  addSyncEventListener = (listener) => {
    this.syncListeners.push(listener);
  }
  removeSyncListener = (listener) => {
    const index = this.syncListeners.findIndex(listener);
    this.syncListeners.splice(index, 1);
  }
}