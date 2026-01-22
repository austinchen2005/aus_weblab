import React, { useState, useEffect } from "react";
import FallingSuits from "../FallingSuits";
import "../../utilities.css";
import "./Home.css";

const Home = () => {
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);

  useEffect(() => {
    const savedWins = parseInt(localStorage.getItem('gameWins') || '0', 10);
    const savedLosses = parseInt(localStorage.getItem('gameLosses') || '0', 10);
    setWins(savedWins);
    setLosses(savedLosses);
  }, []);

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
