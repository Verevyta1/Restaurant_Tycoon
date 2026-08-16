const startButton = document.querySelector('#start-game');
const gameMessage = document.querySelector('#game-message');

startButton.addEventListener('click', () => {
  gameMessage.textContent = 'Your restaurant is ready for its first idea.';
});
