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
    post("/api/login", { token: userToken }).then((userData) => {
      console.log("User logged in:", userData);
      setUserId(userData._id);
      setUser(userData);
      post("/api/initsocket", { socketid: socket.id });
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
  };

  return (
    <UserContext.Provider value={authContextValue}>
      <NavBar />
      <Outlet />
    </UserContext.Provider>
  );
};

export default App;