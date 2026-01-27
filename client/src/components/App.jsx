import React, { useState, useEffect, createContext } from "react";
import { Outlet } from "react-router-dom";

import jwt_decode from "jwt-decode";

import "../utilities.css";
import NavBar from "./NavBar";

import { socket } from "../client-socket";

import { get, post } from "../utilities";

export const UserContext = createContext(null);

/**
 * Define the "App" component
 */
const App = () => {
  const [userId, setUserId] = useState(undefined);
  const [user, setUser] = useState(null);

  // Prompt the user for a username on first login and save it to MongoDB.
  // Ensures the chosen username is not already taken by a different user.
  const maybePromptForUsername = (userData) => {
    if (!userData || !userData._id) return;

    const storageKey = `usernameSet_${userData._id}`;
    if (localStorage.getItem(storageKey) === "true") {
      return; // already prompted for this user
    }

    const currentName = userData.name || "";
    const entered = window.prompt("Choose a username:", currentName);

    // Even if they cancel or enter nothing, don't keep nagging
    if (!entered || !entered.trim()) {
      localStorage.setItem(storageKey, "true");
      return;
    }

    const newName = entered.trim();
    if (newName === currentName) {
      localStorage.setItem(storageKey, "true");
      return;
    }

    // First check if the username is already taken by another user
    post("/api/checkUsername", { name: newName })
      .then((result) => {
        if (!result || result.available === false) {
          // Username is taken by someone else
          window.alert("This username is taken. Please enter a different username.");
          return null;
        }

        // Persist to MongoDB
        return post("/api/updateUser", { name: newName });
      })
      .then((updatedUser) => {
        if (!updatedUser) return;
        setUser(updatedUser);
        localStorage.setItem(storageKey, "true");
      })
      .catch((err) => {
        console.error("Failed to update username:", err);
      });
  };

  useEffect(() => {
    get("/api/whoami").then((userData) => {
      if (userData._id) {
        // they are registed in the database, and currently logged in.
        setUserId(userData._id);
        setUser(userData);
      }
    });
  }, []);

  const handleLogin = (credentialResponse) => {
    const userToken = credentialResponse.credential;
    const decodedCredential = jwt_decode(userToken);
    console.log(`Logged in as ${decodedCredential.name}`);
    post("/api/login", { token: userToken })
      .then((userData) => {
        console.log("User logged in:", userData);
        setUserId(userData._id);
        setUser(userData);
        // Ask for a username the first time this user logs in
        maybePromptForUsername(userData);
        // Socket.IO is disabled in `client/src/client-socket.js` (dummy socket id: "disabled")
        // Only attempt to init socket if a real socket id exists.
        if (socket?.id && socket.id !== "disabled") {
          post("/api/initsocket", { socketid: socket.id });
        }
      })
      .catch((err) => {
        console.error("Login failed:", err);
        alert(`Login failed: ${err.message || err}. Check server console for details.`);
      });
  };

  const handleLogout = () => {
    console.log("Logging out");
    setUserId(undefined);
    setUser(null);
    post("/api/logout");
  };

  const authContextValue = {
    userId,
    user, // Full user object with wins, losses, etc.
    handleLogin,
    handleLogout,
    setUser,
  };

  return (
    <UserContext.Provider value={authContextValue}>
      <NavBar />
      <Outlet />
    </UserContext.Provider>
  );
};

export default App;