const setSetting = (name, value) => {
  chrome.storage.sync.set({ [name]: value }, () => {
  });
};

const getSetting = async (name) => {
  return await new Promise((resolve, reject) => {
    chrome.storage.sync.get([name], (result) => {
      if (chrome.runtime.lastError) {
        return reject(chrome.runtime.lastError);
      }
      resolve(result[name]);
    });
  });
};

// const html = document.querySelector('html');

let settings = {
  preferredLanguageCodes: [],
  updatePreferredLanguageCodesOnManualSelection: true,
  autoEnable: true,
  autoEnableExceptOnVideoInPreferredLanguage: true,
  autoEnableExceptOnVideoInLanguageCodes: [],
  showGeneratedCaption: true,
  showTranslatedCaption: true,
};

const postSettings = () => {
  // html.setAttribute('data-youtube-subtitle-settings', JSON.stringify(settings));
  window.postMessage({ 
    contentscript: 'youtube-subtitle',
    type: 'settings',
    settings: settings
  }, "*");
};

(async () => {
  for(let name of Object.keys(settings)) {
    const value = await getSetting(name);
    if(value !== undefined) {
      settings[name] = value;
    }
  }

  const scripts = [
    chrome.runtime.getURL('scripts/contentscript.js')
  ]
  scripts.forEach((path) => {
    const s = document.createElement('script')
    s.src = path
    s.onload = () => {
      s.parentNode.removeChild(s);
      postSettings();
    }
    s.onerror = (e) => {
      console.error('Adding script failed:', e.target.src, e);
    }
    document.head.appendChild(s);
  });

})();

// Settings changed from storage
chrome.storage.onChanged.addListener(function(changes, namespace) {
  let hasChanged = false;
  for(name in changes) {
    if(JSON.stringify(settings[name]) !== JSON.stringify(changes[name].newValue)) {
      settings[name] = changes[name].newValue;
      hasChanged = true;
    }
  }
  // console.log('Settings from storage to contentscript:', settings);
  if(hasChanged) { 
    postSettings();
  }
});

// Settings changed from injected script
window.addEventListener('message', function({ data }) {
  if(data.injectedscript !== 'youtube-subtitle') return;
  if(data.type === 'settings') {
    // console.log('Settings from injected script to contentscript:', data.settings);
    Object.keys(data.settings).forEach(name => {
      const value = data.settings[name];
      if(JSON.stringify(value) === JSON.stringify(settings[name])) return;
      settings[name] = value;
      setSetting(name, value);
    });
  }
}, true); // useCapture: true