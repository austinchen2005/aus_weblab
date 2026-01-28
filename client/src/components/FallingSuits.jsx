import React, { useEffect, useState, useRef } from "react";
import "./FallingSuits.css";

const suits = ['♠', '♥', '♦', '♣'];
// Use four distinct colors from the new blue palette
const paletteColors = ['#0466C8', '#023E7D', '#002855', '#979DAC'];
const suitColors = {
  '♠': paletteColors[0],
  '♥': paletteColors[1],
  '♦': paletteColors[2],
  '♣': paletteColors[3],
};

const FallingSuits = () => {
  const [fallingSuits, setFallingSuits] = useState([]);
  const nextIdRef = useRef(0);

  useEffect(() => {
    let timeoutId;
    
    const createNextSuit = () => {
      // Create 2 suits per tick for 2x density
      const count = 2;
      const viewportHeight = window.innerHeight;
      const distance = viewportHeight + 80; // 100vh + 5rem ≈ viewportHeight + 80px

      const newBatch = [];
      for (let i = 0; i < count; i += 1) {
        const suit = suits[Math.floor(Math.random() * suits.length)];
        const left = Math.random() * 100; // Random horizontal position (0-100%)
        const rotation = Math.random() * 360; // Random rotation 0 to 360 degrees
        const size = 2 + Math.random() * 1.5; // Random size 2-3.5rem
        
        // Calculate falling speed: random between 50-300px/s
        const speed = 50 + Math.random() * 250; // 50 to 300 px/s
        // Calculate duration based on speed: duration = distance / speed
        const duration = distance / speed; // in seconds
        
        const newSuit = {
          id: nextIdRef.current++,
          suit,
          left,
          rotation,
          duration,
          size,
          color: suitColors[suit]
        };
        newBatch.push(newSuit);

        // Remove each suit after it falls
        setTimeout(() => {
          setFallingSuits(prev => prev.filter(s => s.id !== newSuit.id));
        }, duration * 1000);
      }

      setFallingSuits(prev => [...prev, ...newBatch]);
      
      // Schedule next batch with random delay between 0.1s-0.5s (2x as many)
      const nextDelay = 100 + Math.random() * 400; // 100ms to 500ms
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
