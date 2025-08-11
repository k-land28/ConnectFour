const ROWS = 6;
const COLS = 7;

const boardEl = document.getElementById('board');
const boardWrap = document.getElementById('board-container');
const resultEl = document.getElementById('result');
const turnEl = document.getElementById('turn-indicator');
const resetBtn = document.getElementById('resetBtn');

// Game state
let board = Array.from({length: ROWS}, () => Array(COLS).fill(null));
let current = 'red'; // 'red' or 'yellow'
let gameOver = false;
let isAnimating = false; // 入力ロック（落下アニメ中は入力不可）

// Build grid
function buildBoard() {
  boardEl.innerHTML = '';
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.row = r;
      cell.dataset.col = c;
      boardEl.appendChild(cell);
    }
  }
}
buildBoard();
updateTurnText();

// Metrics
function getMetrics() {
  const rect = boardEl.getBoundingClientRect();
  const cellW = rect.width / COLS;
  const cellH = rect.height / ROWS;
  return {rect, cellW, cellH};
}
window.addEventListener('resize', () => {});

// Input
boardWrap.addEventListener('click', (e) => {
  if (gameOver || isAnimating) return;
  const {rect, cellW} = getMetrics();
  const x = e.clientX - rect.left;
  if (x < 0 || x > rect.width) return;
  const col = Math.min(COLS - 1, Math.max(0, Math.floor(x / cellW)));
  dropInColumn(col);
}, {passive: true});

// Reset button
resetBtn.addEventListener('click', resetGame);

function resetGame() {
  board = Array.from({length: ROWS}, () => Array(COLS).fill(null));
  Array.from(boardEl.children).forEach(c => c.innerHTML = '');
  current = 'red';
  gameOver = false;
  isAnimating = false;
  resultEl.textContent = '';
  updateTurnText();
}

// Drop
function dropInColumn(col) {
  let row = -1;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r][col] === null) { row = r; break; }
  }
  if (row === -1) return; // full

  animateDrop(row, col, current).then(() => {
    board[row][col] = current;
    renderDisc(row, col, current);

    const winCells = getWinLine(row, col, current);
    if (winCells) {
      gameOver = true;
      resultEl.textContent = `${capitalize(current)} wins!`;
      highlightWin(winCells);
      return;
    }
    if (isBoardFull()) {
      gameOver = true;
      resultEl.textContent = `Draw`;
      return;
    }

    current = (current === 'red') ? 'yellow' : 'red';
    updateTurnText();
  });
}

// Physics drop with soft bounce
function animateDrop(row, col, color) {
  isAnimating = true;

  const {rect, cellW, cellH} = getMetrics();
  const tokenSize = Math.min(cellW, cellH) * 0.8;
  const colCenterX = rect.left + col * cellW + cellW / 2;
  const targetYpx = rect.top + row * cellH + cellH / 2;

  const token = document.createElement('div');
  token.className = 'token-float';
  Object.assign(token.style, {
    position: 'fixed',
    width: `${tokenSize}px`,
    height: `${tokenSize}px`,
    left: `${colCenterX - tokenSize/2}px`,
    top: `${rect.top - tokenSize - 8}px`,
    borderRadius: '50%',
    pointerEvents: 'none',
    zIndex: '999',
    transform: 'scale(0.98)',
    boxShadow: '0 8px 18px rgba(0,0,0,.45)'
  });
  token.style.background = (color === 'red')
    ? 'radial-gradient(circle at 35% 35%, #ffcccc, #ff3030 60%, #b00000)'
    : 'radial-gradient(circle at 35% 35%, #fff7cc, #ffd632 60%, #b08800)';
  document.body.appendChild(token);

  let y = rect.top - tokenSize - 8;
  let vy = 0;
  const g = 4200;
  const bounce = 0.36;
  const snapV = 160;
  const maxBounces = 2;
  let bounces = 0;

  let last = performance.now();
  return new Promise((resolve) => {
    function frame(now) {
      const dt = Math.min(0.03, (now - last) / 1000);
      last = now;

      vy += g * dt;
      y += vy * dt;

      const targetTop = targetYpx - tokenSize/2;
      if (y >= targetTop) {
        y = targetTop;
        if (Math.abs(vy) > snapV && bounces < maxBounces) {
          vy = -vy * bounce;
          bounces += 1;
        } else {
          token.style.top = `${y}px`;
          token.animate([{transform: 'scale(0.98)'},{transform: 'scale(1)'}], {duration: 90, easing: 'ease-out'});
          setTimeout(() => {
            token.remove();
            isAnimating = false;
            resolve();
          }, 90);
          return;
        }
      }

      token.style.top = `${y}px`;
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  });
}

// Render disc into a cell
function renderDisc(row, col, color) {
  const idx = row * COLS + col;
  const cell = boardEl.children[idx];
  const disc = document.createElement('div');
  disc.className = 'disc';
  disc.style.background = (color === 'red')
    ? 'radial-gradient(circle at 35% 35%, #ffcccc, #ff3030 60%, #b00000)'
    : 'radial-gradient(circle at 35% 35%, #fff7cc, #ffd632 60%, #b08800)';
  cell.appendChild(disc);
  disc.animate([{transform:'scale(0.7)'},{transform:'scale(1)'}], {duration:120, easing:'ease-out'});
}

// Win helpers
function isBoardFull() {
  return board.every(row => row.every(cell => cell !== null));
}

// 4方向のいずれかで連続ラインを返す（なければ null）
function getWinLine(r, c, color) {
  const dirs = [[0,1],[1,0],[1,1],[1,-1]];
  for (const [dr,dc] of dirs) {
    const line = [[r,c]];
    // forward
    let rr=r+dr, cc=c+dc;
    while (inRange(rr,cc) && board[rr][cc] === color) { line.push([rr,cc]); rr+=dr; cc+=dc; }
    // backward
    rr=r-dr; cc=c-dc;
    while (inRange(rr,cc) && board[rr][cc] === color) { line.unshift([rr,cc]); rr-=dr; cc-=dc; }
    if (line.length >= 4) return line; // 5連以上も含む
  }
  return null;
}
function inRange(r,c){ return r>=0 && r<ROWS && c>=0 && c<COLS; }

function highlightWin(cells) {
  // 連続ラインのすべてを発光（>=4）
  for (const [r,c] of cells) {
    const idx = r * COLS + c;
    const cell = boardEl.children[idx];
    const disc = cell.querySelector('.disc');
    if (disc) disc.classList.add('win');
  }
}

function updateTurnText() {
  turnEl.textContent = `${capitalize(current)}'s Turn`;
}
function capitalize(s){ return s.charAt(0).toUpperCase() + s.slice(1); }
