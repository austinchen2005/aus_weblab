import React, { useState, useEffect, useRef, startTransition, useContext } from "react";
import { evaluateHands, findBestHandFromCards } from "../../utils/pokerEvaluator";
import { getSetting } from "../../utils/gameSettings";
import { UserContext } from "../App";
import { get, post } from "../../utilities";
import { combination, playSound } from "../../utils/misc";
import { ACHIEVEMENTS } from "../../constants/achievements";
import "../../utilities.css";
import "./Game.css";
import Skeleton from "./Skeleton";
import SelectionMatrix from "../SelectionMatrix";

const suits = ['♥', '♦', '♣', '♠']; // Heart, Diamond, Club, Spade
const suitsDisplay = ['♥', '♦', '♣', '♠'];
const ranks = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2'];

const GameInner = () => {
  const { userId, user } = useContext(UserContext);
  const [deck, setDeck] = useState([]);
  const [playerCards, setPlayerCards] = useState([]);
  const [dealerCards, setDealerCards] = useState([]);
  const [playerHand, setPlayerHand] = useState(null);
  const [dealerHand, setDealerHand] = useState(null);
  const [gameResult, setGameResult] = useState("");
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);
  const [winRate, setWinRate] = useState(0); // fraction from server
  const [bayesianScore, setBayesianScore] = useState(0);
  const [hasPendingLoss, setHasPendingLoss] = useState(false);
  const [selectedCards, setSelectedCards] = useState(new Set()); // Store as "rank-suit" strings
  const [gameStarted, setGameStarted] = useState(false);
  const [gameEnded, setGameEnded] = useState(false);
  const [isDealing, setIsDealing] = useState(false);
  const [dealTimeout, setDealTimeout] = useState(null);
  const [newlyDealtCards, setNewlyDealtCards] = useState(new Set()); // Track newly dealt cards for bright highlight (format: "dealer-{index}" or "player-{index}")
  const [faintHighlightDealerCards, setFaintHighlightDealerCards] = useState(new Set()); // Track dealer cards for faint highlight during Deal session (format: "rank-suit")
  const [showDealerDrawMessage, setShowDealerDrawMessage] = useState(false);
  const [isDealerDrawing, setIsDealerDrawing] = useState(false);
  const [achievementPopups, setAchievementPopups] = useState([]);
  const [dealerSortMode, setDealerSortMode] = useState('rank'); // 'suit' or 'rank'
  
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
  
  const dealSoundVolume = getSetting('dealSoundVolume');
  const winSoundVolume = getSetting('winSoundVolume');
  const loseSoundVolume = getSetting('loseSoundVolume');

  // Play card dealing sound using preloaded audio pool
  const playDealSound = () => {
    const pool = audioPoolRef.current;
    if (pool.length === 0) {
      // Fallback: create new audio if pool not ready
      const audio = new Audio("/card-deal.mp3");
      playSound(audio, dealSoundVolume);
      return;
    }

    // Get next audio from pool (round-robin)
    const audio = pool[audioPoolIndexRef.current];
    audioPoolIndexRef.current = (audioPoolIndexRef.current + 1) % pool.length;

    playSound(audio, dealSoundVolume);
  };

  // Play win sound
  const playWinSound = () => {
    const audio = new Audio("/win-sound.wav");
    playSound(audio, winSoundVolume);
  };

  // Play lose sound
  const playLoseSound = () => {
    const audio = new Audio("/lose-sound.mp3");
    playSound(audio, loseSoundVolume);
  };
  
  // Refs to track current state in async callbacks
  const deckRef = useRef([]);
  const playerCardsRef = useRef([]);
  const dealerCardsRef = useRef([]);
  const dealerSortModeRef = useRef('rank');
  const selectedCardsRef = useRef(new Set());
  const grayedOutCardsRef = useRef(new Set());
  const achievementsRef = useRef(new Set());
  
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
  // SelectionMatrix manages its own column/row header state and drag state;
  // we only track the selected card keys here.

  const handleSelectionChange = (newSelectedSet) => {
    setSelectedCards(newSelectedSet);
    selectedCardsRef.current = new Set(newSelectedSet);
  };

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

  // Sort dealer cards based on current sort mode preference
  const sortDealerCards = (cards) => {
    if (dealerSortModeRef.current === 'rank') {
      return sortCardsByRank(cards);
    } else {
      return sortCardsBySuit(cards);
    }
  };

  // Keep ref in sync with state
  useEffect(() => {
    dealerSortModeRef.current = dealerSortMode;
  }, [dealerSortMode]);

  // Shuffle deck
  const shuffleDeck = (deck) => {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
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
    const emptySelection = new Set();
    setSelectedCards(emptySelection);
    selectedCardsRef.current = emptySelection;
    
    // Reset grayed-out state
    const emptyGrayed = new Set();
    setGrayedOutCards(emptyGrayed);
    setGrayedOutRows(new Set());
    setGrayedOutColumns(new Set());
    grayedOutCardsRef.current = emptyGrayed;

    // Clear all highlights
    setNewlyDealtCards(new Set());
    setFaintHighlightDealerCards(new Set());

    // Record a provisional loss in the background so refreshes mid-game count as a loss
    if (userId && !hasPendingLoss) {
      post("/api/incrementLoss")
        .then(() => {
          // Don't update visible stats yet; just remember there is a pending loss
          setHasPendingLoss(true);
        })
        .catch((err) => {
          console.error("Failed to create pending loss on game start:", err);
        });
    }
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
        setFaintHighlightDealerCards(new Set()); // Clear faint highlights when dealing ends
        setGameResult("You lose!");
        playLoseSound();
        // If we created a pending loss, it already counts; just sync stats if needed when game ends
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
              setFaintHighlightDealerCards(new Set()); // Clear faint highlights when dealing ends
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
              setFaintHighlightDealerCards(new Set()); // Clear faint highlights when dealing ends
            }, initialDelay);
          }
        } else {
          // Card is not selected - give to dealer and continue
          const newDealerCards = [...dealerCardsRef.current, firstCard];
          dealerCardsRef.current = newDealerCards;
          setDealerCards(newDealerCards);
          
          // Add to faint highlight set (will persist) - use card identifier
          const cardKey = `${firstCard.rank}-${firstCard.suit}`;
          setFaintHighlightDealerCards(prev => new Set(prev).add(cardKey));
          
          // Bright highlight for newest card
          const highlightIndex = newDealerCards.length - 1;
          setNewlyDealtCards(new Set([`dealer-${highlightIndex}`]));
          
          // Sort cards after highlight period ends (matches initial delay)
          // Use ref to get current state when timeout executes
          setTimeout(() => {
            const currentCards = dealerCardsRef.current;
            const sortedCards = sortDealerCards(currentCards);
            dealerCardsRef.current = sortedCards;
            setDealerCards(sortedCards);
            // Clear bright highlight but keep faint highlight (tracked by card key, not index)
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
        setFaintHighlightDealerCards(new Set()); // Clear faint highlights when dealing ends
        setGameResult("You lose!");
        playLoseSound();
        // If we created a pending loss, it already counts; just sync stats if needed when game ends
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
              setFaintHighlightDealerCards(new Set()); // Clear faint highlights when dealing ends
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
              setFaintHighlightDealerCards(new Set()); // Clear faint highlights when dealing ends
            }, repeatDelay);
          }
        } else {
          // Card is not selected - give to dealer and continue
          const newDealerCards = [...dealerCardsRef.current, nextCard];
          dealerCardsRef.current = newDealerCards;
          setDealerCards(newDealerCards);
          
          // Add to faint highlight set (will persist) - use card identifier
          const cardKey = `${nextCard.rank}-${nextCard.suit}`;
          setFaintHighlightDealerCards(prev => new Set(prev).add(cardKey));
          
          // Bright highlight for newest card
          const highlightIndex = newDealerCards.length - 1;
          setNewlyDealtCards(new Set([`dealer-${highlightIndex}`]));
          
          // Sort cards after highlight period ends (matches repeat delay)
          // Use ref to get current state when timeout executes
          setTimeout(() => {
            const currentCards = dealerCardsRef.current;
            const sortedCards = sortDealerCards(currentCards);
            dealerCardsRef.current = sortedCards;
            setDealerCards(sortedCards);
            // Clear bright highlight but keep faint highlight (tracked by card key, not index)
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
    
    // Clear faint highlights when dealer drawing phase starts (different from Deal session)
    setFaintHighlightDealerCards(new Set());
    
    let currentDeck = deckRef.current;
    let currentDealerCards = [...dealerCards];
    let cardsDealt = 0;
    
    // Deal first card after showing message
    const dealNextDealerCard = () => {
      if (cardsDealt >= cardsNeeded || currentDeck.length === 0) {
        // Done dealing - sort final cards before evaluating
        const sortedDealerCards = sortDealerCards(currentDealerCards);
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
        const sortedCards = sortDealerCards(currentCards);
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
    // Clear all highlights when game ends
    setNewlyDealtCards(new Set());
    setFaintHighlightDealerCards(new Set());
    
    const { playerHand: playerHandEval, dealerHand: dealerHandEval, comparison } =
      evaluateHands(finalPlayerCards, finalDealerCards);

    setPlayerHand(playerHandEval);
    setDealerHand(dealerHandEval);
    
    // Determine winner
    if (playerHandEval && dealerHandEval) {
      
      if (comparison > 0) {
        setGameResult("You win!");
        playWinSound();
        
        // Update wins: send to server if logged in
        if (userId) {
          // If we created a pending loss at game start, cancel that loss and add a win instead
          console.log("Player hand evaluation:", playerHandEval);
          const handAchievementIds = getHandAchievementIds(playerHandEval);
          console.log("Hand achievement IDs:", handAchievementIds);

          // Optimistic update: show new stats immediately
          const newWins = hasPendingLoss ? wins + 1 : wins + 1;
          const newLosses = hasPendingLoss ? losses : losses;
          const newTotal = newWins + newLosses;
          const newWinRate = newTotal > 0 ? newWins / newTotal : 0;
          const newBayesianScore = (newWins + 0) / (newWins + newLosses + 0 + 10);
          
          setWins(newWins);
          setLosses(newLosses);
          setWinRate(newWinRate);
          setBayesianScore(newBayesianScore);
          if (hasPendingLoss) {
            setHasPendingLoss(false);
          }

          const unlockHandAchievements = (baseUser) => {
            if (!handAchievementIds.length) {
              console.log("No hand achievement IDs to unlock for hand:", playerHandEval);
              return Promise.resolve(baseUser);
            }
            console.log("Unlocking achievements:", handAchievementIds, "for hand:", playerHandEval);
            return post("/api/unlockAchievements", { ids: handAchievementIds }).then(
              (userWithAchievements) => {
                console.log("Achievements unlocked, user now has:", userWithAchievements.achievements);
                handleAchievementsFromUser(userWithAchievements);
                return userWithAchievements;
              }
            ).catch((err) => {
              console.error("Failed to unlock achievements:", err);
              return baseUser; // Return base user if achievement unlock fails
            });
          };

          if (hasPendingLoss) {
            post("/api/updateStats", { wins: wins + 1, losses })
              .then((updatedUser) =>
                unlockHandAchievements(updatedUser).then((finalUser) => {
                  // Update with server values (may differ slightly due to server-side calculation)
                  setWins(finalUser.wins || 0);
                  setLosses(finalUser.losses || 0);
                  setWinRate(finalUser.winRate || 0);
                  setBayesianScore(finalUser.bayesianScore || 0);
                })
              )
              .catch((err) => {
                console.error("Failed to convert pending loss to win on server:", err);
                // Revert optimistic update on error
                get("/api/whoami").then((userData) => {
                  setWins(userData.wins || 0);
                  setLosses(userData.losses || 0);
                  setWinRate(userData.winRate || 0);
                  setBayesianScore(userData.bayesianScore || 0);
                });
              });
          } else {
            post("/api/incrementWin")
              .then((updatedUser) =>
                unlockHandAchievements(updatedUser).then((finalUser) => {
                  // Update with server values (may differ slightly due to server-side calculation)
                  setWins(finalUser.wins || 0);
                  setLosses(finalUser.losses || 0);
                  setWinRate(finalUser.winRate || 0);
                  setBayesianScore(finalUser.bayesianScore || 0);
                })
              )
              .catch((err) => {
                console.error("Failed to update win on server:", err);
                // Revert optimistic update on error
                get("/api/whoami").then((userData) => {
                  setWins(userData.wins || 0);
                  setLosses(userData.losses || 0);
                  setWinRate(userData.winRate || 0);
                  setBayesianScore(userData.bayesianScore || 0);
                });
              });
          }
        }
      } else if (comparison < 0) {
        setGameResult("You lose!");
        playLoseSound();
        
        // Update losses: send to server if logged in
        if (userId) {
          if (hasPendingLoss) {
            // Pending loss already recorded; just sync visible stats from server
            get("/api/whoami")
              .then((userData) => {
                if (userData._id) {
                  setWins(userData.wins || 0);
                  setLosses(userData.losses || 0);
                  setWinRate(userData.winRate || 0);
                  setBayesianScore(userData.bayesianScore || 0);
                  handleAchievementsFromUser(userData);
                }
                setHasPendingLoss(false);
              })
              .catch((err) => {
                console.error("Failed to sync loss stats from server:", err);
              });
          } else {
            post("/api/incrementLoss")
              .then((updatedUser) => {
                setWins(updatedUser.wins || 0);
                setLosses(updatedUser.losses || 0);
                setWinRate(updatedUser.winRate || 0);
                setBayesianScore(updatedUser.bayesianScore || 0);
                handleAchievementsFromUser(updatedUser);
              })
              .catch((err) => {
                console.error("Failed to update loss on server:", err);
              });
          }
        }
      } else {
        // Ties are losses
        setGameResult("You lose! Ties are losses.");
        playLoseSound();
        
        // Update losses: send to server if logged in
        if (userId) {
          if (hasPendingLoss) {
            // Pending loss already recorded; just sync visible stats from server
            get("/api/whoami")
              .then((userData) => {
                if (userData._id) {
                  setWins(userData.wins || 0);
                  setLosses(userData.losses || 0);
                  setWinRate(userData.winRate || 0);
                  setBayesianScore(userData.bayesianScore || 0);
                  handleAchievementsFromUser(userData);
                }
                setHasPendingLoss(false);
              })
              .catch((err) => {
                console.error("Failed to sync loss stats from server:", err);
              });
          } else {
            post("/api/incrementLoss")
              .then((updatedUser) => {
                setWins(updatedUser.wins || 0);
                setLosses(updatedUser.losses || 0);
                setWinRate(updatedUser.winRate || 0);
                setBayesianScore(updatedUser.bayesianScore || 0);
                handleAchievementsFromUser(updatedUser);
              })
              .catch((err) => {
                console.error("Failed to update loss on server:", err);
              });
          }
        }
      }
    }
    
    // Mark game as ended
    setGameEnded(true);
  };

  // Load stats from server on mount and when userId changes
  useEffect(() => {
    if (userId) {
      // User is logged in - fetch fresh data from server
      get("/api/whoami")
        .then((userData) => {
          if (userData._id) {
            setWins(userData.wins || 0);
            setLosses(userData.losses || 0);
            setWinRate(userData.winRate || 0);
            setBayesianScore(userData.bayesianScore || 0);
            achievementsRef.current = new Set(userData.achievements || []);
          }
        })
        .catch((err) => {
          console.error("Failed to load stats from server:", err);
        });
    } else {
      // User not logged in - reset to 0
      setWins(0);
      setLosses(0);
      setWinRate(0);
      setBayesianScore(0);
      achievementsRef.current = new Set();
    }
  }, [userId]);

  // Helper to handle newly unlocked achievements from a user object
  const handleAchievementsFromUser = (userData) => {
    const currentIds = Array.isArray(userData.achievements) ? userData.achievements : [];
    const prevSet = achievementsRef.current || new Set();
    const newSet = new Set(currentIds);

    const newlyUnlocked = currentIds.filter((id) => !prevSet.has(id));
    achievementsRef.current = newSet;

    if (newlyUnlocked.length === 0) return;

    const popupDuration = getSetting('achievementPopupDuration');

    newlyUnlocked.forEach((id) => {
      const meta = ACHIEVEMENTS.find((a) => a.id === id);
      if (!meta) return;

      setAchievementPopups((prev) => [...prev, { id, title: meta.title }]);

      setTimeout(() => {
        setAchievementPopups((prev) => prev.filter((p) => p.id !== id));
      }, popupDuration);
    });
  };

  // Map a winning hand to achievement IDs
  const getHandAchievementIds = (hand) => {
    if (!hand) return [];
    switch (hand.value) {
      case 10:
        return ["royalty"];
      case 9:
        return ["ruler_flush"];
      case 8:
        return ["leg_day"];
      case 7:
        return ["filled_home"];
      case 6:
        return ["flush_toilet"];
      case 5:
        return ["straightforward"];
      case 4:
        return ["ouch"];
      case 3:
        return ["twos_better_than_one"];
      case 2:
        return ["got_a_pair"];
      case 1:
        return ["no_hand_needed"];
      default:
        return [];
    }
  };

  // Card component
  const Card = ({ card, isHighlighted, isFaintHighlighted }) => {
    const isRed = card.suit === '♥' || card.suit === '♦';
    return (
      <div className={`card ${isHighlighted ? 'newly-dealt' : ''} ${isFaintHighlighted ? 'faint-highlight' : ''}`}>
        <div className={`card-rank ${isRed ? 'red' : ''}`}>{card.rank}</div>
        <div className={`card-suit ${isRed ? 'red' : ''}`}>{card.suit}</div>
      </div>
    );
  };

  // Use server-side winRate and bayesianScore
  const winRatePercent = (winRate * 100).toFixed(1);
  const bayesianScoreDisplay = bayesianScore.toFixed(3);

  return (
    <div className="game-container">
      {achievementPopups.length > 0 && (
        <div className="achievement-popup-container">
          {achievementPopups.map((popup) => (
            <div key={popup.id} className="achievement-popup">
              <div className="achievement-popup-title">Achievement unlocked!</div>
              <div className="achievement-popup-body">{popup.title}</div>
            </div>
          ))}
        </div>
      )}
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
          <span className="stat-value">{winRatePercent}%</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Bayesian Score:</span>
          <span className="stat-value">{bayesianScoreDisplay}</span>
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
                  setDealerSortMode('suit');
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
                  setDealerSortMode('rank');
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
            {dealerCards.map((card, index) => {
              const cardKey = `${card.rank}-${card.suit}`;
              return (
                <Card 
                  key={index} 
                  card={card} 
                  isHighlighted={newlyDealtCards.has(`dealer-${index}`)}
                  isFaintHighlighted={faintHighlightDealerCards.has(cardKey)}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Rule Selection Matrix */}
      {gameStarted && (
        <div className={`rule-matrix-container ${isDealing ? 'dealing-phase' : ''}`}>
          <SelectionMatrix
            selectedCards={selectedCards}
            onSelectionChange={handleSelectionChange}
            grayedOutCards={grayedOutCards}
            grayedOutRows={grayedOutRows}
            grayedOutColumns={grayedOutColumns}
            isDealing={isDealing}
          />
          {/* Statistics below matrix */}
          <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '8px', fontSize: '0.95rem' }}>
            {(() => {
              const cardsOnBoard = playerCards.length + dealerCards.length;
              const cardsRemaining = 52 - cardsOnBoard;
              const percentSelected = cardsRemaining > 0 
                ? ((selectedCards.size / cardsRemaining) * 100) 
                : 0;
              const percentSelectedStr = percentSelected.toFixed(1);
              const numSelected = selectedCards.size;
              
              // Calculate expected cards for dealer: 1/(% selected) - 1
              // Convert percentage to decimal (divide by 100)
              const percentAsDecimal = percentSelected / 100;
              const expectedCardsForDealer = numSelected > 0 ? ((cardsRemaining + 1) / (numSelected + 1)) - 1 : cardsRemaining;
              
              // Calculate tail end probability
              // p = numSelected, d = cardsRemaining, x = 8 - dealerCards.length
              // Formula: C(d-p, x+1) / C(d, x+1)
              const p = numSelected;
              const d = cardsRemaining;
              const x = 8 - dealerCards.length;
              let tailEndProbability;
              
              // If p=0, formula not valid and tEP = 1
              if (p === 0) {
                tailEndProbability = 1.0;
              }
              // If x+1 > d-p, formula not valid and tEP = 0
              else if (x + 1 > d - p) {
                tailEndProbability = 0.0;
              }
              // Otherwise, use formula: C(d-p, x+1) / C(d, x+1)
              else {
                const numerator = combination(d - p, x + 1);
                const denominator = combination(d, x + 1);
                tailEndProbability = denominator > 0 ? numerator / denominator : 0.0;
              }
              const tailEndProbabilityStr = tailEndProbability.toFixed(3);
              
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div>Currently including {selectedCards.size} cards</div>
                  <div>{cardsRemaining} cards remaining in the deck</div>
                  <div>{percentSelectedStr}% selected</div>
                  <div>Expected {expectedCardsForDealer.toFixed(2)} cards for dealer</div>
                  <div>Dealer has {dealerCards.length} cards</div>
                  <div>Tail end probability: {tailEndProbabilityStr}</div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

// Wrapper component to gate the game behind login without breaking hooks
const Game = () => {
  const { userId } = useContext(UserContext);

  if (!userId) {
    return (
      <div className="game-container">
        <h1>Poker Game</h1>
        <p>Please login first.</p>
        <Skeleton />
      </div>
    );
  }

  return <GameInner />;
};

export default Game;
