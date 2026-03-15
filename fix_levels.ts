import { LEVELS } from './src/levels';
import { Piece, PieceType } from './src/types';
import * as fs from 'fs';

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
    if (p.y > 0) {
      let canMove = true;
      for (let c = 0; c < p.w; c++) if (grid[p.y - 1][p.x + c]) canMove = false;
      if (canMove) {
        const newPieces = [...pieces];
        newPieces[i] = { ...p, y: p.y - 1 };
        moves.push(newPieces);
      }
    }
    if (p.y + p.h < BOARD_H) {
      let canMove = true;
      for (let c = 0; c < p.w; c++) if (grid[p.y + p.h][p.x + c]) canMove = false;
      if (canMove) {
        const newPieces = [...pieces];
        newPieces[i] = { ...p, y: p.y + 1 };
        moves.push(newPieces);
      }
    }
    if (p.x > 0) {
      let canMove = true;
      for (let r = 0; r < p.h; r++) if (grid[p.y + r][p.x - 1]) canMove = false;
      if (canMove) {
        const newPieces = [...pieces];
        newPieces[i] = { ...p, x: p.x - 1 };
        moves.push(newPieces);
      }
    }
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

function solve(pieces: Piece[]): number {
  const queue: { state: Piece[], depth: number }[] = [{ state: pieces, depth: 0 }];
  const visited = new Set<string>();
  visited.add(hashState(pieces));

  let head = 0;
  while (head < queue.length) {
    const { state, depth } = queue[head++];
    if (isWon(state)) return depth;
    if (depth > 150) continue;

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

let levelsContent = fs.readFileSync('./src/levels.ts', 'utf-8');
const lines = levelsContent.split('\n');
let modified = false;

for (let i = 0; i < LEVELS.length; i++) {
  const moves = solve(LEVELS[i]);
  if (moves === -1) {
    console.log(`Level ${i + 1} is unsolvable. Trying to fix...`);
    // Try removing the last piece (usually a 1x1 block)
    let fixed = false;
    for (let j = LEVELS[i].length - 1; j >= 0; j--) {
      if (LEVELS[i][j].type === 's') {
        const testPieces = [...LEVELS[i]];
        testPieces.splice(j, 1);
        const testMoves = solve(testPieces);
        if (testMoves !== -1) {
          console.log(`  Fixed by removing piece ${j}. New moves: ${testMoves}`);
          // Find the line in levels.ts
          // This is a naive replacement, but works for our simple array structure
          const lineIndex = lines.findIndex(l => l.includes(`[${LEVELS[i][0].x}, ${LEVELS[i][0].y}, ${LEVELS[i][0].w}, ${LEVELS[i][0].h}, '${LEVELS[i][0].type}']`));
          if (lineIndex !== -1) {
            // Rebuild the line
            const newCompact = testPieces.map(p => `[${p.x}, ${p.y}, ${p.w}, ${p.h}, '${p.type}']`).join(', ');
            lines[lineIndex] = `  [${newCompact}],`;
            modified = true;
            fixed = true;
          }
          break;
        }
      }
    }
    if (!fixed) {
      console.log(`  Could not fix Level ${i + 1} by removing one block.`);
    }
  }
}

if (modified) {
  fs.writeFileSync('./src/levels.ts', lines.join('\n'));
  console.log('levels.ts updated with fixed levels.');
}
