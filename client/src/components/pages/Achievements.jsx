import React, { useContext, useEffect, useState } from "react";
import { UserContext } from "../App";
import { get } from "../../utilities";
import { ACHIEVEMENTS } from "../../constants/achievements";
import "../../utilities.css";
import "./Achievements.css";
import Skeleton from "./Skeleton";

const Achievements = () => {
  const { userId, user, setUser } = useContext(UserContext);
  const [loading, setLoading] = useState(true);
  const [achievementStats, setAchievementStats] = useState(null);

  useEffect(() => {
    if (userId) {
      get("/api/whoami")
        .then((userData) => {
          if (userData._id) {
            setUser(userData);
          }
        })
        .catch((err) => {
          console.error("Failed to load user for achievements:", err);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [userId, setUser]);

  // Load global achievement statistics (percent of users who have each achievement)
  useEffect(() => {
    get("/api/achievementStats")
      .then((stats) => {
        setAchievementStats(stats);
      })
      .catch((err) => {
        console.error("Failed to load achievement stats:", err);
      });
  }, []);

  if (!userId) {
    return (
      <div className="page-container achievements-page">
        <h1>Achievements</h1>
        <p>Please login first.</p>
        <Skeleton />
      </div>
    );
  }

  const completedIds = new Set(user?.achievements || []);

  const getPercent = (id) => {
    if (!achievementStats || !achievementStats.percentages) return 0;
    const val = achievementStats.percentages[id];
    if (typeof val !== "number" || Number.isNaN(val)) return 0;
    return val;
  };

  return (
    <div className="page-container achievements-page">
      <h1>Achievements</h1>
      <div className="achievements-list">
        {ACHIEVEMENTS.map((ach) => {
          const completed = completedIds.has(ach.id);
            const pct = getPercent(ach.id);
          return (
            <div
              key={ach.id}
              className={
                completed
                  ? "achievement-row achievement-completed"
                  : "achievement-row achievement-pending"
              }
            >
              <div className="achievement-title">
                {ach.title}
                {completed && <span className="achievement-tag">Completed</span>}
              </div>
              {completed && (
                <div className="achievement-description">{ach.description}</div>
              )}
                <div className="achievement-stats">
                  {pct.toFixed(1)}% of players have this achievement.
                </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Achievements;

