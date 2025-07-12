/**
 * Initializes the game by shuffling words and creating cards.
 */
function initializeGame() {
    // Clear any existing cards
    cardGrid.innerHTML = '';

    // Shuffle the word-icon pairs
    shuffleArray(wordIconPairs);

    // Create and append a card for each pair
    wordIconPairs.forEach(pair => {
        const cardElement = createCard(pair);
        cardGrid.appendChild(cardElement);
    });
}