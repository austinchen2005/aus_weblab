// Game settings with default values
export const DEFAULT_SETTINGS = {
  initialDealDelay: 200, // 0.2s in milliseconds
  repeatDealDelay: 700, // 0.7s in milliseconds
  dealerDrawDelay: 500, // 0.5s in milliseconds
  cardPopScale: 1.15 // Scale for card popping effect
};

// Get setting from localStorage or return default
export const getSetting = (key) => {
  const stored = localStorage.getItem(`gameSetting_${key}`);
  if (stored !== null) {
    const value = parseFloat(stored);
    // Validate range
    if (key === 'cardPopScale') {
      return Math.max(1.0, Math.min(2.0, value));
    } else {
      return Math.max(100, Math.min(2000, value)); // 0.1s to 2s in ms
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
    cardPopScale: getSetting('cardPopScale')
  };
};
