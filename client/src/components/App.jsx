import React, { createContext } from "react";
import { Outlet } from "react-router-dom";
import NavBar from "./NavBar";

import "../utilities.css";

// Auth and Socket.IO disabled - game works locally with localStorage
export const UserContext = createContext(null);

/**
 * Define the "App" component
 */
const App = () => {
  // No auth needed - game works locally
  const authContextValue = {
    userId: null,
    handleLogin: () => {},
    handleLogout: () => {},
  };

  return (
    <UserContext.Provider value={authContextValue}>
      <NavBar />
      <Outlet />
    </UserContext.Provider>
  );
};

export default App;
