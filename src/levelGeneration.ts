import { Piece, PieceType, BOARD_W, BOARD_H } from './App';

export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';

export interface GenerateLevelOptions {
  difficulty: Difficulty;
  minSteps?: number;
  allowImmediateRevert?: boolean;
}

export function computeSolverMetrics(startPieces: Piece[]) {
  const EXIT_ROW = BOARD_H - 2;
  const SOLVED_KEY = `master:1,${EXIT_ROW},2,2`; // canonical solved target
  const canonical = (pieces: Piece[]) =>
    [...pieces]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map(p => `${p.id}:${p.x},${p.y},${p.w},${p.h}`)
      .join('|');

  const visited = new Set<string>();
  const queue: Array<{ pieces: Piece[]; path: Array<{ id: string; dx: number; dy: number }> }> = [
    { pieces: startPieces, path: [] },
  ];
  visited.add(canonical(startPieces));

  let shortestPathLength = Infinity;
  while (queue.length) {
    const { pieces, path } = queue.shift()!;
    const key = canonical(pieces);
    if (key === SOLVED_KEY) {
      shortestPathLength = path.length;
      return { solvable: true, shortestPathLength };
    }
    // Generate legal moves for each piece
    pieces.forEach(piece => {
      for (const [dx, dy] of [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
      ]) {
        const nx = piece.x + dx;
        const ny = piece.y + dy;
        if (
          nx < 0 ||
          ny < 0 ||
          nx + piece.w > BOARD_W ||
          ny + piece.h > BOARD_H
        ) {
          continue;
        }
        let blocked = false;
        for (const other of pieces) {
          if (other.id === piece.id) continue;
          if (
            nx < other.x + other.w &&
            nx + piece.w > other.x &&
            ny < other.y + other.h &&
            ny + piece.h > other.y
          ) {
            blocked = true;
            break;
          }
        }
        if (blocked) continue;
        const nextPieces = pieces.map(p =>
          p.id === piece.id ? { ...p, x: nx, y: ny } : p
        );
        const nextKey = canonical(nextPieces);
        if (!visited.has(nextKey)) {
          visited.add(nextKey);
          queue.push({ pieces: nextPieces, path: [...path, { id: piece.id, dx, dy }] });
        }
      }
    });
  }

  return { solvable: false, shortestPathLength: Infinity };
}

export function difficultyMinimumSteps(difficulty: Difficulty): number {
  switch (difficulty) {
    case 'easy':
      return 18;
    case 'medium':
      return 35;
    case 'hard':
      return 55;
    case 'expert':
      return 75;
    default:
      return 35;
  }
}

export function produceSolvableLevel({
  difficulty,
  minSteps = difficultyMinimumSteps(difficulty),
  allowImmediateRevert = false,
}: GenerateLevelOptions): Piece[] {
  const SOLVED = [
    { id: 'v1', x: 0, y: 0, w: 1, h: 2, type: 'v' as PieceType },
    { id: 'master', x: 1, y: 0, w: 2, h: 2, type: 'master' as PieceType },
    { id: 'v2', x: 3, y: 0, w: 1, h: 2, type: 'v' as PieceType },
    { id: 'v3', x: 0, y: 2, w: 1, h: 2, type: 'v' as PieceType },
    { id: 'h1', x: 1, y: 2, w: 2, h: 1, type: 'h' as PieceType },
    { id: 'v4', x: 3, y: 2, w: 1, h: 2, type: 'v' as PieceType },
    { id: 's1', x: 1, y: 3, w: 1, h: 1, type: 's' as PieceType },
    { id: 's2', x: 2, y: 3, w: 1, h: 1, type: 's' as PieceType },
    { id: 's3', x: 0, y: 4, w: 1, h: 1, type: 's' as PieceType },
    { id: 's4', x: 3, y: 4, w: 1, h: 1, type: 's' as PieceType },
  ];

  const canonical = (pieces: Piece[]) =>
    [...pieces]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map(p => `${p.id}:${p.x},${p.y},${p.w},${p.h}`)
      .join('|');

  let attempts = 0;
  const maxAttempts = 50;
  let bestPieces = SOLVED;
  let bestSteps = 0;

  while (attempts < maxAttempts) {
    let currentPieces = JSON.parse(JSON.stringify(SOLVED)) as Piece[];
    const visited = new Set<string>([canonical(currentPieces)]);
    const maxScrambleSteps = Math.max(minSteps + 80, 150); // keep scramble generous but bounded

    let lastMove: { id: string; dx: number; dy: number } | null = null;

    for (let step = 0; step < maxScrambleSteps; step++) {
      // Pick a random piece and a random legal move direction
      const candidates: Array<{ piece: Piece; dx: number; dy: number }> = [];
      currentPieces.forEach(piece => {
        for (const [dx, dy] of [
          [-1, 0],
          [1, 0],
          [0, -1],
          [0, 1],
        ]) {
          const nx = piece.x + dx;
          const ny = piece.y + dy;
          if (
            nx < 0 ||
            ny < 0 ||
            nx + piece.w > BOARD_W ||
            ny + piece.h > BOARD_H
          ) continue;
          let blocked = false;
          for (const other of currentPieces) {
            if (other.id === piece.id) continue;
            if (
              nx < other.x + other.w &&
              nx + piece.w > other.x &&
              ny < other.y + other.h &&
              ny + piece.h > other.y
            ) {
              blocked = true;
              break;
            }
          }
          if (blocked) continue;
          if (!allowImmediateRevert) {
            // avoid immediate undo: if last move reversed by this one, skip
            if (lastMove && lastMove.id === piece.id && lastMove.dx === -dx && lastMove.dy === -dy) {
              continue;
            }
          }
          candidates.push({ piece, dx, dy });
        }
      });

      if (!candidates.length) break; // no valid moves available

      const choice = candidates[Math.floor(Math.random() * candidates.length)];
      const nextPieces = currentPieces.map(p =>
        p.id === choice.piece.id ? { ...p, x: p.x + choice.dx, y: p.y + choice.dy } : p
      );
      const nextKey = canonical(nextPieces);
      if (visited.has(nextKey)) continue; // avoid repeats
      visited.add(nextKey);
      currentPieces = nextPieces;
      lastMove = { id: choice.piece.id, dx: choice.dx, dy: choice.dy };
    }

    // Verify solvability and shortest path length; regenerate if not acceptable
    const { solvable, shortestPathLength } = computeSolverMetrics(currentPieces);

    if (solvable && shortestPathLength >= minSteps) {
      return currentPieces;
    }

    if (solvable && shortestPathLength > bestSteps) {
      bestSteps = shortestPathLength;
      bestPieces = currentPieces;
    }

    attempts++;
  }

  // If we couldn't find one that meets the exact criteria after maxAttempts,
  // return the best one we found.
  return bestPieces;
}
