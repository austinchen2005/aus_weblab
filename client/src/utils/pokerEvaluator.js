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
    let lowRank, highRank, straightRank;
    if (values[0] === 2 && values[4] === 14) {
      // Wheel (A-2-3-4-5) - rank is 5, not 14 (Ace)
      lowRank = 'A';
      highRank = '5';
      straightRank = 5; // A-5 is the lowest straight
    } else {
      lowRank = valueToRank(values[0]);
      highRank = valueToRank(values[4]);
      straightRank = values[4]; // Regular straight uses high card
    }
    return { value: 9, name: `Straight Flush, ${getSuitName(flushSuit)} ${lowRank}-${highRank}`, rank: straightRank };
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
    let lowRank, highRank, straightRank;
    if (values[0] === 2 && values[4] === 14) {
      // Wheel (A-2-3-4-5) - rank is 5, not 14 (Ace)
      lowRank = 'A';
      highRank = '5';
      straightRank = 5; // A-5 is the lowest straight
    } else {
      lowRank = valueToRank(values[0]);
      highRank = valueToRank(values[4]);
      straightRank = values[4]; // Regular straight uses high card
    }
    return { value: 5, name: `Straight, ${lowRank}-${highRank}`, rank: straightRank };
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

// ===== Extended helpers previously in handEvaluator.js =====

// Compare two poker hands (returns 1 if hand1 > hand2, -1 if hand1 < hand2, 0 if equal)
export function compareHands(hand1Value, hand1Rank, hand2Value, hand2Rank) {
  if (hand1Value > hand2Value) return 1;
  if (hand1Value < hand2Value) return -1;
  // If same hand value, compare ranks
  if (hand1Rank > hand2Rank) return 1;
  if (hand1Rank < hand2Rank) return -1;
  return 0;
}

// Evaluate 5-card poker hand using existing evaluator (wrapper)
export function evaluatePokerHand(cards) {
  return evaluateHand(cards);
}

// Evaluate hand from any number of cards (1-4 cards) - detects pairs, three of a kind, etc.
export function evaluateHighCard(cards) {
  if (cards.length === 0) return null;

  // Convert cards to values
  const cardValues = cards.map((card) => {
    const rank = card.rank;
    let value;
    if (rank === "A") value = 14;
    else if (rank === "K") value = 13;
    else if (rank === "Q") value = 12;
    else if (rank === "J") value = 11;
    else value = parseInt(rank, 10);
    return value;
  });

  // Count occurrences of each value
  const counts = {};
  for (const value of cardValues) {
    counts[value] = (counts[value] || 0) + 1;
  }

  // Convert value to rank name
  const valueToRankName = (value) => {
    if (value === 14) return "Ace";
    if (value === 13) return "King";
    if (value === 12) return "Queen";
    if (value === 11) return "Jack";
    return value.toString();
  };

  // Check for three of a kind
  for (const [value, count] of Object.entries(counts)) {
    if (count === 3) {
      const val = parseInt(value, 10);
      return { value: 4, name: `Three of a Kind, ${valueToRankName(val)}`, rank: val };
    }
  }

  // Check for two pair (if 4 cards)
  if (cards.length === 4) {
    const pairs = [];
    for (const [value, count] of Object.entries(counts)) {
      if (count === 2) {
        pairs.push(parseInt(value, 10));
      }
    }
    if (pairs.length === 2) {
      const highPair = Math.max(...pairs);
      const lowPair = Math.min(...pairs);
      return {
        value: 3,
        name: `Two Pair, ${valueToRankName(highPair)} and ${valueToRankName(lowPair)}`,
        rank: highPair,
      };
    }
  }

  // Check for pair (must come AFTER two-pair check)
  for (const [value, count] of Object.entries(counts)) {
    if (count === 2) {
      const val = parseInt(value, 10);
      return { value: 2, name: `Pair of ${valueToRankName(val)}`, rank: val };
    }
  }

  // High card
  const highCard = Math.max(...cardValues);
  return { value: 1, name: `High card, ${valueToRankName(highCard)}`, rank: highCard };
}

// Find the best 5-card hand from a larger set of cards (OPTIMIZED: checks best hands first, stops early)
export function findBestHand(cards) {
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
  const cardValues = cards.map((card) => {
    const rank = card.rank;
    let value;
    if (rank === "A") value = 14;
    else if (rank === "K") value = 13;
    else if (rank === "Q") value = 12;
    else if (rank === "J") value = 11;
    else value = parseInt(rank, 10);
    return { value, suit: card.suit, rank: card.rank, original: card };
  });

  // Group by suit and rank
  const bySuit = {};
  const byRank = {};
  cardValues.forEach((c) => {
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

  // 1. ROYAL FLUSH / STRAIGHT FLUSH (value 10)
  if (shouldCheckHandType(10)) {
    for (const suit in bySuit) {
      if (bySuit[suit].length >= 5) {
        const flushCards = bySuit[suit].sort((a, b) => a.value - b.value);
        const values = flushCards.map((c) => c.value);
        for (let i = 0; i <= values.length - 5; i++) {
          const straight = values.slice(i, i + 5);
          let isStraight = true;
          for (let j = 1; j < 5; j++) {
            if (straight[j] !== straight[j - 1] + 1) {
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
            const combo = flushCards.slice(i, i + 5).map((c) => c.original);
            if (tryHand(combo) && bestValue >= 10) return bestHand;
          }
        }
      }
    }
  }

  // 2. FOUR OF A KIND (value 8)
  if (shouldCheckHandType(8)) {
    const quads = [];
    for (const rank in byRank) {
      if (byRank[rank].length >= 4) {
        quads.push({ rank: parseInt(rank), cards: byRank[rank] });
      }
    }
    quads.sort((a, b) => b.rank - a.rank);

    for (const quad of quads) {
      const kickers = cardValues
        .filter((c) => c.value !== quad.rank)
        .sort((a, b) => b.value - a.value);
      if (kickers.length > 0) {
        const combo = [...quad.cards.slice(0, 4), kickers[0]].map((c) => c.original);
        if (tryHand(combo) && bestValue >= 8) break;
      }
    }
  }

  // 3. FULL HOUSE (value 7)
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
          const combo = [...trip.cards.slice(0, 3), ...pair.cards.slice(0, 2)].map(
            (c) => c.original
          );
          if (tryHand(combo)) {
            if (bestValue >= 7 && bestRank >= trip.rank) break;
          }
        }
      }
      if (bestValue >= 7) break;
    }
  }

  // 4. FLUSH (value 6)
  if (shouldCheckHandType(6)) {
    for (const suit in bySuit) {
      if (bySuit[suit].length >= 5) {
        const flushCards = bySuit[suit].sort((a, b) => b.value - a.value);
        const combo = flushCards.slice(0, 5).map((c) => c.original);
        if (tryHand(combo) && bestValue >= 6) break;
      }
    }
  }

  // 5. STRAIGHT (value 5)
  if (shouldCheckHandType(5)) {
    const sortedValues = [...cardValues].sort((a, b) => a.value - b.value);
    const uniqueValues = [...new Set(sortedValues.map((c) => c.value))];

    for (let i = 0; i <= uniqueValues.length - 5; i++) {
      const straightValues = uniqueValues.slice(i, i + 5);
      let isStraight = true;
      for (let j = 1; j < 5; j++) {
        if (straightValues[j] !== straightValues[j - 1] + 1) {
          if (j === 4 && straightValues[0] === 2 && straightValues[4] === 14) {
            isStraight = true;
          } else {
            isStraight = false;
            break;
          }
        }
      }
      if (isStraight) {
        const combo = [];
        for (const val of straightValues) {
          const card = sortedValues.find((c) => c.value === val);
          if (card) combo.push(card.original);
        }
        if (combo.length === 5 && tryHand(combo) && bestValue >= 5) break;
      }
    }
  }

  // 6. THREE OF A KIND (value 4)
  if (shouldCheckHandType(4)) {
    const trips = [];
    for (const rank in byRank) {
      if (byRank[rank].length >= 3) {
        trips.push({ rank: parseInt(rank), cards: byRank[rank] });
      }
    }
    trips.sort((a, b) => b.rank - a.rank);

    for (const trip of trips) {
      const kickers = cardValues
        .filter((c) => c.value !== trip.rank)
        .sort((a, b) => b.value - a.value);
      if (kickers.length >= 2) {
        const combo = [...trip.cards.slice(0, 3), ...kickers.slice(0, 2)].map(
          (c) => c.original
        );
        if (tryHand(combo) && bestValue >= 4) break;
      }
    }
  }

  // 7. TWO PAIR (value 3)
  if (shouldCheckHandType(3)) {
    const pairs = [];
    for (const rank in byRank) {
      if (byRank[rank].length >= 2) {
        pairs.push({ rank: parseInt(rank), cards: byRank[rank] });
      }
    }
    pairs.sort((a, b) => b.rank - a.rank);

    for (let i = 0; i < pairs.length; i++) {
      for (let j = i + 1; j < pairs.length; j++) {
        const highPair = pairs[i];
        const lowPair = pairs[j];
        const kickers = cardValues
          .filter((c) => c.value !== highPair.rank && c.value !== lowPair.rank)
          .sort((a, b) => b.value - a.value);
        if (kickers.length > 0) {
          const combo = [
            ...highPair.cards.slice(0, 2),
            ...lowPair.cards.slice(0, 2),
            kickers[0],
          ].map((c) => c.original);
          if (tryHand(combo) && bestValue >= 3) break;
        }
      }
      if (bestValue >= 3) break;
    }
  }

  // 8. ONE PAIR (value 2)
  if (shouldCheckHandType(2)) {
    const pairs = [];
    for (const rank in byRank) {
      if (byRank[rank].length >= 2) {
        pairs.push({ rank: parseInt(rank), cards: byRank[rank] });
      }
    }
    pairs.sort((a, b) => b.rank - a.rank);

    for (const pair of pairs) {
      const kickers = cardValues
        .filter((c) => c.value !== pair.rank)
        .sort((a, b) => b.value - a.value);
      if (kickers.length >= 3) {
        const combo = [...pair.cards.slice(0, 2), ...kickers.slice(0, 3)].map(
          (c) => c.original
        );
        if (tryHand(combo) && bestValue >= 2) break;
      }
    }
  }

  // 9. HIGH CARD (value 1)
  if (shouldCheckHandType(1)) {
    const sorted = [...cardValues].sort((a, b) => b.value - a.value);
    const combo = sorted.slice(0, 5).map((c) => c.original);
    tryHand(combo);
  }

  return bestHand;
}

// Best possible hand from any number of cards
export function findBestHandFromCards(cards) {
  if (cards.length === 0) return null;
  if (cards.length < 5) {
    return evaluateHighCard(cards);
  }
  if (cards.length === 5) {
    return evaluatePokerHand(cards);
  }
  return findBestHand(cards);
}

// Evaluate both player and dealer hands at once
export function evaluateHands(playerCards, dealerCards) {
  const playerHand = evaluatePokerHand(playerCards);
  const dealerHand = findBestHandFromCards(dealerCards);

  let comparison = 0;
  if (playerHand && dealerHand) {
    comparison = compareHands(
      playerHand.value,
      playerHand.rank,
      dealerHand.value,
      dealerHand.rank
    );
  }

  return { playerHand, dealerHand, comparison };
}
