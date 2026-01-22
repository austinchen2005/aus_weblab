import React, { useState, useEffect, useRef, startTransition } from "react";
import { evaluateHand } from "../../utils/pokerEvaluator";
import { getSetting } from "../../utils/gameSettings";
import "../../utilities.css";
import "./Game.css";

const suits = ['♥', '♦', '♣', '♠']; // Heart, Diamond, Club, Spade
const suitsDisplay = ['♥', '♦', '♣', '♠'];
const ranks = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2'];

// Compare two poker hands (returns 1 if hand1 > hand2, -1 if hand1 < hand2, 0 if equal)
function compareHands(hand1Value, hand1Rank, hand2Value, hand2Rank) {
  if (hand1Value > hand2Value) return 1;
  if (hand1Value < hand2Value) return -1;
  // If same hand value, compare ranks
  if (hand1Rank > hand2Rank) return 1;
  if (hand1Rank < hand2Rank) return -1;
  return 0;
}

const Game = () => {
  const [deck, setDeck] = useState([]);
  const [playerCards, setPlayerCards] = useState([]);
  const [dealerCards, setDealerCards] = useState([]);
  const [playerHand, setPlayerHand] = useState(null);
  const [dealerHand, setDealerHand] = useState(null);
  const [gameResult, setGameResult] = useState("");
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);
  const [selectedCards, setSelectedCards] = useState(new Set()); // Store as "rank-suit" strings
  const [gameStarted, setGameStarted] = useState(false);
  const [gameEnded, setGameEnded] = useState(false);
  const [isDealing, setIsDealing] = useState(false);
  const [dealTimeout, setDealTimeout] = useState(null);
  const [newlyDealtCards, setNewlyDealtCards] = useState(new Set()); // Track newly dealt cards for highlight
  const [showDealerDrawMessage, setShowDealerDrawMessage] = useState(false);
  const [isDealerDrawing, setIsDealerDrawing] = useState(false);
  
  // Track grayed-out cells (cards on the board)
  const [grayedOutCards, setGrayedOutCards] = useState(new Set()); // Set of "rank-suit" strings
  const [grayedOutRows, setGrayedOutRows] = useState(new Set()); // Set of suits that are fully grayed
  const [grayedOutColumns, setGrayedOutColumns] = useState(new Set()); // Set of ranks that are fully grayed
  
  // Audio pool for reliable playback (preloaded and ready)
  const audioPoolRef = useRef([]);
  const audioPoolIndexRef = useRef(0);
  const AUDIO_POOL_SIZE = 5; // Pool of 5 preloaded audio instances
  
  // Preload audio pool on mount
  useEffect(() => {
    const pool = [];
    for (let i = 0; i < AUDIO_POOL_SIZE; i++) {
      const audio = new Audio('/card-deal.mp3');
      audio.volume = 0.5;
      audio.preload = 'auto';
      // Preload the audio
      audio.load();
      pool.push(audio);
    }
    audioPoolRef.current = pool;
  }, []);
  
  // Play card dealing sound using preloaded audio pool
  const playDealSound = () => {
    try {
      const pool = audioPoolRef.current;
      if (pool.length === 0) {
        // Fallback: create new audio if pool not ready
        const audio = new Audio('/card-deal.mp3');
        audio.volume = 0.5;
        audio.play().catch(() => {});
        return;
      }
      
      // Get next audio from pool (round-robin)
      const audio = pool[audioPoolIndexRef.current];
      audioPoolIndexRef.current = (audioPoolIndexRef.current + 1) % pool.length;
      
      // Reset to start and play
      audio.currentTime = 0;
      audio.play().catch(err => {
        // Silently handle errors (browser autoplay policies, etc.)
        // console.log('Could not play sound:', err);
      });
    } catch (err) {
      // Silently handle errors
      // console.log('Could not play sound:', err);
    }
  };
  
  // Refs to track current state in async callbacks
  const deckRef = useRef([]);
  const playerCardsRef = useRef([]);
  const dealerCardsRef = useRef([]);
  const selectedCardsRef = useRef(new Set());
  const grayedOutCardsRef = useRef(new Set());
  
  // Ref for throttling dealer hand evaluation
  const dealerHandEvaluationTimeoutRef = useRef(null);
  const lastDealerHandEvaluationRef = useRef(0);
  
  // Sync refs with state
  useEffect(() => {
    deckRef.current = deck;
  }, [deck]);
  
  useEffect(() => {
    playerCardsRef.current = playerCards;
  }, [playerCards]);
  
  useEffect(() => {
    dealerCardsRef.current = dealerCards;
  }, [dealerCards]);
  
  useEffect(() => {
    selectedCardsRef.current = selectedCards;
  }, [selectedCards]);
  
  useEffect(() => {
    grayedOutCardsRef.current = grayedOutCards;
  }, [grayedOutCards]);

  // Initialize CSS variable for card pop scale
  useEffect(() => {
    const cardPopScale = getSetting('cardPopScale');
    document.documentElement.style.setProperty('--card-pop-scale', cardPopScale);
  }, []);

  // Update player hand whenever player cards change
  useEffect(() => {
    if (playerCards.length > 0) {
      const hand = findBestHandFromCards(playerCards);
      setPlayerHand(hand);
    } else {
      setPlayerHand(null);
    }
  }, [playerCards]);

  // Update dealer hand whenever dealer cards change (THROTTLED for performance)
  useEffect(() => {
    // Clear any pending evaluation
    if (dealerHandEvaluationTimeoutRef.current) {
      clearTimeout(dealerHandEvaluationTimeoutRef.current);
    }
    
    if (dealerCards.length === 0) {
      setDealerHand(null);
      return;
    }
    
    // Throttle evaluation: only evaluate every 3 cards or every 500ms during dealing
    // This prevents evaluating all combinations on every single card deal
    const shouldThrottle = isDealing || isDealerDrawing;
    const cardCount = dealerCards.length;
    const timeSinceLastEval = Date.now() - lastDealerHandEvaluationRef.current;
    
    if (shouldThrottle) {
      // During dealing: evaluate every 3 cards or every 500ms, whichever comes first
      const shouldEvaluate = (cardCount % 3 === 0) || (timeSinceLastEval > 500);
      
      if (shouldEvaluate) {
        // Evaluate immediately
        const hand = findBestHandFromCards(dealerCards);
        setDealerHand(hand);
        lastDealerHandEvaluationRef.current = Date.now();
      } else {
        // Schedule evaluation after a delay
        dealerHandEvaluationTimeoutRef.current = setTimeout(() => {
          const hand = findBestHandFromCards(dealerCards);
          setDealerHand(hand);
          lastDealerHandEvaluationRef.current = Date.now();
        }, 500);
      }
    } else {
      // Not dealing: evaluate immediately
      const hand = findBestHandFromCards(dealerCards);
      setDealerHand(hand);
      lastDealerHandEvaluationRef.current = Date.now();
    }
    
    // Cleanup
    return () => {
      if (dealerHandEvaluationTimeoutRef.current) {
        clearTimeout(dealerHandEvaluationTimeoutRef.current);
      }
    };
  }, [dealerCards, isDealing, isDealerDrawing]);
  const [selectedColumns, setSelectedColumns] = useState(new Set()); // Store selected rank columns
  const [selectedRows, setSelectedRows] = useState(new Set()); // Store selected suit rows
  const [dragStart, setDragStart] = useState(null); // {rank, suit} for drag selection start
  const [dragEnd, setDragEnd] = useState(null); // {rank, suit} for drag selection end
  const [isDragging, setIsDragging] = useState(false);
  const [dragTimer, setDragTimer] = useState(null); // Timer for drag delay
  const [mouseDownPos, setMouseDownPos] = useState(null); // Initial mouse down position
  const [dragMode, setDragMode] = useState(null); // 'select' or 'unselect' based on initial card state

  // Initialize deck
  const initializeDeck = () => {
    const newDeck = [];
    for (const suit of suits) {
      for (const rank of ranks) {
        newDeck.push({ suit, rank });
      }
    }
    return newDeck;
  };

  // Sort cards by suit first, then by rank (high to low)
  const sortCards = (cards) => {
    const suitOrder = { '♥': 0, '♦': 1, '♣': 2, '♠': 3 };
    const rankOrder = { 'A': 0, 'K': 1, 'Q': 2, 'J': 3, '10': 4, '9': 5, '8': 6, '7': 7, '6': 8, '5': 9, '4': 10, '3': 11, '2': 12 };
    
    return [...cards].sort((a, b) => {
      // First sort by suit
      const suitDiff = suitOrder[a.suit] - suitOrder[b.suit];
      if (suitDiff !== 0) return suitDiff;
      // Then sort by rank (high to low)
      return rankOrder[a.rank] - rankOrder[b.rank];
    });
  };

  // Sort cards by suit only
  const sortCardsBySuit = (cards) => {
    const suitOrder = { '♥': 0, '♦': 1, '♣': 2, '♠': 3 };
    const rankOrder = { 'A': 0, 'K': 1, 'Q': 2, 'J': 3, '10': 4, '9': 5, '8': 6, '7': 7, '6': 8, '5': 9, '4': 10, '3': 11, '2': 12 };
    
    return [...cards].sort((a, b) => {
      // Sort by suit only
      const suitDiff = suitOrder[a.suit] - suitOrder[b.suit];
      if (suitDiff !== 0) return suitDiff;
      // If same suit, maintain original order (or sort by rank as tiebreaker)
      return rankOrder[a.rank] - rankOrder[b.rank];
    });
  };

  // Sort cards by rank only (high to low)
  const sortCardsByRank = (cards) => {
    const rankOrder = { 'A': 0, 'K': 1, 'Q': 2, 'J': 3, '10': 4, '9': 5, '8': 6, '7': 7, '6': 8, '5': 9, '4': 10, '3': 11, '2': 12 };
    const suitOrder = { '♥': 0, '♦': 1, '♣': 2, '♠': 3 };
    
    return [...cards].sort((a, b) => {
      // Sort by rank only (high to low)
      const rankDiff = rankOrder[a.rank] - rankOrder[b.rank];
      if (rankDiff !== 0) return rankDiff;
      // If same rank, maintain original order (or sort by suit as tiebreaker)
      return suitOrder[a.suit] - suitOrder[b.suit];
    });
  };

  // Shuffle deck
  const shuffleDeck = (deck) => {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // Deal cards
  const dealCards = (deck, count) => {
    return deck.slice(0, count);
  };

  // Evaluate poker hand (using our browser-compatible evaluator)
  const evaluatePokerHand = (cards) => {
    if (cards.length !== 5) return null;
    try {
      return evaluateHand(cards);
    } catch (err) {
      console.error("Error evaluating hand:", err);
      return null;
    }
  };

  // Evaluate high card from any number of cards (1-4 cards)
  const evaluateHighCard = (cards) => {
    if (cards.length === 0) return null;
    
    // Convert cards to values
    const cardValues = cards.map(card => {
      const rank = card.rank;
      let value;
      if (rank === 'A') value = 14;
      else if (rank === 'K') value = 13;
      else if (rank === 'Q') value = 12;
      else if (rank === 'J') value = 11;
      else value = parseInt(rank, 10);
      return value;
    });
    
    const highCard = Math.max(...cardValues);
    
    // Convert value to rank name
    let rankName;
    if (highCard === 14) rankName = 'Ace';
    else if (highCard === 13) rankName = 'King';
    else if (highCard === 12) rankName = 'Queen';
    else if (highCard === 11) rankName = 'Jack';
    else rankName = highCard.toString();
    
    return { value: 1, name: `High card, ${rankName}`, rank: highCard };
  };

  // Find the best possible hand from any number of cards
  const findBestHandFromCards = (cards) => {
    if (cards.length === 0) return null;
    if (cards.length < 5) {
      // For less than 5 cards, show high card
      return evaluateHighCard(cards);
    }
    if (cards.length === 5) {
      return evaluatePokerHand(cards);
    }
    // For more than 5 cards, find the best 5-card combination
    return findBestHand(cards);
  };

  // Find the best 5-card hand from a larger set of cards (OPTIMIZED: checks best hands first, stops early)
  const findBestHand = (cards) => {
    if (cards.length < 5) return null;
    if (cards.length === 5) return evaluatePokerHand(cards);
    
    // For small sets, do full search with early termination
    if (cards.length <= 10) {
      let bestHand = null;
      let bestValue = -1;
      let bestRank = -1;
      
      const generateAll = (arr, size, start, combo) => {
        // Early termination: if we found royal flush, stop
        if (bestValue >= 10) return;
        
        if (combo.length === size) {
          const handEval = evaluatePokerHand([...combo]);
          if (handEval) {
            const comparison = compareHands(handEval.value, handEval.rank, bestValue, bestRank);
            if (comparison > 0) {
              bestHand = handEval;
              bestValue = handEval.value;
              bestRank = handEval.rank;
            }
          }
          return;
        }
        for (let i = start; i < arr.length; i++) {
          combo.push(arr[i]);
          generateAll(arr, size, i + 1, combo);
          combo.pop();
          if (bestValue >= 10) return;
        }
      };
      generateAll(cards, 5, 0, []);
      return bestHand;
    }
    
    // Convert cards to values
    const cardValues = cards.map(card => {
      const rank = card.rank;
      let value;
      if (rank === 'A') value = 14;
      else if (rank === 'K') value = 13;
      else if (rank === 'Q') value = 12;
      else if (rank === 'J') value = 11;
      else value = parseInt(rank, 10);
      return { value, suit: card.suit, rank: card.rank, original: card };
    });
    
    // Group by suit and rank
    const bySuit = {};
    const byRank = {};
    cardValues.forEach(c => {
      if (!bySuit[c.suit]) bySuit[c.suit] = [];
      bySuit[c.suit].push(c);
      if (!byRank[c.value]) byRank[c.value] = [];
      byRank[c.value].push(c);
    });
    
    let bestHand = null;
    let bestValue = -1;
    let bestRank = -1;
    
    // Helper: only check if this hand type could beat current best
    const shouldCheckHandType = (handValue) => {
      return bestValue < handValue;
    };
    
    // Helper: evaluate and update best if better
    const tryHand = (combo) => {
      const handEval = evaluatePokerHand(combo);
      if (handEval) {
        const comparison = compareHands(handEval.value, handEval.rank, bestValue, bestRank);
        if (comparison > 0) {
          bestHand = handEval;
          bestValue = handEval.value;
          bestRank = handEval.rank;
          return true;
        }
      }
      return false;
    };
    
    // 1. ROYAL FLUSH (value 10) - Check straight flushes, stop if found
    if (shouldCheckHandType(10)) {
      for (const suit in bySuit) {
        if (bySuit[suit].length >= 5) {
          const flushCards = bySuit[suit].sort((a, b) => a.value - b.value);
          // Check for straight flush (including royal)
          const values = flushCards.map(c => c.value);
          for (let i = 0; i <= values.length - 5; i++) {
            const straight = values.slice(i, i + 5);
            // Check if consecutive (or wheel)
            let isStraight = true;
            for (let j = 1; j < 5; j++) {
              if (straight[j] !== straight[j-1] + 1) {
                // Check for wheel (A-2-3-4-5)
                if (j === 4 && straight[0] === 2 && straight[4] === 14) {
                  isStraight = true;
                } else {
                  isStraight = false;
                  break;
                }
              }
            }
            if (isStraight) {
              const combo = flushCards.slice(i, i + 5).map(c => c.original);
              if (tryHand(combo) && bestValue >= 10) return bestHand; // Royal/straight flush found
            }
          }
        }
      }
    }
    
    // 2. FOUR OF A KIND (value 8) - Only check if we haven't found better
    if (shouldCheckHandType(8)) {
      const quads = [];
      for (const rank in byRank) {
        if (byRank[rank].length >= 4) {
          quads.push({ rank: parseInt(rank), cards: byRank[rank] });
        }
      }
      quads.sort((a, b) => b.rank - a.rank);
      
      for (const quad of quads) {
        const kickers = cardValues.filter(c => c.value !== quad.rank).sort((a, b) => b.value - a.value);
        if (kickers.length > 0) {
          const combo = [...quad.cards.slice(0, 4), kickers[0]].map(c => c.original);
          if (tryHand(combo) && bestValue >= 8) break; // Found best possible four of a kind
        }
      }
    }
    
    // 3. FULL HOUSE (value 7) - Only check if we haven't found better
    if (shouldCheckHandType(7)) {
      const trips = [];
      const pairs = [];
      for (const rank in byRank) {
        if (byRank[rank].length >= 3) trips.push({ rank: parseInt(rank), cards: byRank[rank] });
        if (byRank[rank].length >= 2) pairs.push({ rank: parseInt(rank), cards: byRank[rank] });
      }
      trips.sort((a, b) => b.rank - a.rank);
      pairs.sort((a, b) => b.rank - a.rank);
      
      for (const trip of trips) {
        for (const pair of pairs) {
          if (trip.rank !== pair.rank) {
            const combo = [...trip.cards.slice(0, 3), ...pair.cards.slice(0, 2)].map(c => c.original);
            if (tryHand(combo)) {
              // Found a full house, check if it's the best possible
              if (bestValue >= 7 && bestRank >= trip.rank) break;
            }
          }
        }
        if (bestValue >= 7) break;
      }
    }
    
    // 4. FLUSH (value 6) - Only check if we haven't found better
    if (shouldCheckHandType(6)) {
      for (const suit in bySuit) {
        if (bySuit[suit].length >= 5) {
          const flushCards = bySuit[suit].sort((a, b) => b.value - a.value);
          // Take top 5 cards (best flush)
          const combo = flushCards.slice(0, 5).map(c => c.original);
          if (tryHand(combo) && bestValue >= 6) break; // Found best possible flush
        }
      }
    }
    
    // 5. STRAIGHT (value 5) - Only check if we haven't found better
    if (shouldCheckHandType(5)) {
      const sortedValues = [...cardValues].sort((a, b) => a.value - b.value);
      const uniqueValues = [...new Set(sortedValues.map(c => c.value))];
      
      // Check for straights
      for (let i = 0; i <= uniqueValues.length - 5; i++) {
        const straightValues = uniqueValues.slice(i, i + 5);
        let isStraight = true;
        for (let j = 1; j < 5; j++) {
          if (straightValues[j] !== straightValues[j-1] + 1) {
            // Check for wheel
            if (j === 4 && straightValues[0] === 2 && straightValues[4] === 14) {
              isStraight = true;
            } else {
              isStraight = false;
              break;
            }
          }
        }
        if (isStraight) {
          // Get one card of each rank for the straight
          const combo = [];
          for (const val of straightValues) {
            const card = sortedValues.find(c => c.value === val);
            if (card) combo.push(card.original);
          }
          if (combo.length === 5 && tryHand(combo) && bestValue >= 5) break;
        }
      }
    }
    
    // 6. THREE OF A KIND (value 4) - Only check if we haven't found better
    if (shouldCheckHandType(4)) {
      const trips = [];
      for (const rank in byRank) {
        if (byRank[rank].length >= 3) {
          trips.push({ rank: parseInt(rank), cards: byRank[rank] });
        }
      }
      trips.sort((a, b) => b.rank - a.rank);
      
      for (const trip of trips) {
        const kickers = cardValues.filter(c => c.value !== trip.rank).sort((a, b) => b.value - a.value);
        if (kickers.length >= 2) {
          const combo = [...trip.cards.slice(0, 3), kickers[0], kickers[1]].map(c => c.original);
          if (tryHand(combo) && bestValue >= 4 && bestRank >= trip.rank) break;
        }
      }
    }
    
    // 7. TWO PAIR (value 3) - Only check if we haven't found better
    if (shouldCheckHandType(3)) {
      const pairs = [];
      for (const rank in byRank) {
        if (byRank[rank].length >= 2) {
          pairs.push({ rank: parseInt(rank), cards: byRank[rank] });
        }
      }
      pairs.sort((a, b) => b.rank - a.rank);
      
      for (let i = 0; i < pairs.length - 1; i++) {
        for (let j = i + 1; j < pairs.length; j++) {
          const kickers = cardValues.filter(c => c.value !== pairs[i].rank && c.value !== pairs[j].rank)
            .sort((a, b) => b.value - a.value);
          if (kickers.length > 0) {
            const combo = [...pairs[i].cards.slice(0, 2), ...pairs[j].cards.slice(0, 2), kickers[0]].map(c => c.original);
            if (tryHand(combo) && bestValue >= 3) break;
          }
        }
        if (bestValue >= 3) break;
      }
    }
    
    // 8. ONE PAIR (value 2) - Only check if we haven't found better
    if (shouldCheckHandType(2)) {
      const pairs = [];
      for (const rank in byRank) {
        if (byRank[rank].length >= 2) {
          pairs.push({ rank: parseInt(rank), cards: byRank[rank] });
        }
      }
      pairs.sort((a, b) => b.rank - a.rank);
      
      for (const pair of pairs) {
        const kickers = cardValues.filter(c => c.value !== pair.rank).sort((a, b) => b.value - a.value);
        if (kickers.length >= 3) {
          const combo = [...pair.cards.slice(0, 2), ...kickers.slice(0, 3)].map(c => c.original);
          if (tryHand(combo) && bestValue >= 2 && bestRank >= pair.rank) break;
        }
      }
    }
    
    // 9. HIGH CARD (value 1) - Only if nothing better found
    if (bestHand === null || bestValue < 1) {
      const sortedCards = [...cardValues].sort((a, b) => b.value - a.value);
      const combo = sortedCards.slice(0, 5).map(c => c.original);
      tryHand(combo);
    }
    
    return bestHand;
  };

  // Memoize board cards as a Set for O(1) lookup
  // Function to update grayed-out state when a card is dealt
  // Update grayed-out state - returns the new state values without triggering updates
  // This allows us to batch all updates together
  const calculateGrayedOutState = (card, currentGrayedCards) => {
    const cardKey = `${card.rank}-${card.suit}`;
    const newGrayedCards = new Set(currentGrayedCards);
    newGrayedCards.add(cardKey);
    
    // Check if the row (suit) is now fully grayed out
    const allInRowGrayed = ranks.every(rank => {
      const key = `${rank}-${card.suit}`;
      return newGrayedCards.has(key);
    });
    
    // Check if the column (rank) is now fully grayed out
    const allInColumnGrayed = suitsDisplay.every(suit => {
      const key = `${card.rank}-${suit}`;
      return newGrayedCards.has(key);
    });
    
    return {
      newGrayedCards,
      rowFullyGrayed: allInRowGrayed ? card.suit : null,
      columnFullyGrayed: allInColumnGrayed ? card.rank : null
    };
  };

  // Check if a card is grayed out (for backward compatibility with existing code)
  const isCardInBoard = (rank, suit) => {
    return grayedOutCards.has(`${rank}-${suit}`);
  };

  // Toggle entire column selection
  const toggleColumnSelection = (rank) => {
    setSelectedColumns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(rank)) {
        // Unselect entire column
        newSet.delete(rank);
        setSelectedCards(prevCards => {
          const newCardSet = new Set(prevCards);
          suitsDisplay.forEach(suit => {
            const cardKey = `${rank}-${suit}`;
            newCardSet.delete(cardKey);
          });
          
          // Update row selection state after unselecting column
          setSelectedRows(prevRows => {
            const newRowSet = new Set(prevRows);
            suitsDisplay.forEach(suit => {
              // Get all selectable (non-board) cards in this row
              const selectableCards = ranks.filter(r => !isCardInBoard(r, suit));
              
              // If all cards in row are on board, don't mark row as selected
              if (selectableCards.length === 0) {
                newRowSet.delete(suit);
              } else {
                // Check if all selectable cards in this row are selected
                const allRowSelected = selectableCards.every(r => {
                  const key = `${r}-${suit}`;
                  return newCardSet.has(key);
                });
                if (allRowSelected) {
                  newRowSet.add(suit);
                } else {
                  newRowSet.delete(suit);
                }
              }
            });
            return newRowSet;
          });
          
          return newCardSet;
        });
      } else {
        // Select entire column
        newSet.add(rank);
        setSelectedCards(prevCards => {
          const newCardSet = new Set(prevCards);
          suitsDisplay.forEach(suit => {
            const cardKey = `${rank}-${suit}`;
            newCardSet.add(cardKey);
          });
          
          // Update row selection state after selecting column
          setSelectedRows(prevRows => {
            const newRowSet = new Set(prevRows);
            suitsDisplay.forEach(suit => {
              // Get all selectable (non-board) cards in this row
              const selectableCards = ranks.filter(r => !isCardInBoard(r, suit));
              
              // If all cards in row are on board, don't mark row as selected
              if (selectableCards.length === 0) {
                newRowSet.delete(suit);
              } else {
                // Check if all selectable cards in this row are selected
                const allRowSelected = selectableCards.every(r => {
                  const key = `${r}-${suit}`;
                  return newCardSet.has(key);
                });
                if (allRowSelected) {
                  newRowSet.add(suit);
                } else {
                  newRowSet.delete(suit);
                }
              }
            });
            return newRowSet;
          });
          
          return newCardSet;
        });
      }
      return newSet;
    });
  };

  // Toggle entire row selection
  const toggleRowSelection = (suit) => {
    setSelectedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(suit)) {
        // Unselect entire row (excluding board cards)
        newSet.delete(suit);
        setSelectedCards(prevCards => {
          const newCardSet = new Set(prevCards);
          ranks.forEach(rank => {
            if (!isCardInBoard(rank, suit)) {
              const cardKey = `${rank}-${suit}`;
              newCardSet.delete(cardKey);
            }
          });
          
          // Update column selection state after unselecting row
          updateColumnRowStates(newCardSet);
          
          return newCardSet;
        });
      } else {
        // Select entire row (excluding board cards)
        newSet.add(suit);
        setSelectedCards(prevCards => {
          const newCardSet = new Set(prevCards);
          ranks.forEach(rank => {
            if (!isCardInBoard(rank, suit)) {
              const cardKey = `${rank}-${suit}`;
              newCardSet.add(cardKey);
            }
          });
          
          // Update column selection state after selecting row
          updateColumnRowStates(newCardSet);
          
          return newCardSet;
        });
      }
      return newSet;
    });
  };

  // Update column and row selection states based on selected cards
  const updateColumnRowStates = (selectedCardsSet) => {
    // Update column states
    setSelectedColumns(prevCols => {
      const newColSet = new Set(prevCols);
      ranks.forEach(rank => {
        // Get all selectable (non-board) cards in this column
        const selectableCards = suitsDisplay.filter(s => !isCardInBoard(rank, s));
        
        // If all cards in column are on board, don't mark column as selected
        if (selectableCards.length === 0) {
          newColSet.delete(rank);
        } else {
          // Check if all selectable cards in this column are selected
          const allColumnSelected = selectableCards.every(s => {
            const key = `${rank}-${s}`;
            return selectedCardsSet.has(key);
          });
          if (allColumnSelected) {
            newColSet.add(rank);
          } else {
            newColSet.delete(rank);
          }
        }
      });
      return newColSet;
    });
    
    // Update row states
    setSelectedRows(prevRows => {
      const newRowSet = new Set(prevRows);
      suitsDisplay.forEach(suit => {
        // Get all selectable (non-board) cards in this row
        const selectableCards = ranks.filter(r => !isCardInBoard(r, suit));
        
        // If all cards in row are on board, don't mark row as selected
        if (selectableCards.length === 0) {
          newRowSet.delete(suit);
        } else {
          // Check if all selectable cards in this row are selected
          const allRowSelected = selectableCards.every(r => {
            const key = `${r}-${suit}`;
            return selectedCardsSet.has(key);
          });
          if (allRowSelected) {
            newRowSet.add(suit);
          } else {
            newRowSet.delete(suit);
          }
        }
      });
      return newRowSet;
    });
  };

  // Handle mouse down for drag selection
  const handleMouseDown = (rank, suit, e) => {
    // Only start drag on card cells, not on buttons
    if (e.target.closest('button')) return;
    
    // Don't allow selection of board cards
    if (isCardInBoard(rank, suit)) return;
    
    // Determine if we're starting on a selected or unselected card
    const cardKey = `${rank}-${suit}`;
    const isSelected = selectedCards.has(cardKey);
    const mode = isSelected ? 'unselect' : 'select';
    
    // Store initial position
    const initialPos = { rank, suit, x: e.clientX, y: e.clientY };
    setMouseDownPos(initialPos);
    setDragStart({ rank, suit });
    setDragEnd({ rank, suit });
    setDragMode(mode);
    
    // Start timer - if mouseUp doesn't happen within 100ms, enable dragging
    const timer = setTimeout(() => {
      setIsDragging(true);
    }, 100);
    
    setDragTimer(timer);
  };

  // Handle mouse move for drag selection
  const handleMouseMove = (rank, suit) => {
    if (isDragging && dragStart) {
      setDragEnd({ rank, suit });
    }
  };

  // Handle mouse up to complete drag selection
  const handleMouseUp = (e) => {
    // Clear the drag timer if it exists (mouseUp happened before 100ms)
    if (dragTimer) {
      clearTimeout(dragTimer);
      setDragTimer(null);
    }
    
    // If we were dragging, process the drag selection
    if (isDragging && dragStart && dragEnd) {
      // Get all ranks and suits in the selection rectangle
      const startRankIndex = ranks.indexOf(dragStart.rank);
      const endRankIndex = ranks.indexOf(dragEnd.rank);
      const startSuitIndex = suitsDisplay.indexOf(dragStart.suit);
      const endSuitIndex = suitsDisplay.indexOf(dragEnd.suit);
      
      const minRankIndex = Math.min(startRankIndex, endRankIndex);
      const maxRankIndex = Math.max(startRankIndex, endRankIndex);
      const minSuitIndex = Math.min(startSuitIndex, endSuitIndex);
      const maxSuitIndex = Math.max(startSuitIndex, endSuitIndex);
      
      // Select or unselect all cards in the rectangle (excluding board cards)
      setSelectedCards(prev => {
        const newSet = new Set(prev);
        for (let r = minRankIndex; r <= maxRankIndex; r++) {
          for (let s = minSuitIndex; s <= maxSuitIndex; s++) {
            const rank = ranks[r];
            const suit = suitsDisplay[s];
            // Only process if not in board
            if (!isCardInBoard(rank, suit)) {
              const cardKey = `${rank}-${suit}`;
              if (dragMode === 'select') {
                newSet.add(cardKey);
              } else if (dragMode === 'unselect') {
                newSet.delete(cardKey);
              }
            }
          }
        }
        
        // Update column and row selection states
        updateColumnRowStates(newSet);
        
        return newSet;
      });
    }
    
    // Reset drag state
    setIsDragging(false);
    setDragStart(null);
    setDragEnd(null);
    setDragMode(null);
    
    // Clear mouseDownPos after a small delay to allow onClick to process
    const currentMouseDownPos = mouseDownPos;
    setTimeout(() => {
      setMouseDownPos(null);
    }, 100);
  };

  // Check if a card is in the drag selection rectangle
  const isInDragSelection = (rank, suit) => {
    if (!dragStart || !dragEnd || !isDragging) return false;
    
    const rankIndex = ranks.indexOf(rank);
    const suitIndex = suitsDisplay.indexOf(suit);
    const startRankIndex = ranks.indexOf(dragStart.rank);
    const endRankIndex = ranks.indexOf(dragEnd.rank);
    const startSuitIndex = suitsDisplay.indexOf(dragStart.suit);
    const endSuitIndex = suitsDisplay.indexOf(dragEnd.suit);
    
    const minRankIndex = Math.min(startRankIndex, endRankIndex);
    const maxRankIndex = Math.max(startRankIndex, endRankIndex);
    const minSuitIndex = Math.min(startSuitIndex, endSuitIndex);
    const maxSuitIndex = Math.max(startSuitIndex, endSuitIndex);
    
    return rankIndex >= minRankIndex && rankIndex <= maxRankIndex &&
           suitIndex >= minSuitIndex && suitIndex <= maxSuitIndex;
  };

  // Toggle card selection in rule popup
  const toggleCardSelection = (rank, suit) => {
    // Don't allow selection of board cards
    if (isCardInBoard(rank, suit)) return;
    
    const cardKey = `${rank}-${suit}`;
    setSelectedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cardKey)) {
        newSet.delete(cardKey);
      } else {
        newSet.add(cardKey);
      }
      
      // Update column and row selection states
      updateColumnRowStates(newSet);
      
      return newSet;
    });
  };

  // Toggle all cards selection
  const toggleAllCards = () => {
    if (isDealing) return;
    
    // Get all possible cards (excluding board cards)
    const allSelectableCards = new Set();
    ranks.forEach(rank => {
      suitsDisplay.forEach(suit => {
        if (!isCardInBoard(rank, suit)) {
          allSelectableCards.add(`${rank}-${suit}`);
        }
      });
    });
    
    // Check if all selectable cards are currently selected
    const allSelected = allSelectableCards.size > 0 && 
      Array.from(allSelectableCards).every(cardKey => selectedCards.has(cardKey));
    
    if (allSelected) {
      // Deselect all cards
      setSelectedCards(new Set());
      setSelectedColumns(new Set());
      setSelectedRows(new Set());
    } else {
      // Select all selectable cards
      setSelectedCards(new Set(allSelectableCards));
      
      // Update column and row selections
      const newColumns = new Set();
      const newRows = new Set();
      
      ranks.forEach(rank => {
        const allInColumnSelected = suitsDisplay.every(suit => {
          const cardKey = `${rank}-${suit}`;
          return isCardInBoard(rank, suit) || allSelectableCards.has(cardKey);
        });
        if (allInColumnSelected && suitsDisplay.some(suit => !isCardInBoard(rank, suit))) {
          newColumns.add(rank);
        }
      });
      
      suitsDisplay.forEach(suit => {
        const allInRowSelected = ranks.every(rank => {
          const cardKey = `${rank}-${suit}`;
          return isCardInBoard(rank, suit) || allSelectableCards.has(cardKey);
        });
        if (allInRowSelected && ranks.some(rank => !isCardInBoard(rank, suit))) {
          newRows.add(suit);
        }
      });
      
      setSelectedColumns(newColumns);
      setSelectedRows(newRows);
    }
  };

  // Start game
  const startGame = () => {
    // Clear any ongoing deal timeouts
    if (dealTimeout) {
      clearTimeout(dealTimeout);
      setDealTimeout(null);
    }
    
    setPlayerCards([]);
    setDealerCards([]);
    setPlayerHand(null);
    setDealerHand(null);
    setGameResult("");
    
    // Initialize and shuffle deck at game start
    const newDeck = shuffleDeck(initializeDeck());
    setDeck(newDeck);
    deckRef.current = newDeck;
    
    setGameStarted(true);
    setGameEnded(false);
    setIsDealing(false);
    setShowDealerDrawMessage(false);
    setIsDealerDrawing(false);
    
    // Reset refs
    playerCardsRef.current = [];
    dealerCardsRef.current = [];
    
    // Reset selection state
    setSelectedCards(new Set());
    setSelectedColumns(new Set());
    setSelectedRows(new Set());
    selectedCardsRef.current = new Set();
    
    // Reset grayed-out state
    setGrayedOutCards(new Set());
    setGrayedOutRows(new Set());
    setGrayedOutColumns(new Set());
  };

  // Deal one card sequentially with delays
  const dealCard = () => {
    if (playerCardsRef.current.length >= 5) {
      return; // Game already ended - player has 5 cards
    }

    if (isDealing) {
      return; // Already dealing
    }

    setIsDealing(true);

    // Deal first card after initial delay
    const initialDelay = getSetting('initialDealDelay');
    const firstTimeout = setTimeout(() => {
      const deck = deckRef.current;
      if (deck.length === 0) {
        // Deck is empty - player loses immediately
        setIsDealing(false);
        setNewlyDealtCards(new Set()); // Clear highlights
        setGameResult("You lose!");
        setLosses(prevLosses => {
          const newLosses = prevLosses + 1;
          localStorage.setItem('gameLosses', newLosses.toString());
          return newLosses;
        });
        setGameEnded(true);
        return;
      }

      // Deal first card from deck (always from the deck, no filtering)
      const firstCard = deck[0];
      const newDeck = deck.slice(1);
      deckRef.current = newDeck;
      
      // Calculate all state changes first (use ref to get current state)
      const grayedState = calculateGrayedOutState(firstCard, grayedOutCardsRef.current);
      const cardKey = `${firstCard.rank}-${firstCard.suit}`;
      const isSelected = selectedCardsRef.current.has(cardKey);
      
      // Play card dealing sound
      playDealSound();
      
      // Batch ALL state updates together in a single render
      startTransition(() => {
        // Update deck
        setDeck(newDeck);
        
        // Update grayed-out state
        setGrayedOutCards(grayedState.newGrayedCards);
        if (grayedState.rowFullyGrayed) {
          setGrayedOutRows(prev => {
            const newRows = new Set(prev);
            newRows.add(grayedState.rowFullyGrayed);
            return newRows;
          });
        }
        if (grayedState.columnFullyGrayed) {
          setGrayedOutColumns(prev => {
            const newCols = new Set(prev);
            newCols.add(grayedState.columnFullyGrayed);
            return newCols;
          });
        }
        
        // Remove card from selectedCards if it was selected (since it's now on the board)
        setSelectedCards(prev => {
          const newSet = new Set(prev);
          if (newSet.has(cardKey)) {
            newSet.delete(cardKey);
            // Update ref immediately
            selectedCardsRef.current = newSet;
            // Update column and row selection states after removing card
            updateColumnRowStates(newSet);
          }
          return newSet;
        });
        
        if (isSelected) {
          // Card is selected - give to player and stop
          const newPlayerCards = [...playerCardsRef.current, firstCard];
          playerCardsRef.current = newPlayerCards;
          setPlayerCards(newPlayerCards);
          
          // Highlight newly dealt card (it's at the end)
          const highlightIndex = newPlayerCards.length - 1;
          setNewlyDealtCards(new Set([`player-${highlightIndex}`]));
          
          setIsDealing(false);
        
          // Check if player has 5 cards - game ends
          if (newPlayerCards.length === 5) {
            // For last card, sort after highlight period, then finish game
            // Use initial delay for highlight period
            setTimeout(() => {
              const currentCards = playerCardsRef.current;
              const sortedCards = sortCards(currentCards);
              playerCardsRef.current = sortedCards;
              setPlayerCards(sortedCards);
              setNewlyDealtCards(new Set());
              finishGameWithPlayerHand(sortedCards, dealerCardsRef.current);
            }, initialDelay);
          } else {
            // Sort cards after highlight period ends (matches initial delay)
            // Use ref to get current state when timeout executes
            setTimeout(() => {
              const currentCards = playerCardsRef.current;
              const sortedCards = sortCards(currentCards);
              playerCardsRef.current = sortedCards;
              setPlayerCards(sortedCards);
              setNewlyDealtCards(new Set());
            }, initialDelay);
          }
        } else {
          // Card is not selected - give to dealer and continue
          const newDealerCards = [...dealerCardsRef.current, firstCard];
          dealerCardsRef.current = newDealerCards;
          setDealerCards(newDealerCards);
          
          // Highlight newly dealt card (it's at the end)
          const highlightIndex = newDealerCards.length - 1;
          setNewlyDealtCards(new Set([`dealer-${highlightIndex}`]));
          
          // Sort cards after highlight period ends (matches initial delay)
          // Use ref to get current state when timeout executes
          setTimeout(() => {
            const currentCards = dealerCardsRef.current;
            const sortedCards = sortCards(currentCards);
            dealerCardsRef.current = sortedCards;
            setDealerCards(sortedCards);
            setNewlyDealtCards(new Set());
          }, initialDelay);
          
          // Continue dealing after repeat delay
          continueDealing();
        }
      });
    }, initialDelay);

    setDealTimeout(firstTimeout);
  };

  // Continue dealing cards sequentially
  const continueDealing = () => {
    const repeatDelay = getSetting('repeatDealDelay');
    const nextTimeout = setTimeout(() => {
      const deck = deckRef.current;
      if (deck.length === 0) {
        // Deck is empty - player loses immediately
        setIsDealing(false);
        setNewlyDealtCards(new Set()); // Clear highlights
        setGameResult("You lose!");
        setLosses(prevLosses => {
          const newLosses = prevLosses + 1;
          localStorage.setItem('gameLosses', newLosses.toString());
          return newLosses;
        });
        setGameEnded(true);
        return;
      }

      // Deal next card from deck (always from the deck, no filtering)
      const nextCard = deck[0];
      const newDeck = deck.slice(1);
      deckRef.current = newDeck;
      
      // Calculate all state changes first (use ref to get current state)
      const grayedState = calculateGrayedOutState(nextCard, grayedOutCardsRef.current);
      const cardKey = `${nextCard.rank}-${nextCard.suit}`;
      const isSelected = selectedCardsRef.current.has(cardKey);
      
      // Play card dealing sound
      playDealSound();
      
      // Batch ALL state updates together in a single render
      startTransition(() => {
        // Update deck
        setDeck(newDeck);
        
        // Update grayed-out state
        setGrayedOutCards(grayedState.newGrayedCards);
        if (grayedState.rowFullyGrayed) {
          setGrayedOutRows(prev => {
            const newRows = new Set(prev);
            newRows.add(grayedState.rowFullyGrayed);
            return newRows;
          });
        }
        if (grayedState.columnFullyGrayed) {
          setGrayedOutColumns(prev => {
            const newCols = new Set(prev);
            newCols.add(grayedState.columnFullyGrayed);
            return newCols;
          });
        }
        
        // Remove card from selectedCards if it was selected (since it's now on the board)
        setSelectedCards(prev => {
          const newSet = new Set(prev);
          if (newSet.has(cardKey)) {
            newSet.delete(cardKey);
            // Update ref immediately
            selectedCardsRef.current = newSet;
            // Update column and row selection states after removing card
            updateColumnRowStates(newSet);
          }
          return newSet;
        });
        
        if (isSelected) {
          // Card is selected - give to player and stop
          const newPlayerCards = [...playerCardsRef.current, nextCard];
          playerCardsRef.current = newPlayerCards;
          setPlayerCards(newPlayerCards);
          
          // Highlight newly dealt card (it's at the end)
          const highlightIndex = newPlayerCards.length - 1;
          setNewlyDealtCards(new Set([`player-${highlightIndex}`]));
          
          setIsDealing(false);
        
          // Check if player has 5 cards - game ends
          if (newPlayerCards.length === 5) {
            // For last card, sort after highlight period, then finish game
            // Use repeat delay for highlight period
            setTimeout(() => {
              const currentCards = playerCardsRef.current;
              const sortedCards = sortCards(currentCards);
              playerCardsRef.current = sortedCards;
              setPlayerCards(sortedCards);
              setNewlyDealtCards(new Set());
              finishGameWithPlayerHand(sortedCards, dealerCardsRef.current);
            }, repeatDelay);
          } else {
            // Sort cards after highlight period ends (matches repeat delay)
            // Use ref to get current state when timeout executes
            setTimeout(() => {
              const currentCards = playerCardsRef.current;
              const sortedCards = sortCards(currentCards);
              playerCardsRef.current = sortedCards;
              setPlayerCards(sortedCards);
              setNewlyDealtCards(new Set());
            }, repeatDelay);
          }
        } else {
          // Card is not selected - give to dealer and continue
          const newDealerCards = [...dealerCardsRef.current, nextCard];
          dealerCardsRef.current = newDealerCards;
          setDealerCards(newDealerCards);
          
          // Highlight newly dealt card (it's at the end)
          const highlightIndex = newDealerCards.length - 1;
          setNewlyDealtCards(new Set([`dealer-${highlightIndex}`]));
          
          // Sort cards after highlight period ends (matches repeat delay)
          // Use ref to get current state when timeout executes
          setTimeout(() => {
            const currentCards = dealerCardsRef.current;
            const sortedCards = sortCards(currentCards);
            dealerCardsRef.current = sortedCards;
            setDealerCards(sortedCards);
            setNewlyDealtCards(new Set());
          }, repeatDelay);
          
          // Continue dealing after repeat delay (no limit on dealer cards)
          continueDealing();
        }
      });
    }, repeatDelay);

    setDealTimeout(nextTimeout);
  };

  // Finish game when player gets 5 cards
  const finishGameWithPlayerHand = (playerCards, dealerCards) => {
    // If dealer has < 8 cards, deal them cards until they have 8
    if (dealerCards.length < 8) {
      dealDealerToEight(playerCards, dealerCards);
    } else {
      // Dealer already has 8+ cards, evaluate immediately
      evaluateGame(playerCards, dealerCards);
    }
  };

  // Deal dealer cards until they have 8 cards (one by one with delays)
  const dealDealerToEight = (playerCards, dealerCards) => {
    const cardsNeeded = 8 - dealerCards.length;
    
    if (cardsNeeded <= 0) {
      // Already have 8+ cards, evaluate immediately
      evaluateGame(playerCards, dealerCards);
      return;
    }
    
    // Show message
    setShowDealerDrawMessage(true);
    setIsDealerDrawing(true);
    
    let currentDeck = deckRef.current;
    let currentDealerCards = [...dealerCards];
    let cardsDealt = 0;
    
    // Deal first card after showing message
    const dealNextDealerCard = () => {
      if (cardsDealt >= cardsNeeded || currentDeck.length === 0) {
        // Done dealing - sort final cards before evaluating
        const sortedDealerCards = sortCards(currentDealerCards);
        deckRef.current = currentDeck;
        dealerCardsRef.current = sortedDealerCards;
        setDeck(currentDeck);
        setDealerCards(sortedDealerCards);
        setIsDealerDrawing(false);
        setShowDealerDrawMessage(false);
        
        // Clear highlights before evaluating
        setNewlyDealtCards(new Set());
        
        // Now evaluate the game
        evaluateGame(playerCards, sortedDealerCards);
        return;
      }
      
      // Deal one card
      const card = currentDeck[0];
      currentDeck = currentDeck.slice(1);
      // Add card to end (unsorted) for highlighting
      currentDealerCards.push(card);
      cardsDealt++;
      
      // Calculate grayed-out state (use ref to get current state)
      const grayedState = calculateGrayedOutState(card, grayedOutCardsRef.current);
      const cardKey = `${card.rank}-${card.suit}`;
      
      // Update refs
      deckRef.current = currentDeck;
      dealerCardsRef.current = currentDealerCards;
      
      // Play sound
      playDealSound();
      
      // Batch ALL state updates together
      startTransition(() => {
        setDeck(currentDeck);
        setDealerCards(currentDealerCards);
        
        // Update grayed-out state
        setGrayedOutCards(grayedState.newGrayedCards);
        if (grayedState.rowFullyGrayed) {
          setGrayedOutRows(prev => {
            const newRows = new Set(prev);
            newRows.add(grayedState.rowFullyGrayed);
            return newRows;
          });
        }
        if (grayedState.columnFullyGrayed) {
          setGrayedOutColumns(prev => {
            const newCols = new Set(prev);
            newCols.add(grayedState.columnFullyGrayed);
            return newCols;
          });
        }
        
        // Remove card from selectedCards if it was selected (since it's now on the board)
        setSelectedCards(prev => {
          const newSet = new Set(prev);
          if (newSet.has(cardKey)) {
            newSet.delete(cardKey);
            // Update ref immediately
            selectedCardsRef.current = newSet;
            // Update column and row selection states after removing card
            updateColumnRowStates(newSet);
          }
          return newSet;
        });
        
        // Highlight newly dealt card (it's at the end)
        const cardIndex = currentDealerCards.length - 1;
        setNewlyDealtCards(new Set([`dealer-${cardIndex}`]));
      });
      
      // Sort cards after highlight period ends (matches dealer draw delay)
      // Use ref to get current state when timeout executes
      const dealerDelay = getSetting('dealerDrawDelay');
      setTimeout(() => {
        const currentCards = dealerCardsRef.current;
        const sortedCards = sortCards(currentCards);
        dealerCardsRef.current = sortedCards;
        setDealerCards(sortedCards);
        setNewlyDealtCards(new Set());
      }, dealerDelay);
      
      // Deal next card after dealer draw delay
      setTimeout(() => {
        dealNextDealerCard();
      }, dealerDelay);
    };
    
    // Start dealing after a short delay to show message
    setTimeout(() => {
      dealNextDealerCard();
    }, 1000);
  };

  // Evaluate game after player gets 5 cards
  const evaluateGame = (finalPlayerCards, finalDealerCards) => {
    const playerHandEval = evaluatePokerHand(finalPlayerCards);
    const dealerHandEval = findBestHand(finalDealerCards);
    
    setPlayerHand(playerHandEval);
    setDealerHand(dealerHandEval);
    
    // Determine winner
    if (playerHandEval && dealerHandEval) {
      const comparison = compareHands(
        playerHandEval.value,
        playerHandEval.rank,
        dealerHandEval.value,
        dealerHandEval.rank
      );
      
      if (comparison > 0) {
        setGameResult("You win!");
        setWins(prevWins => {
          const newWins = prevWins + 1;
          localStorage.setItem('gameWins', newWins.toString());
          return newWins;
        });
      } else if (comparison < 0) {
        setGameResult("You lose!");
        setLosses(prevLosses => {
          const newLosses = prevLosses + 1;
          localStorage.setItem('gameLosses', newLosses.toString());
          return newLosses;
        });
      } else {
        // Ties are losses
        setGameResult("You lose! Ties are losses.");
        setLosses(prevLosses => {
          const newLosses = prevLosses + 1;
          localStorage.setItem('gameLosses', newLosses.toString());
          return newLosses;
        });
      }
    }
    
    // Mark game as ended
    setGameEnded(true);
  };

  // Load stats from localStorage
  useEffect(() => {
    const savedWins = parseInt(localStorage.getItem('gameWins') || '0', 10);
    const savedLosses = parseInt(localStorage.getItem('gameLosses') || '0', 10);
    setWins(savedWins);
    setLosses(savedLosses);
  }, []);

  // Card component
  const Card = ({ card, isHighlighted }) => {
    const isRed = card.suit === '♥' || card.suit === '♦';
    return (
      <div className={`card ${isHighlighted ? 'newly-dealt' : ''}`}>
        <div className={`card-rank ${isRed ? 'red' : ''}`}>{card.rank}</div>
        <div className={`card-suit ${isRed ? 'red' : ''}`}>{card.suit}</div>
      </div>
    );
  };

  // Calculate win rate and Bayesian score
  const totalGames = wins + losses;
  const winRate = totalGames > 0 ? ((wins / totalGames) * 100).toFixed(1) : '0.0';
  const alpha = 0;
  const beta = 10;
  const bayesianScore = ((wins + alpha) / (wins + losses + alpha + beta) * 100).toFixed(1);

  return (
    <div className="game-container">
      <h1>Poker Game</h1>
      
      <div className="stats-display">
        <div className="stat-item">
          <span className="stat-label">Wins:</span>
          <span className="stat-value">{wins}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Losses:</span>
          <span className="stat-value">{losses}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Win Rate:</span>
          <span className="stat-value">{winRate}%</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Bayesian Score:</span>
          <span className="stat-value">{bayesianScore}%</span>
        </div>
      </div>

      {!gameStarted && (
        <div className="game-buttons">
          <button className="start-btn" onClick={startGame}>
            Start game
          </button>
        </div>
      )}

      {gameStarted && !gameEnded && !isDealing && !isDealerDrawing && (
        <div className="game-buttons">
          <button className="start-btn" onClick={dealCard}>
            Deal
          </button>
        </div>
      )}

      {gameEnded && (
        <div className="game-buttons">
          <button className="start-btn" onClick={startGame}>
            Restart game
          </button>
        </div>
      )}

      {showDealerDrawMessage && (
        <div className="dealer-draw-message">
          Dealer will now draw up to 8 cards
        </div>
      )}

      {gameResult && (
        <div className={`game-result ${gameResult.includes('win') ? 'win' : gameResult.includes('lose') ? 'lose' : 'tie'}`}>
          {gameResult}
        </div>
      )}

      <div className="cards-container">
        <div className="cards-section">
          <h2>Player Cards</h2>
          {playerHand && (
            <div className="hand-name">Hand: {playerHand.name}</div>
          )}
          <div className="cards-display">
            {playerCards.map((card, index) => (
              <Card 
                key={index} 
                card={card} 
                isHighlighted={newlyDealtCards.has(`player-${index}`)}
              />
            ))}
          </div>
        </div>

        <div className="cards-section">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
            <h2>Dealer Cards</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
              <span>Sort by:</span>
              <button 
                className="sort-btn"
                onClick={() => {
                  const sorted = sortCardsBySuit(dealerCards);
                  dealerCardsRef.current = sorted;
                  setDealerCards(sorted);
                }}
                disabled={dealerCards.length === 0}
              >
                Suit
              </button>
              <button 
                className="sort-btn"
                onClick={() => {
                  const sorted = sortCardsByRank(dealerCards);
                  dealerCardsRef.current = sorted;
                  setDealerCards(sorted);
                }}
                disabled={dealerCards.length === 0}
              >
                Rank
              </button>
            </div>
          </div>
          {dealerHand && (
            <div className="hand-name">Hand: {dealerHand.name}</div>
          )}
          <div className="cards-display">
            {dealerCards.map((card, index) => (
              <Card 
                key={index} 
                card={card} 
                isHighlighted={newlyDealtCards.has(`dealer-${index}`)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Rule Selection Matrix */}
      {gameStarted && (
        <div className={`rule-matrix-container ${isDealing ? 'dealing-phase' : ''}`}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <h2>Select Cards to Include</h2>
          </div>
          <div 
            className={`card-matrix ${isDealing ? 'disabled' : ''}`}
            onMouseUp={handleMouseUp}
            onMouseLeave={(e) => {
              // If mouse leaves while dragging, complete the drag
              if (isDragging) {
                handleMouseUp(e);
              } else {
                // Just clear the timer if we weren't dragging yet
                if (dragTimer) {
                  clearTimeout(dragTimer);
                  setDragTimer(null);
                }
                setIsDragging(false);
                setDragStart(null);
                setDragEnd(null);
                setMouseDownPos(null);
              }
            }}
          >
            <div className="matrix-header">
              <div className="matrix-cell header-cell">
                <button 
                  className="all-toggle-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isDealing) {
                      toggleAllCards();
                    }
                  }}
                  disabled={isDealing}
                >
                  all
                </button>
              </div>
              {ranks.map(rank => {
                const isColumnSelected = selectedColumns.has(rank);
                // Check if all cards in this column are grayed out
                const allInBoard = grayedOutColumns.has(rank);
                return (
                  <div key={rank} className={`matrix-cell header-cell ${isColumnSelected ? 'column-selected' : ''} ${allInBoard ? 'board-column' : ''}`}>
                    <button 
                      className="column-toggle-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!allInBoard && !isDealing) {
                          toggleColumnSelection(rank);
                        }
                      }}
                      disabled={allInBoard || isDealing}
                    >
                      {rank}
                    </button>
                  </div>
                );
              })}
            </div>
            {suitsDisplay.map(suit => {
              const isRowSelected = selectedRows.has(suit);
              return (
                <div key={suit} className="matrix-row">
                  <div className={`matrix-cell header-cell ${isRowSelected ? 'row-selected' : ''}`}>
                    <button 
                      className="row-toggle-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Check if all cards in this row are grayed out
                        const allInBoard = grayedOutRows.has(suit);
                        if (!allInBoard && !isDealing) {
                          toggleRowSelection(suit);
                        }
                      }}
                      disabled={grayedOutRows.has(suit) || isDealing}
                    >
                      {suit}
                    </button>
                  </div>
                  {ranks.map(rank => {
                    const cardKey = `${rank}-${suit}`;
                    const isSelected = selectedCards.has(cardKey);
                    const isInDrag = isInDragSelection(rank, suit);
                    const isInBoard = grayedOutCards.has(cardKey);
                    const isRed = suit === '♥' || suit === '♦';
                    // Determine drag visual state: if unselecting, show different style
                    const dragClass = isInDrag ? (dragMode === 'unselect' ? 'drag-unselected' : 'drag-selected') : '';
                    return (
                        <div
                          key={cardKey}
                          className={`matrix-cell card-cell ${isSelected ? 'selected' : ''} ${dragClass} ${isInBoard ? 'board-card' : ''}`}
                          onMouseDown={(e) => !isInBoard && !isDealing && handleMouseDown(rank, suit, e)}
                          onMouseMove={() => {
                            if (isDragging && !isInBoard && !isDealing) {
                              handleMouseMove(rank, suit);
                            }
                          }}
                          onClick={(e) => {
                            // Don't allow clicks on board cards or during dealing
                            if (isInBoard || isDealing) return;
                            // Only toggle if we weren't dragging (i.e., mouseUp happened before 100ms)
                            // and this is the same card we started the mouseDown on
                            if (!isDragging && mouseDownPos && 
                                mouseDownPos.rank === rank && mouseDownPos.suit === suit) {
                              toggleCardSelection(rank, suit);
                            }
                          }}
                        >
                        <div className={`matrix-card-rank ${isRed ? 'red' : ''} ${isInBoard ? 'grayed-out' : ''}`}>{rank}</div>
                        <div className={`matrix-card-suit ${isRed ? 'red' : ''} ${isInBoard ? 'grayed-out' : ''}`}>{suit}</div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
          
          {/* Statistics below matrix */}
          <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '8px', fontSize: '0.95rem' }}>
            {(() => {
              const cardsOnBoard = playerCards.length + dealerCards.length;
              const cardsRemaining = 52 - cardsOnBoard;
              const deckPercentSelected = cardsRemaining > 0 
                ? ((selectedCards.size / cardsRemaining) * 100).toFixed(1) 
                : '0.0';
              
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div>Currently including {selectedCards.size} cards</div>
                  <div>{cardsRemaining} cards remaining in the deck</div>
                  <div>Deck {deckPercentSelected}% selected</div>
                  <div>Dealer has {dealerCards.length} cards</div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default Game;
