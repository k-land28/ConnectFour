const ROWS = 6;
const COLS = 7;

let board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
let currentPlayer = 'red';
let winCells = [];

const boardContainer = document.getElementById('board-container');
const boardElement = document.getElementById('board');
const resultElement = document.getElementById('result');
const turnIndicator = document.getElementById('turn-indicator');

let cellWidth, cellHeight;

// 盤面のセル幅・高さを計算（レスポンシブ対応）
function updateCellSize() {
  const rect = boardElement.getBoundingClientRect();
  cellWidth = rect.width / COLS;
  cellHeight = rect.height / ROWS;
}

// 盤面を生成してクリックイベント設定
function createBoard() {
  boardElement.innerHTML = '';
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.row = r;
      cell.dataset.col = c;
      cell.addEventListener('click', () => handleMove(c));
      boardElement.appendChild(cell);
    }
  }
}

// 駒を自由落下アニメーションで落とす関数
function dropPiece(row, col, color) {
  return new Promise(resolve => {
    const piece = document.createElement('div');
    piece.className = `piece ${color}`;
    boardElement.appendChild(piece);

    // 横位置
    const left = col * cellWidth + 2; // gap 4pxの半分マージン調整
    piece.style.left = `${left}px`;

    // 初期位置は盤面の上（画面外）
    let y = -cellHeight;
    piece.style.top = `${y}px`;

    // 物理的落下シミュレーションパラメータ
    let velocity = 0;
    const gravity = 2000; // px/秒^2（調整可）
    const targetY = row * cellHeight + 2;

    let lastTime = null;

    function animate(time) {
      if (!lastTime) lastTime = time;
      const dt = (time - lastTime) / 1000;
      lastTime = time;

      velocity += gravity * dt;
      y += velocity * dt;

      if (y >= targetY) {
        // バウンド開始
        y = targetY;
        piece.style.top = `${y}px`;
        bounce();
        resolve();
        return;
      }
      piece.style.top = `${y}px`;
      requestAnimationFrame(animate);
    }

    // バウンドアニメーション（上下に小さく動く）
    function bounce() {
      const bounceHeight = cellHeight * 0.2;
      let up = true;
      let start = null;
      const duration = 200;

      function bounceAnim(time) {
        if (!start) start = time;
        const elapsed = time - start;
        const progress = Math.min(elapsed / duration, 1);
        const offset = up
          ? bounceHeight * (1 - progress)
          : bounceHeight * progress;

        piece.style.top = `${targetY - offset}px`;

        if (progress >= 1) {
          if (up) {
            up = false;
            start = time;
            requestAnimationFrame(bounceAnim);
          } else {
            piece.style.top = `${targetY}px`;
            return;
          }
        } else {
          requestAnimationFrame(bounceAnim);
        }
      }
      requestAnimationFrame(bounceAnim);
    }

    requestAnimationFrame(animate);
  });
}

async function handleMove(col) {
  if (winCells.length > 0) return;

  for (let r = ROWS - 1; r >= 0; r--) {
    if (!board[r][col]) {
      board[r][col] = currentPlayer;
      await dropPiece(r, col, currentPlayer);
      if (checkWin(r, col)) {
        highlightWin();
        resultElement.textContent = `${capitalize(currentPlayer)} Wins!`;
        return;
      }
      currentPlayer = currentPlayer === 'red' ? 'yellow' : 'red';
      turnIndicator.textContent = `${capitalize(currentPlayer)}'s Turn`;
      return;
    }
  }
}

function checkWin(r, c) {
  const directions = [
    [[0,1],[0,-1]],   // 横
    [[1,0],[-1,0]],   // 縦
    [[1,1],[-1,-1]],  // 斜め右下-左上
    [[1,-1],[-1,1]]   // 斜め左下-右上
  ];
  const player = board[r][c];
  for (const dir of directions) {
    let count = 1;
    const line = [[r,c]];
    for (const [dr, dc] of dir) {
      let nr = r + dr;
      let nc = c + dc;
      while (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && board[nr][nc] === player) {
        line.push([nr, nc]);
        count++;
        nr += dr;
        nc += dc;
      }
    }
    if (count >= 4) {
      winCells = line;
      return true;
    }
  }
  return false;
}

function highlightWin() {
  for (const [r,c] of winCells) {
    const piece = document.createElement('div');
    piece.className = `piece ${board[r][c]} glow`;
    // 位置調整
    piece.style.left = `${c * cellWidth + 2}px`;
    piece.style.top = `${r * cellHeight + 2}px`;
    boardElement.appendChild(piece);
  }
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// 初期化
function init() {
  createBoard();
  updateCellSize();
  window.addEventListener('resize', () => {
    updateCellSize();
  });
  resultElement.textContent = '';
  turnIndicator.textContent = `${capitalize(currentPlayer)}'s Turn`;
}

init();
