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

  return (
    <>
      <div className="home-page-wrapper"></div>
      <FallingSuits />
      <div className="home-content">
        <div className="page-container">
          <h1>Home</h1>
          <div className="stats-display">
            <div className="stat-item">
              <span className="stat-label">Wins:</span>
              <span className="stat-value">{wins}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Losses:</span>
              <span className="stat-value">{losses}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Win Rate:</span>
              <span className="stat-value">{winRatePercent}%</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Bayesian Score:</span>
              <span className="stat-value">{bayesianScoreDisplay}</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;
