import React, { useState, useEffect, useContext } from "react";
import { UserContext } from "../App";
import { get } from "../../utilities";
import Skeleton from "./Skeleton";
import FallingSuits from "../FallingSuits";
import "../../utilities.css";
import "./Home.css";

const Home = () => {
  const { userId, user } = useContext(UserContext);
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);
  const [winRate, setWinRate] = useState(0); // fraction from server
  const [bayesianScore, setBayesianScore] = useState(0);
  const [history, setHistory] = useState([]);
  const [hoverInfo, setHoverInfo] = useState(null);

  useEffect(() => {
    if (userId) {
      // User is logged in - fetch fresh data from server
      get("/api/whoami")
        .then((userData) => {
          if (userData._id) {
            setWins(userData.wins || 0);
            setLosses(userData.losses || 0);
            setWinRate(userData.winRate || 0);
            setBayesianScore(userData.bayesianScore || 0);
            setHistory(Array.isArray(userData.winLossHistory) ? userData.winLossHistory : []);
          }
        })
        .catch((err) => {
          console.error("Failed to load stats from server:", err);
        });
    } else {
      // User not logged in - reset to 0
      setWins(0);
      setLosses(0);
      setWinRate(0);
      setBayesianScore(0);
      setHistory([]);
    }
  }, [userId]);

  // Use server-side winRate and bayesianScore
  const winRatePercent = (winRate * 100).toFixed(1);
  const bayesianScoreDisplay = bayesianScore.toFixed(3);

  // If not logged in, show login prompt and button only
  if (!userId) {
    return (
      <>
        <div className="home-page-wrapper"></div>
        <FallingSuits />
        <div className="home-content">
          <div className="page-container" style={{ color: "white" }}>
            <h1>Home</h1>
            <p style={{ marginBottom: "1rem" }}>Please login first.</p>
            {/* Reuse the same login button / component as in Skeleton */}
            <Skeleton />
          </div>
        </div>
      </>
    );
  }

  // Chunk history into rows of 20 (oldest first overall, left→right)
  const ROW_SIZE = 20;
  const rows = [];
  for (let i = 0; i < history.length; i += ROW_SIZE) {
    rows.push(history.slice(i, i + ROW_SIZE));
  }

  const formatTooltip = (entry) => {
    if (!entry) return "";
    let result, date, playerHandName, dealerHandName;
    if (typeof entry === "string") {
      result = entry === "W" ? "Win" : "Loss";
    } else {
      result = entry.result === "W" ? "Win" : "Loss";
      date = entry.date ? new Date(entry.date) : null;
      playerHandName = entry.playerHandName;
      dealerHandName = entry.dealerHandName;
    }
    const parts = [];
    if (playerHandName || dealerHandName) {
      const ph = playerHandName || "Unknown";
      const dh = dealerHandName || "Unknown";
      parts.push(`${result}: Player ${ph} vs Dealer ${dh}`);
    } else {
      parts.push(result);
    }
    if (date && !Number.isNaN(date.getTime())) {
      parts.push(`(${date.toLocaleString()})`);
    }
    return parts.join(" ");
  };

  return (
    <>
      <div className="home-page-wrapper"></div>
      <FallingSuits />
      <div className="home-content">
        <div className="page-container">
          <p className="home-intro">
            Welcome! Click the Play tab to play the Single Player 5-8 Poker Game.
            Click the Help tab to learn how to play the game.
          </p>
          {history.length > 0 && (
            <div className="history-container">
              <h2 className="history-title">Game History</h2>
              <div className="history-rows">
                {rows.map((row, rowIndex) => (
                  <div key={rowIndex} className="history-row">
                    {row.map((entry, idx) => {
                      const res = typeof entry === "string" ? entry : entry.result;
                      const isWin = res === "W";
                      return (
                      <div
                        key={`${rowIndex}-${idx}`}
                        className={`history-box ${
                          isWin ? "history-box-win" : "history-box-loss"
                        }`}
                        title={formatTooltip(entry)}
                        onMouseEnter={() => setHoverInfo(formatTooltip(entry))}
                        onMouseLeave={() => setHoverInfo(null)}
                      />
                    );
                    })}
                  </div>
                ))}
              </div>
              {hoverInfo && (
                <div className="history-hover-info">
                  {hoverInfo}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Home;
