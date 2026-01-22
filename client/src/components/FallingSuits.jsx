import React, { useEffect, useState } from "react";
import "./FallingSuits.css";

const suits = ['♠', '♥', '♦', '♣'];
const suitColors = {
  '♠': '#2c3e50', // black
  '♣': '#2c3e50', // black
  '♥': '#e74c3c', // red
  '♦': '#e74c3c'  // red
};

const FallingSuits = () => {
  const [fallingSuits, setFallingSuits] = useState([]);

  useEffect(() => {
    let timeoutId;
    
    const createNextSuit = () => {
      // Create a new falling suit
      const suit = suits[Math.floor(Math.random() * suits.length)];
      const left = Math.random() * 100; // Random horizontal position (0-100%)
      const rotation = Math.random() * 360; // Random rotation 0 to 360 degrees
      const size = 2 + Math.random() * 1.5; // Random size 2-3.5rem
      
      // Calculate falling speed: random between 50-300px/s
      const speed = 50 + Math.random() * 250; // 50 to 300 px/s
      
      // Calculate distance: viewport height + 5rem (approximately 80px)
      const viewportHeight = window.innerHeight;
      const distance = viewportHeight + 80; // 100vh + 5rem ≈ viewportHeight + 80px
      
      // Calculate duration based on speed: duration = distance / speed
      const duration = distance / speed; // in seconds
      
      const newSuit = {
        id: Date.now() + Math.random(),
        suit,
        left,
        rotation,
        duration,
        size,
        color: suitColors[suit]
      };

      setFallingSuits(prev => [...prev, newSuit]);

      // Remove the suit after it falls
      setTimeout(() => {
        setFallingSuits(prev => prev.filter(s => s.id !== newSuit.id));
      }, duration * 1000);
      
      // Schedule next suit with random delay between 0.1s-1s
      const nextDelay = 100 + Math.random() * 900; // 100ms to 1000ms (0.1s to 1s)
      timeoutId = setTimeout(createNextSuit, nextDelay);
    };
    
    // Start creating suits
    createNextSuit();

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  return (
    <div className="falling-suits-container">
      {fallingSuits.map(suit => (
        <div
          key={suit.id}
          className="falling-suit"
          style={{
            left: `${suit.left}%`,
            color: suit.color,
            '--rotation': `${suit.rotation}deg`,
            animationDuration: `${suit.duration}s`,
            fontSize: `${suit.size}rem`
          }}
        >
          {suit.suit}
        </div>
      ))}
    </div>
  );
};

export default FallingSuits;
