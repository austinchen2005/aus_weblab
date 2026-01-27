import React, { useState, useEffect, useContext } from "react";
import { UserContext } from "../App";
import { get } from "../../utilities";
import FallingSuits from "../FallingSuits";
import "../../utilities.css";
import "./Home.css";

const Home = () => {
  const { userId, user } = useContext(UserContext);
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);

  useEffect(() => {
    if (userId) {
      // User is logged in - fetch fresh data from server
      get("/api/whoami")
        .then((userData) => {
          if (userData._id) {
            setWins(userData.wins || 0);
            setLosses(userData.losses || 0);
          }
        })
        .catch((err) => {
          console.error("Failed to load stats from server:", err);
        });
    } else {
      // User not logged in - reset to 0
      setWins(0);
      setLosses(0);
    }
  }, [userId]);

  // Calculate win rate and Bayesian score
  const totalGames = wins + losses;
  const winRate = totalGames > 0 ? ((wins / totalGames) * 100).toFixed(1) : '0.0';
  const alpha = 0;
  const beta = 10;
  const bayesianScore = ((wins + alpha) / (wins + losses + alpha + beta)).toFixed(3);

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
              <span className="stat-value">{winRate}%</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Bayesian Score:</span>
              <span className="stat-value">{bayesianScore}</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;
