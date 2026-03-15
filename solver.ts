import { LEVELS } from './src/levels';
import { Piece } from './src/types';

const BOARD_W = 4;
const BOARD_H = 5;

function hashState(pieces: Piece[]): string {
  const grid = Array(BOARD_H).fill(null).map(() => Array(BOARD_W).fill('.'));
  let masterPos = '';
  pieces.forEach(p => {
    const char = p.type === 'master' ? 'M' : p.type === 'h' ? 'H' : p.type === 'v' ? 'V' : 'S';
    if (p.type === 'master') masterPos = `${p.x},${p.y}`;
    for (let r = 0; r < p.h; r++) {
      for (let c = 0; c < p.w; c++) {
        grid[p.y + r][p.x + c] = char;
      }
    }
  });
  return masterPos + '|' + grid.map(row => row.join('')).join('');
}

function getMoves(pieces: Piece[]): Piece[][] {
  const grid = Array(BOARD_H).fill(null).map(() => Array(BOARD_W).fill(false));
  pieces.forEach(p => {
    for (let r = 0; r < p.h; r++) {
      for (let c = 0; c < p.w; c++) {
        grid[p.y + r][p.x + c] = true;
      }
    }
  });

  const moves: Piece[][] = [];
  pieces.forEach((p, i) => {
    // Try up
    if (p.y > 0) {
      let canMove = true;
      for (let c = 0; c < p.w; c++) if (grid[p.y - 1][p.x + c]) canMove = false;
      if (canMove) {
        const newPieces = [...pieces];
        newPieces[i] = { ...p, y: p.y - 1 };
        moves.push(newPieces);
      }
    }
    // Try down
    if (p.y + p.h < BOARD_H) {
      let canMove = true;
      for (let c = 0; c < p.w; c++) if (grid[p.y + p.h][p.x + c]) canMove = false;
      if (canMove) {
        const newPieces = [...pieces];
        newPieces[i] = { ...p, y: p.y + 1 };
        moves.push(newPieces);
      }
    }
    // Try left
    if (p.x > 0) {
      let canMove = true;
      for (let r = 0; r < p.h; r++) if (grid[p.y + r][p.x - 1]) canMove = false;
      if (canMove) {
        const newPieces = [...pieces];
        newPieces[i] = { ...p, x: p.x - 1 };
        moves.push(newPieces);
      }
    }
    // Try right
    if (p.x + p.w < BOARD_W) {
      let canMove = true;
      for (let r = 0; r < p.h; r++) if (grid[p.y + r][p.x + p.w]) canMove = false;
      if (canMove) {
        const newPieces = [...pieces];
        newPieces[i] = { ...p, x: p.x + 1 };
        moves.push(newPieces);
      }
    }
  });
  return moves;
}

function isWon(pieces: Piece[]): boolean {
  const master = pieces.find(p => p.type === 'master');
  return master ? master.x === 1 && master.y === 3 : false;
}

function solve(levelIndex: number): number {
  const initial = LEVELS[levelIndex];
  const queue: { state: Piece[], depth: number }[] = [{ state: initial, depth: 0 }];
  const visited = new Set<string>();
  visited.add(hashState(initial));

  let head = 0;
  while (head < queue.length) {
    const { state, depth } = queue[head++];
    if (isWon(state)) return depth;
    
    if (depth > 150) continue; // limit depth to avoid infinite loops on unsolvable

    const moves = getMoves(state);
    for (const move of moves) {
      const hash = hashState(move);
      if (!visited.has(hash)) {
        visited.add(hash);
        queue.push({ state: move, depth: depth + 1 });
      }
    }
  }
  return -1;
}

for (let i = 0; i < LEVELS.length; i++) {
  const moves = solve(i);
  if (moves === -1) {
    console.log(`Level ${i + 1}: UNSOLVABLE`);
  }
}
console.log('Done checking all levels');
