# Guide: Storing and Accessing User Data in MongoDB

## Overview
This guide shows you how to store and access user-specific variables in MongoDB.

## 1. User Model (server/models/user.js)

The User model defines what data is stored for each user:

```javascript
const UserSchema = new mongoose.Schema({
  name: String,
  googleid: String,
  wins: { type: Number, default: 0 },
  losses: { type: Number, default: 0 },
  // Add more fields here as needed
});
```

**To add new fields:**
1. Add the field to the schema above
2. Existing users will get default values for new fields
3. New users will have the field from creation

## 2. API Endpoints (server/api.js)

### Available Endpoints:

#### Get Current User Data
```javascript
// Already exists: GET /api/whoami
// Returns the current logged-in user's data
```

#### Update Wins/Losses
```javascript
// POST /api/updateStats
// Body: { wins: 10, losses: 5 }
// Updates both wins and losses
```

#### Increment Win
```javascript
// POST /api/incrementWin
// Adds 1 to the user's wins count
```

#### Increment Loss
```javascript
// POST /api/incrementLoss
// Adds 1 to the user's losses count
```

#### Generic Update
```javascript
// POST /api/updateUser
// Body: { anyField: value, anotherField: value }
// Updates any user field (except _id and googleid)
```

## 3. Using in Frontend Components

### Example 1: Load User Data on Component Mount

```javascript
import React, { useState, useEffect, useContext } from "react";
import { UserContext } from "../App";
import { get, post } from "../utilities";

const MyComponent = () => {
  const { user, userId } = useContext(UserContext);
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);

  // Load user data when component mounts or user changes
  useEffect(() => {
    if (userId) {
      // Option 1: Use user from context (already loaded)
      if (user) {
        setWins(user.wins || 0);
        setLosses(user.losses || 0);
      }
      
      // Option 2: Fetch fresh data from server
      get("/api/whoami").then((userData) => {
        setWins(userData.wins || 0);
        setLosses(userData.losses || 0);
      });
    }
  }, [userId, user]);

  return (
    <div>
      <p>Wins: {wins}</p>
      <p>Losses: {losses}</p>
    </div>
  );
};
```

### Example 2: Update Wins When User Wins

```javascript
const handleWin = () => {
  if (!userId) {
    // User not logged in, use localStorage as fallback
    const newWins = wins + 1;
    setWins(newWins);
    localStorage.setItem('gameWins', newWins.toString());
    return;
  }

  // User is logged in, update in MongoDB
  post("/api/incrementWin")
    .then((updatedUser) => {
      setWins(updatedUser.wins);
      // Optionally update context if needed
    })
    .catch((err) => {
      console.error("Failed to update win:", err);
    });
};
```

### Example 3: Update Multiple Fields

```javascript
const updateUserSettings = (newSettings) => {
  if (!userId) return;

  post("/api/updateUser", {
    // Add any fields you want to update
    settings: newSettings,
    lastPlayed: new Date(),
  })
    .then((updatedUser) => {
      console.log("User updated:", updatedUser);
    })
    .catch((err) => {
      console.error("Failed to update user:", err);
    });
};
```

## 4. Migration: From localStorage to MongoDB

If you're currently using localStorage (like in Game.jsx), here's how to migrate:

**Before (localStorage):**
```javascript
setWins(prevWins => {
  const newWins = prevWins + 1;
  localStorage.setItem('gameWins', newWins.toString());
  return newWins;
});
```

**After (MongoDB):**
```javascript
const { userId, user } = useContext(UserContext);

const handleWin = () => {
  if (userId) {
    // User logged in - use MongoDB
    post("/api/incrementWin")
      .then((updatedUser) => {
        setWins(updatedUser.wins);
      });
  } else {
    // Not logged in - fallback to localStorage
    setWins(prevWins => {
      const newWins = prevWins + 1;
      localStorage.setItem('gameWins', newWins.toString());
      return newWins;
    });
  }
};
```

## 5. Adding New Fields to User Model

**Step 1:** Update the schema in `server/models/user.js`:
```javascript
const UserSchema = new mongoose.Schema({
  name: String,
  googleid: String,
  wins: { type: Number, default: 0 },
  losses: { type: Number, default: 0 },
  // NEW FIELD:
  achievements: { type: [String], default: [] },
  bestHand: { type: String, default: "" },
  totalGames: { type: Number, default: 0 },
});
```

**Step 2:** Use the generic update endpoint or create a specific one:
```javascript
// In frontend:
post("/api/updateUser", {
  achievements: ["First Win", "10 Wins"],
  bestHand: "Royal Flush",
  totalGames: 15
});
```

## 6. Best Practices

1. **Always check if user is logged in** before making API calls
2. **Provide fallback to localStorage** for non-logged-in users
3. **Update local state** after successful API calls
4. **Handle errors** gracefully
5. **Use specific endpoints** (like `/api/incrementWin`) for common operations
6. **Use generic endpoint** (`/api/updateUser`) for one-off updates

## 7. Testing

1. Make sure you're logged in (check `/api/whoami`)
2. Test updating wins: `POST /api/incrementWin`
3. Check the database or `/api/whoami` to verify the update
4. Test with multiple users to ensure data is isolated
