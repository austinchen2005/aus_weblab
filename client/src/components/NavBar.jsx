import React from "react";
import { Link, useLocation } from "react-router-dom";
import "./NavBar.css";
import Skeleton from "./pages/Skeleton";

const NavBar = () => {
  const location = useLocation();

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <nav className="navbar">
      <ul className="nav-list">
        <li>
          <Link 
            to="/" 
            className={isActive("/") ? "nav-button active" : "nav-button"}
          >
            Home
          </Link>
        </li>
        <li>
          <Link 
            to="/play" 
            className={isActive("/play") ? "nav-button active" : "nav-button"}
          >
            Play
          </Link>
        </li>
        <li>
          <Link 
            to="/leaderboard" 
            className={isActive("/leaderboard") ? "nav-button active" : "nav-button"}
          >
            Leaderboard
          </Link>
        </li>
        <li>
          <Link 
            to="/achievements" 
            className={isActive("/achievements") ? "nav-button active" : "nav-button"}
          >
            Achievements
          </Link>
        </li>
        <li>
          <Link 
            to="/help" 
            className={isActive("/help") ? "nav-button active" : "nav-button"}
          >
            Help
          </Link>
        </li>
        <li>
          <Link 
            to="/settings" 
            className={isActive("/settings") ? "nav-button active" : "nav-button"}
          >
            Settings
          </Link>
        </li>
        <li><Skeleton /></li>
      </ul>

    </nav>
  );
};

export default NavBar;
