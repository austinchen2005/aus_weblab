// Standard 52-card deck
const suits = ['♠', '♥', '♦', '♣'];
const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

// Game state
let deck = [];
let playercards = [];
let dealercards = [];

// Wins and losses - stored in MongoDB per user
let cachedWins = 0;
let cachedLosses = 0;

function getWins() {
  return cachedWins;
}

function getLosses() {
  return cachedLosses;
}

function setWins(wins) {
  cachedWins = wins;
  updateStatsDisplay();
}

function setLosses(losses) {
  cachedLosses = losses;
  updateStatsDisplay();
}

function incrementWins() {
  // DISABLED: Use localStorage instead of server for now
  cachedWins = (cachedWins || 0) + 1;
  localStorage.setItem('gameWins', cachedWins.toString());
  updateStatsDisplay();
  
  // Original server call (disabled):
  // post('/api/increment-wins')
  //   .then((stats) => {
  //     cachedWins = stats.wins;
  //     cachedLosses = stats.losses;
  //     updateStatsDisplay();
  //   })
  //   .catch((err) => {
  //     console.log('Failed to increment wins:', err);
  //   });
}

function incrementLosses() {
  // DISABLED: Use localStorage instead of server for now
  cachedLosses = (cachedLosses || 0) + 1;
  localStorage.setItem('gameLosses', cachedLosses.toString());
  updateStatsDisplay();
  
  // Original server call (disabled):
  // post('/api/increment-losses')
  //   .then((stats) => {
  //     cachedWins = stats.wins;
  //     cachedLosses = stats.losses;
  //     updateStatsDisplay();
  //   })
  //   .catch((err) => {
  //     console.log('Failed to increment losses:', err);
  //   });
}

// Update stats display on all pages
function updateStatsDisplay() {
  const wins = getWins();
  const losses = getLosses();
  
  const winsHome = document.getElementById('wins-display-home');
  const lossesHome = document.getElementById('losses-display-home');
  const winsPlay = document.getElementById('wins-display-play');
  const lossesPlay = document.getElementById('losses-display-play');
  
  if (winsHome) winsHome.textContent = wins;
  if (lossesHome) lossesHome.textContent = losses;
  if (winsPlay) winsPlay.textContent = wins;
  if (lossesPlay) lossesPlay.textContent = losses;
}

// Initialize deck - create all 52 cards
function initializeDeck() {
  deck = [];
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({ suit, rank });
    }
  }
}

// Deal a random card from the deck without replacement
function dealCardFromDeck() {
  if (deck.length === 0) {
    return null; // No cards left
  }
  const randomIndex = Math.floor(Math.random() * deck.length);
  const card = deck.splice(randomIndex, 1)[0]; // Remove and return the card
  return card;
}

// Create card HTML element
function createCardElement(card) {
  const isRed = card.suit === '♥' || card.suit === '♦';
  const suitClass = isRed ? 'red' : '';
  
  return `
    <div class="card">
      <div class="card-rank ${suitClass}">${card.rank}</div>
      <div class="card-suit ${suitClass}">${card.suit}</div>
    </div>
  `;
}

// Display all cards in a container
function displayCards(cards, containerId) {
  const container = document.getElementById(containerId);
  if (container) {
    if (cards.length === 0) {
      container.innerHTML = '<p class="no-cards">No cards yet</p>';
    } else {
      container.innerHTML = cards.map(card => createCardElement(card)).join('');
    }
  }
}

// Get numeric value of a card
function getCardValue(card) {
  const rank = card.rank;
  if (rank === 'A') return 14;
  if (rank === 'J') return 11;
  if (rank === 'Q') return 12;
  if (rank === 'K') return 13;
  return parseInt(rank, 10); // 2-10
}

// Check if player wins - returns true for win, false for loss, null for tie
function checkwin() {
  if (playercards.length === 0 || dealercards.length === 0) {
    return null; // No cards dealt yet
  }
  
  const playerCard = playercards[0];
  const dealerCard = dealercards[0];
  
  const playerValue = getCardValue(playerCard);
  const dealerValue = getCardValue(dealerCard);
  
  if (playerValue > dealerValue) {
    return true; // Win
  } else if (dealerValue > playerValue) {
    return false; // Loss
  } else {
    return null; // Tie
  }
}

// Display game result message
function displayResult() {
  const result = checkwin();
  const resultDisplay = document.getElementById('game-result');
  
  if (!resultDisplay) return;
  
  if (result === true) {
    resultDisplay.textContent = 'You win!';
    resultDisplay.className = 'game-result win';
  } else if (result === false) {
    resultDisplay.textContent = 'You lose!';
    resultDisplay.className = 'game-result lose';
  } else {
    resultDisplay.textContent = 'You tie!';
    resultDisplay.className = 'game-result tie';
  }
}

// Update score based on game result
function updatescore() {
  const result = checkwin();
  
  if (result === true) {
    incrementWins();
  } else if (result === false) {
    incrementLosses();
  }
  // Do nothing if result is null (tie or no cards)
  
  // Display result message
  displayResult();
}

// Start game - deal two cards
function startGame() {
  // Reset game state
  initializeDeck();
  playercards = [];
  dealercards = [];
  
  // Clear result message
  const resultDisplay = document.getElementById('game-result');
  if (resultDisplay) {
    resultDisplay.textContent = '';
    resultDisplay.className = 'game-result';
  }
  
  // Deal first card to player
  const playerCard = dealCardFromDeck();
  if (playerCard) {
    playercards.push(playerCard);
  }
  
  // Deal second card to dealer
  const dealerCard = dealCardFromDeck();
  if (dealerCard) {
    dealercards.push(dealerCard);
  }
  
  // Display cards
  displayCards(playercards, 'player-cards');
  displayCards(dealercards, 'dealer-cards');
  
  // Update score at the end of the game
  updatescore();
}

// Load stats from server
function loadStats() {
  // DISABLED: Use localStorage instead of server for now
  cachedWins = parseInt(localStorage.getItem('gameWins') || '0', 10);
  cachedLosses = parseInt(localStorage.getItem('gameLosses') || '0', 10);
  updateStatsDisplay();
  
  // Original server call (disabled):
  // get('/api/stats')
  //   .then((stats) => {
  //     cachedWins = stats.wins || 0;
  //     cachedLosses = stats.losses || 0;
  //     updateStatsDisplay();
  //   })
  //   .catch((err) => {
  //     console.log('Failed to load stats:', err);
  //     cachedWins = 0;
  //     cachedLosses = 0;
  //     updateStatsDisplay();
  //   });
}

// Make functions available globally
window.updateStatsDisplay = updateStatsDisplay;
window.loadStats = loadStats;

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  const startBtn = document.getElementById('start-game-btn');
  if (startBtn) {
    startBtn.addEventListener('click', startGame);
  }
  
  // Initialize empty displays
  displayCards(playercards, 'player-cards');
  displayCards(dealercards, 'dealer-cards');
  
  // Load stats from server (will be called after auth check)
  // loadStats() is called from auth.js after successful login
});
