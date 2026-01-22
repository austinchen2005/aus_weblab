import React from "react";
import ReactDOM from "react-dom/client";
import App from "./components/App";
import Home from "./components/pages/Home";
import Game from "./components/pages/Game";
import Leaderboard from "./components/pages/Leaderboard";
import Settings from "./components/pages/Settings";
import Help from "./components/pages/Help";
import Skeleton from "./components/pages/Skeleton";
import NotFound from "./components/pages/NotFound";

import {
  createBrowserRouter,
  createRoutesFromElements,
  Route,
  RouterProvider
} from 'react-router-dom'

// GoogleOAuthProvider disabled since login is not needed
// import { GoogleOAuthProvider } from '@react-oauth/google';

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route errorElement={<NotFound />} element={<App />}>
      <Route path="/" element={<Home />}/>
      <Route path="/play" element={<Game />}/>
      <Route path="/leaderboard" element={<Leaderboard />}/>
      <Route path="/help" element={<Help />}/>
      <Route path="/settings" element={<Settings />}/>
      <Route path="/skeleton" element={<Skeleton />}/>
    </Route>
  )
)

// renders React Component "Root" into the DOM element with ID "root"
ReactDOM.createRoot(document.getElementById("root")).render(
  <RouterProvider router={router} />
);
