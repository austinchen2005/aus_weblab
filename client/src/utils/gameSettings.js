// Game settings with default values
export const DEFAULT_SETTINGS = {
  initialDealDelay: 200, // 0.2s in milliseconds
  repeatDealDelay: 1500, // 1.5s in milliseconds
  dealerDrawDelay: 1500, // 1.5s in milliseconds
  cardPopScale: 1.15, // Scale for card popping effect
  // Sound volumes (0–1). These are NOT exposed on the settings page.
  dealSoundVolume: 0.5,
  winSoundVolume: 0.7,
  loseSoundVolume: 0.7,
  // Achievement popup duration in ms (not exposed in settings UI)
  achievementPopupDuration: 5000,
};

// Get setting from localStorage or return default
export const getSetting = (key) => {
  const stored = localStorage.getItem(`gameSetting_${key}`);
  if (stored !== null) {
    const value = parseFloat(stored);
    // Validate range
    if (key === 'cardPopScale') {
      return Math.max(1.0, Math.min(2.0, value));
    } else if (key === 'dealSoundVolume' || key === 'winSoundVolume' || key === 'loseSoundVolume') {
      return Math.max(0, Math.min(1, value));
    } else if (key === 'achievementPopupDuration') {
      // Allow 1–10 seconds in ms
      return Math.max(1000, Math.min(10000, value));
    } else {
      // Deal/draw delays: allow 0.1s to 5s (in ms)
      return Math.max(100, Math.min(5000, value));
    }
  }
  return DEFAULT_SETTINGS[key];
};

// Set setting in localStorage
export const setSetting = (key, value) => {
  localStorage.setItem(`gameSetting_${key}`, value.toString());
};

// Reset all settings to default
export const resetSettings = () => {
  Object.keys(DEFAULT_SETTINGS).forEach(key => {
    localStorage.removeItem(`gameSetting_${key}`);
  });
};

// Get all current settings
export const getAllSettings = () => {
  return {
    initialDealDelay: getSetting('initialDealDelay'),
    repeatDealDelay: getSetting('repeatDealDelay'),
    dealerDrawDelay: getSetting('dealerDrawDelay'),
    cardPopScale: getSetting('cardPopScale'),
    // Note: sound volumes are intentionally not exposed in the Settings UI
  };
};
