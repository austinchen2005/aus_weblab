import React, { useState, useEffect, useContext } from "react";
import { getSetting, setSetting, resetSettings, DEFAULT_SETTINGS, getAllSettings } from "../../utils/gameSettings";
import { UserContext } from "../App";
import { post } from "../../utilities";
import "../../utilities.css";
import "./Settings.css";

const Settings = () => {
  const [settings, setSettingsState] = useState(getAllSettings());
  const [usernameError, setUsernameError] = useState("");
  const { userId, user, setUser } = useContext(UserContext);

  // Update settings when localStorage changes
  useEffect(() => {
    const handleStorageChange = () => {
      setSettingsState(getAllSettings());
      // Update CSS variable for card pop scale
      document.documentElement.style.setProperty('--card-pop-scale', settings.cardPopScale);
    };

    window.addEventListener('storage', handleStorageChange);
    handleStorageChange(); // Initial update

    return () => window.removeEventListener('storage', handleStorageChange);
  }, [settings.cardPopScale]);

  // Update CSS variable when cardPopScale changes
  useEffect(() => {
    document.documentElement.style.setProperty('--card-pop-scale', settings.cardPopScale);
  }, [settings.cardPopScale]);

  const updateSetting = (key, value) => {
    setSetting(key, value);
    setSettingsState(getAllSettings());
    // Update CSS variable if it's cardPopScale
    if (key === 'cardPopScale') {
      document.documentElement.style.setProperty('--card-pop-scale', value);
    }
  };

  const handleReset = () => {
    resetSettings();
    setSettingsState(getAllSettings());
    // Reset CSS variable
    document.documentElement.style.setProperty('--card-pop-scale', DEFAULT_SETTINGS.cardPopScale);
  };

  const formatDelay = (ms) => {
    return (ms / 1000).toFixed(2) + 's';
  };

  const parseDelay = (str) => {
    const value = parseFloat(str);
    if (isNaN(value)) return 0.2;
    return Math.max(0.1, Math.min(5.0, value)) * 1000; // Convert to ms
  };

  const handleChangeUsername = () => {
    if (!userId) {
      alert("Please log in to change your username.");
      return;
    }

    const currentName = user?.name || "";
    const entered = window.prompt("Enter a new username:", currentName);
    if (!entered) {
      setUsernameError("");
      return;
    }

    const newName = entered.trim();
    if (!newName || newName === currentName) {
      setUsernameError("");
      return;
    }

    // First check if the username is already taken by another user
    post("/api/checkUsername", { name: newName })
      .then((result) => {
        if (!result || result.available === false) {
          setUsernameError("This username is taken. Please enter a different username.");
          return null;
        }

        setUsernameError("");

        // Optimistically update local context
        setUser((prev) => (prev ? { ...prev, name: newName } : prev));

        return post("/api/updateUser", { name: newName });
      })
      .then((updatedUser) => {
        if (!updatedUser) return;
        setUser(updatedUser);
      })
      .catch((err) => {
        console.error("Failed to update username from settings:", err);
        alert("Failed to update username. Please try again.");
      });
  };

  return (
    <div className="page-container settings-page">
      <h1>Game Settings</h1>
      
      <div className="settings-container">
        <div className="setting-item">
          <label htmlFor="initialDealDelay">
            Initial Deal Delay: {formatDelay(settings.initialDealDelay)} (default {formatDelay(DEFAULT_SETTINGS.initialDealDelay)})
          </label>
          <div className="setting-controls">
            <input
              type="range"
              id="initialDealDelay"
              min="100"
              max="5000"
              step="50"
              value={settings.initialDealDelay}
              onChange={(e) => updateSetting('initialDealDelay', parseInt(e.target.value))}
              className="setting-slider"
            />
            <input
              type="number"
              min="0.1"
              max="5.0"
              step="0.05"
              value={(settings.initialDealDelay / 1000).toFixed(2)}
              onChange={(e) => updateSetting('initialDealDelay', parseDelay(e.target.value))}
              className="setting-input"
            />
          </div>
        </div>

        <div className="setting-item">
          <label htmlFor="repeatDealDelay">
            Repeat Deal Delay: {formatDelay(settings.repeatDealDelay)} (default {formatDelay(DEFAULT_SETTINGS.repeatDealDelay)})
          </label>
          <div className="setting-controls">
            <input
              type="range"
              id="repeatDealDelay"
              min="100"
              max="5000"
              step="50"
              value={settings.repeatDealDelay}
              onChange={(e) => updateSetting('repeatDealDelay', parseInt(e.target.value))}
              className="setting-slider"
            />
            <input
              type="number"
              min="0.1"
              max="5.0"
              step="0.05"
              value={(settings.repeatDealDelay / 1000).toFixed(2)}
              onChange={(e) => updateSetting('repeatDealDelay', parseDelay(e.target.value))}
              className="setting-input"
            />
          </div>
        </div>

        <div className="setting-item">
          <label htmlFor="dealerDrawDelay">
            Dealer Draw Delay: {formatDelay(settings.dealerDrawDelay)} (default {formatDelay(DEFAULT_SETTINGS.dealerDrawDelay)})
          </label>
          <div className="setting-controls">
            <input
              type="range"
              id="dealerDrawDelay"
              min="100"
              max="5000"
              step="50"
              value={settings.dealerDrawDelay}
              onChange={(e) => updateSetting('dealerDrawDelay', parseInt(e.target.value))}
              className="setting-slider"
            />
            <input
              type="number"
              min="0.1"
              max="5.0"
              step="0.05"
              value={(settings.dealerDrawDelay / 1000).toFixed(2)}
              onChange={(e) => updateSetting('dealerDrawDelay', parseDelay(e.target.value))}
              className="setting-input"
            />
          </div>
        </div>

        <div className="setting-item">
          <label htmlFor="cardPopScale">
            Card Pop Scale: {settings.cardPopScale.toFixed(2)} (default {DEFAULT_SETTINGS.cardPopScale.toFixed(2)})
          </label>
          <div className="setting-controls">
            <input
              type="range"
              id="cardPopScale"
              min="1.0"
              max="2.0"
              step="0.05"
              value={settings.cardPopScale}
              onChange={(e) => updateSetting('cardPopScale', parseFloat(e.target.value))}
              className="setting-slider"
            />
            <input
              type="number"
              min="1.0"
              max="2.0"
              step="0.05"
              value={settings.cardPopScale.toFixed(2)}
              onChange={(e) => updateSetting('cardPopScale', Math.max(1.0, Math.min(2.0, parseFloat(e.target.value) || 1.15)))}
              className="setting-input"
            />
          </div>
        </div>

        <div className="setting-actions">
          <button className="reset-btn" onClick={handleReset}>
            Reset to Default
          </button>
          <button className="change-username-btn" onClick={handleChangeUsername}>
            Change Username
          </button>
        </div>
        {usernameError && <p className="username-error">{usernameError}</p>}
      </div>
    </div>
  );
};

export default Settings;
