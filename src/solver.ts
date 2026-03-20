import { Piece } from './types.js';

const BOARD_W = 4;
const BOARD_H = 5;

export function getCanonicalState(pieces: Piece[]): string {
  const grid = Array(BOARD_H * BOARD_W).fill('E');
  for (const p of pieces) {
    const char = p.type === 'master' ? 'M' :
                 p.type === 'v' ? 'V' :
                 p.type === 'h' ? 'H' : 'S';
    for (let r = 0; r < p.h; r++) {
      for (let c = 0; c < p.w; c++) {
        grid[(p.y + r) * BOARD_W + (p.x + c)] = char;
      }
    }
  }
  return grid.join('');
}

export function isSolvable(initialPieces: Piece[]): boolean {
  const visited = new Set<string>();
  const queue: Piece[][] = [initialPieces];
  
  const startState = getCanonicalState(initialPieces);
  visited.add(startState);
  
  let head = 0;
  while (head < queue.length) {
    const pieces = queue[head++];
    
    const master = pieces.find(p => p.type === 'master');
    if (master && master.x === 1 && master.y === 3) {
      return true;
    }
    
    const grid = Array(BOARD_H).fill(null).map(() => Array(BOARD_W).fill(false));
    for (const p of pieces) {
      for (let r = 0; r < p.h; r++) {
        for (let c = 0; c < p.w; c++) {
          grid[p.y + r][p.x + c] = true;
        }
      }
    }
    
    for (let i = 0; i < pieces.length; i++) {
      const p = pieces[i];
      
      // Up
      if (p.y > 0) {
        let canMove = true;
        for (let c = 0; c < p.w; c++) {
          if (grid[p.y - 1][p.x + c]) canMove = false;
        }
        if (canMove) {
          const newPieces = [...pieces];
          newPieces[i] = { ...p, y: p.y - 1 };
          const state = getCanonicalState(newPieces);
          if (!visited.has(state)) {
            visited.add(state);
            queue.push(newPieces);
          }
        }
      }
      
      // Down
      if (p.y + p.h < BOARD_H) {
        let canMove = true;
        for (let c = 0; c < p.w; c++) {
          if (grid[p.y + p.h][p.x + c]) canMove = false;
        }
        if (canMove) {
          const newPieces = [...pieces];
          newPieces[i] = { ...p, y: p.y + 1 };
          const state = getCanonicalState(newPieces);
          if (!visited.has(state)) {
            visited.add(state);
            queue.push(newPieces);
          }
        }
      }
      
      // Left
      if (p.x > 0) {
        let canMove = true;
        for (let r = 0; r < p.h; r++) {
          if (grid[p.y + r][p.x - 1]) canMove = false;
        }
        if (canMove) {
          const newPieces = [...pieces];
          newPieces[i] = { ...p, x: p.x - 1 };
          const state = getCanonicalState(newPieces);
          if (!visited.has(state)) {
            visited.add(state);
            queue.push(newPieces);
          }
        }
      }
      
      // Right
      if (p.x + p.w < BOARD_W) {
        let canMove = true;
        for (let r = 0; r < p.h; r++) {
          if (grid[p.y + r][p.x + p.w]) canMove = false;
        }
        if (canMove) {
          const newPieces = [...pieces];
          newPieces[i] = { ...p, x: p.x + 1 };
          const state = getCanonicalState(newPieces);
          if (!visited.has(state)) {
            visited.add(state);
            queue.push(newPieces);
          }
        }
      }
    }
  }
  
  return false;
}
