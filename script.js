// Game configuration and state variables
const GOAL_CANS = 10;       // Total items needed to win
const GAME_DURATION = 30;   // Round duration in seconds
const SPAWN_INTERVAL_MS = 1400;
const POST_CLICK_DELAY_MS = 700;
const BAD_ITEM_CHANCE = 0.3;
const PENALTY_POINTS = 1;
const WIN_MESSAGES = [
  'Amazing! You helped bring clean water to more families!',
  'Great job! Your fast taps made a real impact!',
  'You did it! Every can counts toward clean water.',
  'Victory! You crushed the Water Quest challenge.'
];
const LOSE_MESSAGES = [
  'Good try. Keep going, every drop matters.',
  'So close. Try again and collect even more cans!',
  'Time is up, but your effort still made a splash.',
  'Nice attempt. Jump back in and beat your score!'
];
let currentCans = 0;        // Current number of items collected
let timeLeft = GAME_DURATION;
let gameActive = false;     // Tracks if game is currently running
let clickLocked = false;
let spawnInterval;          // Holds the interval for spawning cans
let timerInterval;          // Holds the interval for the timer

const grid = document.querySelector('.game-grid');
const currentCansDisplay = document.getElementById('current-cans');
const timerDisplay = document.getElementById('timer');
const statsDisplay = document.querySelector('.stats');
const achievementsDisplay = document.getElementById('achievements');
const startButton = document.getElementById('start-game');
const resetButton = document.getElementById('reset-game');

// Creates the 3x3 game grid where items will appear
function createGrid() {
  grid.innerHTML = ''; // Clear any existing grid cells
  for (let i = 0; i < 9; i++) {
    const cell = document.createElement('div');
    cell.className = 'grid-cell'; // Each cell represents a grid square
    grid.appendChild(cell);
  }
}

// Ensure the grid is created when the page loads
createGrid();

// Spawns a new item in a random grid cell
function spawnWaterCan() {
  if (!gameActive || clickLocked) return; // Stop if game is inactive or input is temporarily locked
  const cells = document.querySelectorAll('.grid-cell');
  
  // Clear all cells before spawning a new water can
  cells.forEach(cell => {
    cell.innerHTML = '';
    cell.classList.remove('collected');
    cell.classList.remove('penalty');
    cell.classList.remove('active-target');
    delete cell.dataset.itemType;
  });

  // Select a random cell from the grid to place the water can
  const randomCell = cells[Math.floor(Math.random() * cells.length)];
  randomCell.classList.add('active-target');

  const spawnPollution = Math.random() < BAD_ITEM_CHANCE;

  if (spawnPollution) {
    randomCell.dataset.itemType = 'pollution';
    randomCell.innerHTML = `
      <div class="pollution-wrapper">
        <div class="pollution"></div>
      </div>
    `;

    randomCell.addEventListener('click', handleCellClick, { once: true });
    return;
  }

  // Use a template literal to create the wrapper and water-can element
  randomCell.innerHTML = `
    <div class="water-can-wrapper">
      <div class="water-can"></div>
    </div>
  `;
  randomCell.dataset.itemType = 'water';
  randomCell.addEventListener('click', handleCellClick, { once: true });
}

function queueNextSpawn() {
  clickLocked = true;
  setTimeout(() => {
    clickLocked = false;
    spawnWaterCan();
  }, POST_CLICK_DELAY_MS);
}

function handleCellClick(event) {
  if (!gameActive || clickLocked) return;

  const clickedCell = event.currentTarget;
  const itemType = clickedCell.dataset.itemType;
  if (!itemType) return;

  if (itemType === 'pollution') {
    collectPollution(clickedCell);
    return;
  }

  collectWaterCan(clickedCell);
}

function updateScoreDisplay(isPenalty = false) {
  currentCansDisplay.textContent = currentCans;
  currentCansDisplay.classList.remove('score-pop', 'score-drop');
  void currentCansDisplay.offsetWidth;
  currentCansDisplay.classList.add(isPenalty ? 'score-drop' : 'score-pop');

  statsDisplay.classList.remove('stats-flash', 'stats-penalty');
  void statsDisplay.offsetWidth;
  statsDisplay.classList.add(isPenalty ? 'stats-penalty' : 'stats-flash');
}

function updateTimerDisplay() {
  timerDisplay.textContent = timeLeft;
  timerDisplay.classList.toggle('timer-warning', timeLeft <= 10);
}

function showAchievement(message, type = 'info') {
  achievementsDisplay.textContent = message;
  achievementsDisplay.className = `achievement ${type}`;
}

function getRandomMessage(messages) {
  const randomIndex = Math.floor(Math.random() * messages.length);
  return messages[randomIndex];
}

function launchConfetti() {
  const confettiCount = 120;
  const colors = ['#FFC907', '#2E9DF7', '#8BD1CB', '#4FCB53', '#FF902A', '#F16061'];

  for (let i = 0; i < confettiCount; i++) {
    const piece = document.createElement('span');
    piece.style.position = 'fixed';
    piece.style.left = `${Math.random() * 100}vw`;
    piece.style.top = '-12px';
    piece.style.width = `${6 + Math.random() * 8}px`;
    piece.style.height = `${8 + Math.random() * 10}px`;
    piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    piece.style.opacity = '0.95';
    piece.style.borderRadius = '2px';
    piece.style.transform = `rotate(${Math.random() * 360}deg)`;
    piece.style.pointerEvents = 'none';
    piece.style.zIndex = '9999';

    document.body.appendChild(piece);

    const drift = -100 + Math.random() * 200;
    const fallDuration = 1200 + Math.random() * 900;
    piece.animate(
      [
        { transform: `translate(0, 0) rotate(0deg)`, opacity: 1 },
        { transform: `translate(${drift}px, 110vh) rotate(${360 + Math.random() * 540}deg)`, opacity: 0.2 }
      ],
      {
        duration: fallDuration,
        easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
        fill: 'forwards'
      }
    );

    setTimeout(() => {
      piece.remove();
    }, fallDuration + 100);
  }
}

function collectWaterCan(clickedCell) {
  if (!gameActive) return;

  currentCans += 1;
  updateScoreDisplay(false);

  clickedCell.classList.add('collected');
  clickedCell.innerHTML = '<span class="plus-one">+1</span>';

  if (currentCans >= GOAL_CANS) {
    endGame(true);
    return;
  }

  showAchievement('Nice! Keep collecting water cans.', 'info');
  queueNextSpawn();
}

function collectPollution(clickedCell) {
  if (!gameActive) return;

  currentCans = Math.max(0, currentCans - PENALTY_POINTS);
  updateScoreDisplay(true);

  clickedCell.classList.add('penalty');
  clickedCell.innerHTML = '<span class="minus-one">-1</span>';
  showAchievement('Pollution hit! You lost 1 point.', 'danger');

  queueNextSpawn();
}

function tickTimer() {
  if (!gameActive) return;

  timeLeft -= 1;
  updateTimerDisplay();

  if (timeLeft <= 0) {
    endGame(currentCans >= GOAL_CANS);
  }
}

// Initializes and starts a new game
function startGame() {
  if (gameActive) return; // Prevent starting a new game if one is already active

  currentCans = 0;
  timeLeft = GAME_DURATION;
  gameActive = true;
  clickLocked = false;
  startButton.textContent = 'Game Running...';
  startButton.disabled = true;

  updateScoreDisplay();
  updateTimerDisplay();
  showAchievement(`Collect ${GOAL_CANS} cans before time runs out!`, 'info');

  createGrid(); // Set up the game grid
  spawnWaterCan();
  spawnInterval = setInterval(spawnWaterCan, SPAWN_INTERVAL_MS);
  timerInterval = setInterval(tickTimer, 1000);
}

function endGame(won) {
  if (!gameActive) return;

  gameActive = false; // Mark the game as inactive
  clearInterval(spawnInterval); // Stop spawning water cans
  clearInterval(timerInterval); // Stop timer countdown

  startButton.disabled = false;
  startButton.textContent = 'Play Again';

  if (won) {
    launchConfetti();
    showAchievement(`${getRandomMessage(WIN_MESSAGES)} Score: ${currentCans}`, 'success');
  } else {
    showAchievement(`${getRandomMessage(LOSE_MESSAGES)} Score: ${currentCans}`, 'danger');
  }
}

function resetGame() {
  gameActive = false;
  clickLocked = false;
  clearInterval(spawnInterval);
  clearInterval(timerInterval);

  currentCans = 0;
  timeLeft = GAME_DURATION;

  startButton.disabled = false;
  startButton.textContent = 'Start Game';

  createGrid();
  updateScoreDisplay();
  updateTimerDisplay();
  showAchievement('Game reset. Press Start Game to play!', 'info');
}

// Set up click handler for the start button
startButton.addEventListener('click', startGame);
resetButton.addEventListener('click', resetGame);
