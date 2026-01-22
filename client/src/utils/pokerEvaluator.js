// Browser-compatible poker hand evaluator

// Convert value to rank name
function valueToRankName(value) {
  if (value === 14) return 'Aces';
  if (value === 13) return 'Kings';
  if (value === 12) return 'Queens';
  if (value === 11) return 'Jacks';
  return value.toString() + 's';
}

// Convert value to singular rank name
function valueToRankNameSingular(value) {
  if (value === 14) return 'Ace';
  if (value === 13) return 'King';
  if (value === 12) return 'Queen';
  if (value === 11) return 'Jack';
  return value.toString();
}

// Convert value to rank for display
function valueToRank(value) {
  if (value === 14) return 'A';
  if (value === 13) return 'K';
  if (value === 12) return 'Q';
  if (value === 11) return 'J';
  return value.toString();
}

// Get suit name
function getSuitName(suit) {
  const suitNames = {
    '♥': 'Hearts',
    '♦': 'Diamonds',
    '♣': 'Clubs',
    '♠': 'Spades'
  };
  return suitNames[suit] || suit;
}

// Evaluate a poker hand (5 cards) and return hand value and name
export function evaluateHand(cards) {
  if (cards.length !== 5) {
    return null;
  }

  // Convert cards to a format we can work with
  const cardValues = cards.map(card => {
    const rank = card.rank;
    let value;
    if (rank === 'A') value = 14;
    else if (rank === 'K') value = 13;
    else if (rank === 'Q') value = 12;
    else if (rank === 'J') value = 11;
    else value = parseInt(rank, 10);
    
    return {
      value,
      suit: card.suit,
      rank: card.rank
    };
  });

  // Sort by value
  cardValues.sort((a, b) => a.value - b.value);

  const values = cardValues.map(c => c.value);
  const suits = cardValues.map(c => c.suit);
  const uniqueValues = [...new Set(values)];
  const uniqueSuits = [...new Set(suits)];

  const isFlush = uniqueSuits.length === 1;
  const isStraight = checkStraight(values);
  const flushSuit = isFlush ? suits[0] : null;

  // Royal Flush
  if (isFlush && isStraight && values[0] === 10 && values[4] === 14) {
    return { value: 10, name: `Royal Flush, ${getSuitName(flushSuit)}`, rank: 1 };
  }

  // Straight Flush
  if (isFlush && isStraight) {
    let lowRank, highRank;
    if (values[0] === 2 && values[4] === 14) {
      // Wheel (A-2-3-4-5)
      lowRank = 'A';
      highRank = '5';
    } else {
      lowRank = valueToRank(values[0]);
      highRank = valueToRank(values[4]);
    }
    return { value: 9, name: `Straight Flush, ${getSuitName(flushSuit)} ${lowRank}-${highRank}`, rank: values[4] };
  }

  // Four of a Kind
  const fourOfAKind = getNOfAKind(values, 4);
  if (fourOfAKind) {
    return { value: 8, name: `Four of a Kind, ${valueToRankName(fourOfAKind)}`, rank: fourOfAKind };
  }

  // Full House
  const threeOfAKind = getNOfAKind(values, 3);
  const pair = getNOfAKind(values, 2);
  if (threeOfAKind && pair && threeOfAKind !== pair) {
    return { value: 7, name: `Full House, ${valueToRankName(threeOfAKind)} and ${valueToRankName(pair)}`, rank: threeOfAKind };
  }

  // Flush
  if (isFlush) {
    const highCard = getHighCardRank(values);
    return { value: 6, name: `Flush, ${getSuitName(flushSuit)}, ${valueToRankNameSingular(highCard)} high`, rank: highCard };
  }

  // Straight
  if (isStraight) {
    let lowRank, highRank;
    if (values[0] === 2 && values[4] === 14) {
      // Wheel (A-2-3-4-5)
      lowRank = 'A';
      highRank = '5';
    } else {
      lowRank = valueToRank(values[0]);
      highRank = valueToRank(values[4]);
    }
    return { value: 5, name: `Straight, ${lowRank}-${highRank}`, rank: values[4] };
  }

  // Three of a Kind
  if (threeOfAKind) {
    return { value: 4, name: `Three of a Kind, ${valueToRankName(threeOfAKind)}`, rank: threeOfAKind };
  }

  // Two Pair
  const pairs = getAllPairs(values);
  if (pairs.length === 2) {
    const highPair = Math.max(...pairs);
    const lowPair = Math.min(...pairs);
    return { value: 3, name: `Two Pair, ${valueToRankName(highPair)} and ${valueToRankName(lowPair)}`, rank: highPair };
  }

  // One Pair
  if (pair) {
    return { value: 2, name: `Pair of ${valueToRankNameSingular(pair)}`, rank: pair };
  }

  // High Card
  const highCard = getHighCardRank(values);
  return { value: 1, name: `High Card, ${valueToRankNameSingular(highCard)}`, rank: highCard };
}

function checkStraight(values) {
  // Check for regular straight
  for (let i = 1; i < values.length; i++) {
    if (values[i] !== values[i - 1] + 1) {
      // Check for A-2-3-4-5 straight (wheel)
      if (values[0] === 2 && values[1] === 3 && values[2] === 4 && 
          values[3] === 5 && values[4] === 14) {
        return true;
      }
      return false;
    }
  }
  return true;
}

function getNOfAKind(values, n) {
  const counts = {};
  for (const value of values) {
    counts[value] = (counts[value] || 0) + 1;
  }
  for (const [value, count] of Object.entries(counts)) {
    if (count === n) {
      return parseInt(value, 10);
    }
  }
  return null;
}

function getAllPairs(values) {
  const counts = {};
  for (const value of values) {
    counts[value] = (counts[value] || 0) + 1;
  }
  const pairs = [];
  for (const [value, count] of Object.entries(counts)) {
    if (count === 2) {
      pairs.push(parseInt(value, 10));
    }
  }
  return pairs;
}

function getHighCardRank(values) {
  // For high card, return the highest card value
  // For tie-breaking, we'd need more complex logic, but this works for basic comparison
  return Math.max(...values);
}
