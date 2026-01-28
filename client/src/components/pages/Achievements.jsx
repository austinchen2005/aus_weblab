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

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
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
  }, [userId, setUser]);

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

  return (
    <div className="page-container achievements-page">
      <h1>Achievements</h1>
      <div className="achievements-list">
        {ACHIEVEMENTS.map((ach) => {
          const completed = completedIds.has(ach.id);
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
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Achievements;

