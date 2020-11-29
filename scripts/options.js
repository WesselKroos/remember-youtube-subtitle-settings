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

const settings = {
  preferredLanguageCodes: [],
  updatePreferredLanguageCodesOnManualSelection: true,
  autoEnable: true,
  autoEnableExceptOnVideoInPreferredLanguage: true,
  autoEnableExceptOnVideoInLanguageCodes: [],
  showGeneratedCaption: true,
  showTranslatedCaption: true,
};
const updateInputs = () => {
  Object.keys(settings).forEach(async name => {
    let value = await getSetting(name);
    if(value === undefined) {
      value = settings[name];
    }
    const input = document.querySelector(`[name="${name}"]`);
    if(input.type === 'checkbox') {
      input.checked = value;
    } else if(input.type === 'text') {
      input.value = value.join(' ');
    }
  });
};
updateInputs();

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
    updateInputs();
  }
});

const inputsCheckbox = document.querySelectorAll('[type="checkbox"]');
inputsCheckbox.forEach(input => {
  input.addEventListener('change', (e) => {
    setSetting(input.name, input.checked);
  });
});

const inputsText = document.querySelectorAll('[type="text"]');
inputsText.forEach(input => {
  input.addEventListener('change', (e) => {
    setSetting(input.name, input.value.split(' '));
  });
});
