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

import { GoogleOAuthProvider } from '@react-oauth/google';
const GOOGLE_CLIENT_ID = "1001640154904-l5u78j6sq3jp3mgohhf6uaa9qolk3rgu.apps.googleusercontent.com";

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
  <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
    <RouterProvider router={router} />
  </GoogleOAuthProvider>
);
