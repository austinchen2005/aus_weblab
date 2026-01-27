import React, { useState, useContext } from "react";
import { UserContext } from "../App";
import { post } from "../../utilities";
import "../../utilities.css";
import "./Help.css";

const Help = () => {
  const { userId } = useContext(UserContext);
  const [showRules, setShowRules] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleResetProfile = () => {
    if (userId) {
      // Reset wins and losses on server
      post("/api/updateStats", { wins: 0, losses: 0 })
        .then(() => {
          // Close the popup
          setShowResetConfirm(false);
          // Reload the page to update stats everywhere
          window.location.reload();
        })
        .catch((err) => {
          console.error("Failed to reset profile:", err);
          alert("Failed to reset profile. Please try again.");
        });
    } else {
      // User not logged in - can't reset (no stats to reset)
      setShowResetConfirm(false);
      alert("Please log in to reset your profile.");
    }
  };

  const rulesText = `RULES:
This is a single player poker-like game!
The player will have 5 cards at the end of the game.
The dealer will have minimum 8 cards at the end of the game, but maybe more (can have unlimited amount).
The player gets to select a "rule" of any of the remaining cards in the deck. This rule can be any set of cards - for example, all aces, or all 10s or higher, or all diamonds and aces, or any combination.
When clicking "deal", cards will be dealt one-by-one from the deck without replacement. If the cards is NOT in your selected rule, it goes to the dealer side, and we repeat dealing another card. You do not get to change your rule.
If the card IS in your selected rule, it goes to the player side. Now that you've received one card from your rule, you will be able to change your rule for the next deal.
So, you will click deal exactly five times and get to select 5 different rules.
In the selection matrix, you can click columns or rows to select an entire column or row. You can also click "all" to select all squares. You can also drag a box in order to select & deselect a box.

You win if your 5-card poker hand strictly beats the dealer's best 5-card poker hand formed from all of their cards. This must be strict - a royal flush vs a royal flush gives the dealer the win. Good luck!`;

  return (
    <div className="page-container help-page">
      <h1>Help</h1>
      
      <div className="help-content">
        <button 
          className="rules-btn" 
          onClick={() => setShowRules(!showRules)}
        >
          {showRules ? 'Hide Rules' : 'Rules'}
        </button>

        {showRules && (
          <div className="rules-display">
            <pre className="rules-text">{rulesText}</pre>
          </div>
        )}

        <button 
          className="reset-profile-btn" 
          onClick={() => setShowResetConfirm(true)}
        >
          Reset Profile
        </button>

        {showResetConfirm && (
          <div className="popup-overlay" onClick={() => setShowResetConfirm(false)}>
            <div className="popup-content" onClick={(e) => e.stopPropagation()}>
              <p className="popup-message">
                Are you sure you want to reset your profile? You will reset your wins and losses and all achievements.
              </p>
              <div className="popup-buttons">
                <button 
                  className="popup-btn popup-btn-no" 
                  onClick={() => setShowResetConfirm(false)}
                >
                  No
                </button>
                <button 
                  className="popup-btn popup-btn-yes" 
                  onClick={handleResetProfile}
                >
                  Yes
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Help;
