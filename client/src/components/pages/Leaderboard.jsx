import React, { useEffect, useState } from "react";
import "../../utilities.css";
import "./Leaderboard.css";
import { get } from "../../utilities";

const Leaderboard = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    get("/api/leaderboard")
      .then((data) => {
        setRows(data || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load leaderboard:", err);
        setError("Failed to load leaderboard.");
        setLoading(false);
      });
  }, []);

  return (
    <div className="leaderboard-page">
      <div className="page-container">
        <h1>Leaderboard</h1>
        {loading && <p>Loading leaderboard...</p>}
        {error && <p className="leaderboard-error">{error}</p>}
        {!loading && !error && (
          <div className="leaderboard-table-wrapper">
            <table className="leaderboard-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Username</th>
                  <th>Bayesian Score</th>
                  <th>Wins</th>
                  <th>Losses</th>
                  <th>Win Rate</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((user, index) => {
                  const winRatePercent = (user.winRate || 0) * 100;
                  const bayes = user.bayesianScore != null ? user.bayesianScore : 0;
                  return (
                    <tr key={user._id || index}>
                      <td>{index + 1}</td>
                      <td>{user.name || "Anonymous"}</td>
                      <td>{bayes.toFixed(3)}</td>
                      <td>{user.wins || 0}</td>
                      <td>{user.losses || 0}</td>
                      <td>{winRatePercent.toFixed(1)}%</td>
                    </tr>
                  );
                })}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center" }}>
                      No players yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Leaderboard;
