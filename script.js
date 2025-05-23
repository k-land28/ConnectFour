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

// �Ֆʂ̃Z�����E�������v�Z�i���X�|���V�u�Ή��j
function updateCellSize() {
  const rect = boardElement.getBoundingClientRect();
  cellWidth = rect.width / COLS;
  cellHeight = rect.height / ROWS;
}

// �Ֆʂ𐶐����ăN���b�N�C�x���g�ݒ�
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

// ������R�����A�j���[�V�����ŗ��Ƃ��֐�
function dropPiece(row, col, color) {
  return new Promise(resolve => {
    const piece = document.createElement('div');
    piece.className = `piece ${color}`;
    boardElement.appendChild(piece);

    // ���ʒu
    const left = col * cellWidth + 2; // gap 4px�̔����}�[�W������
    piece.style.left = `${left}px`;

    // �����ʒu�͔Ֆʂ̏�i��ʊO�j
    let y = -cellHeight;
    piece.style.top = `${y}px`;

    // �����I�����V�~�����[�V�����p�����[�^
    let velocity = 0;
    const gravity = 2000; // px/�b^2�i�����j
    const targetY = row * cellHeight + 2;

    let lastTime = null;

    function animate(time) {
      if (!lastTime) lastTime = time;
      const dt = (time - lastTime) / 1000;
      lastTime = time;

      velocity += gravity * dt;
      y += velocity * dt;

      if (y >= targetY) {
        // �o�E���h�J�n
        y = targetY;
        piece.style.top = `${y}px`;
        bounce();
        resolve();
        return;
      }
      piece.style.top = `${y}px`;
      requestAnimationFrame(animate);
    }

    // �o�E���h�A�j���[�V�����i�㉺�ɏ����������j
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
    [[0,1],[0,-1]],   // ��
    [[1,0],[-1,0]],   // �c
    [[1,1],[-1,-1]],  // �΂߉E��-����
    [[1,-1],[-1,1]]   // �΂ߍ���-�E��
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
    // �ʒu����
    piece.style.left = `${c * cellWidth + 2}px`;
    piece.style.top = `${r * cellHeight + 2}px`;
    boardElement.appendChild(piece);
  }
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ������
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
