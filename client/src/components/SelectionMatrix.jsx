import React, { useState, useEffect, useRef } from "react";

// Local copies of suits/ranks used for the selection matrix
const suitsDisplay = ['♥', '♦', '♣', '♠'];
const ranks = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2'];

/**
 * SelectionMatrix
 *
 * Props:
 * - selectedCards: Set of "rank-suit" strings that are currently selected
 * - onSelectionChange: function(newSelectedSet: Set) -> void
 * - grayedOutCards: Set of "rank-suit" strings that are on the board (cannot be selected)
 * - grayedOutRows: Set of suits that are fully grayed
 * - grayedOutColumns: Set of ranks that are fully grayed
 * - isDealing: boolean flag to disable interactions while dealing
 */
const SelectionMatrix = ({
  selectedCards,
  onSelectionChange,
  grayedOutCards,
  grayedOutRows,
  grayedOutColumns,
  isDealing,
}) => {
  const [selectedColumns, setSelectedColumns] = useState(new Set());
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [dragStart, setDragStart] = useState(null); // {rank, suit}
  const [dragEnd, setDragEnd] = useState(null);     // {rank, suit}
  const [isDragging, setIsDragging] = useState(false);
  const [dragTimer, setDragTimer] = useState(null);
  const [mouseDownPos, setMouseDownPos] = useState(null); // {rank, suit, x, y}
  const [dragMode, setDragMode] = useState(null); // 'select' or 'unselect'

  const dragTimerRef = useRef(null);

  // Keep dragTimerRef in sync
  useEffect(() => {
    dragTimerRef.current = dragTimer;
  }, [dragTimer]);

  // Helper: check if a card is grayed out / on the board
  const isCardInBoard = (rank, suit) => {
    return grayedOutCards.has(`${rank}-${suit}`);
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

  // Keep header row/column selection in sync when parent changes selectedCards or grayedOutCards
  useEffect(() => {
    updateColumnRowStates(selectedCards);
    // We depend on grayedOutCards indirectly via isCardInBoard
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCards, grayedOutCards]);

  // Toggle entire column selection
  const toggleColumnSelection = (rank) => {
    setSelectedColumns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(rank)) {
        // Unselect entire column
        newSet.delete(rank);
        const newCardSet = new Set(selectedCards);
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

        onSelectionChange(newCardSet);
      } else {
        // Select entire column
        newSet.add(rank);
        const newCardSet = new Set(selectedCards);
        suitsDisplay.forEach(suit => {
          const cardKey = `${rank}-${suit}`;
          if (!isCardInBoard(rank, suit)) {
            newCardSet.add(cardKey);
          }
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

        onSelectionChange(newCardSet);
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
        const newCardSet = new Set(selectedCards);
        ranks.forEach(rank => {
          if (!isCardInBoard(rank, suit)) {
            const cardKey = `${rank}-${suit}`;
            newCardSet.delete(cardKey);
          }
        });

        // Update column selection state after unselecting row
        updateColumnRowStates(newCardSet);
        onSelectionChange(newCardSet);
      } else {
        // Select entire row (excluding board cards)
        newSet.add(suit);
        const newCardSet = new Set(selectedCards);
        ranks.forEach(rank => {
          if (!isCardInBoard(rank, suit)) {
            const cardKey = `${rank}-${suit}`;
            newCardSet.add(cardKey);
          }
        });

        // Update column selection state after selecting row
        updateColumnRowStates(newCardSet);
        onSelectionChange(newCardSet);
      }
      return newSet;
    });
  };

  // Handle mouse down for drag selection
  const handleMouseDown = (rank, suit, e) => {
    // Only start drag on card cells, not on buttons
    if (e.target.closest("button")) return;

    // Don't allow selection of board cards
    if (isCardInBoard(rank, suit)) return;

    // Determine if we're starting on a selected or unselected card
    const cardKey = `${rank}-${suit}`;
    const isSelected = selectedCards.has(cardKey);
    const mode = isSelected ? "unselect" : "select";

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
  const handleMouseUp = () => {
    // Clear the drag timer if it exists (mouseUp happened before 100ms)
    if (dragTimerRef.current) {
      clearTimeout(dragTimerRef.current);
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
      const newSet = new Set(selectedCards);
      for (let r = minRankIndex; r <= maxRankIndex; r++) {
        for (let s = minSuitIndex; s <= maxSuitIndex; s++) {
          const rnk = ranks[r];
          const st = suitsDisplay[s];
          // Only process if not in board
          if (!isCardInBoard(rnk, st)) {
            const cardKey = `${rnk}-${st}`;
            if (dragMode === "select") {
              newSet.add(cardKey);
            } else if (dragMode === "unselect") {
              newSet.delete(cardKey);
            }
          }
        }
      }

      // Update column and row selection states
      updateColumnRowStates(newSet);
      onSelectionChange(newSet);
    }

    // Reset drag state
    setIsDragging(false);
    setDragStart(null);
    setDragEnd(null);
    setDragMode(null);

    // Clear mouseDownPos after a small delay to allow onClick to process
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

    return (
      rankIndex >= minRankIndex &&
      rankIndex <= maxRankIndex &&
      suitIndex >= minSuitIndex &&
      suitIndex <= maxSuitIndex
    );
  };

  // Toggle single card selection
  const toggleCardSelection = (rank, suit) => {
    // Don't allow selection of board cards
    if (isCardInBoard(rank, suit)) return;

    const cardKey = `${rank}-${suit}`;
    const newSet = new Set(selectedCards);
    if (newSet.has(cardKey)) {
      newSet.delete(cardKey);
    } else {
      newSet.add(cardKey);
    }

    // Update column and row selection states
    updateColumnRowStates(newSet);
    onSelectionChange(newSet);
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
    const allSelected =
      allSelectableCards.size > 0 &&
      Array.from(allSelectableCards).every(cardKey => selectedCards.has(cardKey));

    if (allSelected) {
      // Deselect all cards
      onSelectionChange(new Set());
      setSelectedColumns(new Set());
      setSelectedRows(new Set());
    } else {
      // Select all selectable cards
      const newSelected = new Set(allSelectableCards);

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
      onSelectionChange(newSelected);
    }
  };

  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          marginBottom: "1rem",
        }}
      >
        <h2>Select Cards to Include</h2>
      </div>
      <div
        className={`card-matrix ${isDealing ? "disabled" : ""}`}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          // If mouse leaves while dragging, complete the drag
          if (isDragging) {
            handleMouseUp();
          } else {
            // Just clear the timer if we weren't dragging yet
            if (dragTimerRef.current) {
              clearTimeout(dragTimerRef.current);
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
              <div
                key={rank}
                className={`matrix-cell header-cell ${isColumnSelected ? "column-selected" : ""} ${
                  allInBoard ? "board-column" : ""
                }`}
              >
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
              <div className={`matrix-cell header-cell ${isRowSelected ? "row-selected" : ""}`}>
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
                const inDrag = isInDragSelection(rank, suit);
                const inBoard = grayedOutCards.has(cardKey);
                const isRed = suit === "♥" || suit === "♦";
                // Determine drag visual state: if unselecting, show different style
                const dragClass = inDrag
                  ? dragMode === "unselect"
                    ? "drag-unselected"
                    : "drag-selected"
                  : "";
                return (
                  <div
                    key={cardKey}
                    className={`matrix-cell card-cell ${isSelected ? "selected" : ""} ${dragClass} ${
                      inBoard ? "board-card" : ""
                    }`}
                    onMouseDown={(e) => !inBoard && !isDealing && handleMouseDown(rank, suit, e)}
                    onMouseMove={() => {
                      if (isDragging && !inBoard && !isDealing) {
                        handleMouseMove(rank, suit);
                      }
                    }}
                    onClick={() => {
                      // Don't allow clicks on board cards or during dealing
                      if (inBoard || isDealing) return;
                      // Only toggle if we weren't dragging (i.e., mouseUp happened before 100ms)
                      // and this is the same card we started the mouseDown on
                      if (
                        !isDragging &&
                        mouseDownPos &&
                        mouseDownPos.rank === rank &&
                        mouseDownPos.suit === suit
                      ) {
                        toggleCardSelection(rank, suit);
                      }
                    }}
                  >
                    <div
                      className={`matrix-card-rank ${isRed ? "red" : ""} ${
                        inBoard ? "grayed-out" : ""
                      }`}
                    >
                      {rank}
                    </div>
                    <div
                      className={`matrix-card-suit ${isRed ? "red" : ""} ${
                        inBoard ? "grayed-out" : ""
                      }`}
                    >
                      {suit}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </>
  );
};

export default SelectionMatrix;

