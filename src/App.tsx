import React, { useState, useEffect, useMemo, useRef, useCallback, memo } from 'react';
import { RotateCcw, Undo2, Check, Moon, Sun } from 'lucide-react';
import { motion, AnimatePresence, motionValue } from 'framer-motion';
import { Piece, PieceType, BOARD_W, BOARD_H, GAP, BOARD_PADDING } from './types';
import { produceSolvableLevel, Difficulty, computeSolverMetrics } from './levelGeneration';

const EXIT_ROW = BOARD_H - 2;

function useBoardEngine(initialPieces: Piece[]) {
  const [pieces, setPieces] = useState<Piece[]>(initialPieces);
  const piecesRef = useRef(initialPieces);
  const [history, setHistory] = useState<Piece[][]>([]);
  const [moves, setMoves] = useState(0);
  const [isWon, setIsWon] = useState(false);

  const canonicalKey = useMemo(() => {
    const sorted = [...pieces].sort((a, b) => a.id.localeCompare(b.id));
    return sorted.map(p => `${p.id}:${p.x},${p.y},${p.w},${p.h}`).join('|');
  }, [pieces]);

  const isLegalMove = useCallback(
    (pieceId: string, dx: number, dy: number) => {
      const currentPieces = piecesRef.current;
      const piece = currentPieces.find(p => p.id === pieceId);
      if (!piece) return false;
      const nx = piece.x + dx;
      const ny = piece.y + dy;
      if (
        nx < 0 ||
        ny < 0 ||
        nx + piece.w > BOARD_W ||
        ny + piece.h > BOARD_H
      ) {
        return false;
      }
      for (const other of currentPieces) {
        if (other.id === pieceId) continue;
        if (
          nx < other.x + other.w &&
          nx + piece.w > other.x &&
          ny < other.y + other.h &&
          ny + piece.h > other.y
        ) {
          return false;
        }
      }
      return true;
    },
    []
  );

  const applyMove = useCallback(
    (pieceId: string, dx: number, dy: number) => {
      const currentPieces = piecesRef.current;
      setHistory(prev => [...prev, currentPieces]);
      
      const newPieces = currentPieces.map(p =>
        p.id === pieceId ? { ...p, x: p.x + dx, y: p.y + dy } : p
      );
      piecesRef.current = newPieces;
      setPieces(newPieces);
      setMoves(m => m + 1);
    },
    []
  );

  const undo = useCallback(() => {
    if (!history.length || isWon) return;
    const prev = history[history.length - 1];
    if (!prev) return;
    piecesRef.current = prev;
    setPieces(prev);
    setHistory(h => h.slice(0, -1));
    setMoves(m => m - 1);
  }, [history, isWon]);

  const reset = useCallback((newPieces: Piece[]) => {
    piecesRef.current = newPieces;
    setPieces(newPieces);
    setHistory([]);
    setMoves(0);
    setIsWon(false);
  }, []);

  useEffect(() => {
    const master = pieces.find(p => p.id === 'master');
    if (master && master.x === 1 && master.y === EXIT_ROW) {
      setIsWon(true);
    }
  }, [pieces]);

  const solverData = useMemo(() => {
    return computeSolverMetrics(pieces);
  }, [canonicalKey]);

  return {
    pieces,
    setPieces,
    moves,
    isWon,
    history,
    canonicalKey,
    isLegalMove,
    applyMove,
    undo,
    reset,
    solverData,
  };
}

function useDragController(
  boardEngine: ReturnType<typeof useBoardEngine>,
  cellSize: number
) {
  const { pieces, isLegalMove, applyMove, isWon } = boardEngine;
  const [dragState, setDragState] = useState<{
    pieceId: string;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  const rafRef = useRef<number | null>(null);
  const pointerRef = useRef<{
    pieceId: string;
    initialMouseX: number;
    initialMouseY: number;
    currentMouseX: number;
    currentMouseY: number;
    logicalPieceX: number;
    logicalPieceY: number;
  } | null>(null);

  const motionValues = useMemo(() => {
    const map: Record<string, { x: any; y: any }> = {};
    const unit = cellSize + GAP;
    pieces.forEach(p => {
      map[p.id] = {
        x: motionValue(p.x * unit),
        y: motionValue(p.y * unit),
      };
    });
    return map;
  }, [pieces.map(p => p.id).join(':'), cellSize]);

  useEffect(() => {
    const unit = cellSize + GAP;
    pieces.forEach(p => {
      const mv = motionValues[p.id];
      if (mv) {
        mv.x.set(p.x * unit);
        mv.y.set(p.y * unit);
      }
    });
  }, [pieces, cellSize, motionValues]);

  const unit = useMemo(() => cellSize + GAP, [cellSize]);
  const threshold = useMemo(() => unit * 0.55, [unit]);

  const stopRAF = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, piece: Piece) => {
      if (isWon) return;
      e.currentTarget?.setPointerCapture?.(e.pointerId);

      pointerRef.current = {
        pieceId: piece.id,
        initialMouseX: e.clientX,
        initialMouseY: e.clientY,
        currentMouseX: e.clientX,
        currentMouseY: e.clientY,
        logicalPieceX: piece.x,
        logicalPieceY: piece.y,
      };

      const mv = motionValues[piece.id];
      if (mv) {
        mv.x.set(piece.x * unit);
        mv.y.set(piece.y * unit);
      }

      setDragState({ pieceId: piece.id, offsetX: 0, offsetY: 0 });

      let lastUpdateTime = 0;
      const updateLoop = (time: number) => {
        if (!pointerRef.current) {
          stopRAF();
          return;
        }
        if (time - lastUpdateTime < 16) {
          rafRef.current = requestAnimationFrame(updateLoop);
          return;
        }
        lastUpdateTime = time;

        const state = pointerRef.current;
        
        const dragDx = state.currentMouseX - state.initialMouseX;
        const dragDy = state.currentMouseY - state.initialMouseY;

        const logicalDx = (state.logicalPieceX - piece.x) * unit;
        const logicalDy = (state.logicalPieceY - piece.y) * unit;

        let remainingDx = dragDx - logicalDx;
        let remainingDy = dragDy - logicalDy;

        while (Math.abs(remainingDx) >= threshold || Math.abs(remainingDy) >= threshold) {
          const absDx = Math.abs(remainingDx);
          const absDy = Math.abs(remainingDy);
          let applied = false;

          if (absDx >= absDy) {
            const dirX = Math.sign(remainingDx);
            if (isLegalMove(state.pieceId, dirX, 0)) {
              applyMove(state.pieceId, dirX, 0);
              state.logicalPieceX += dirX;
              remainingDx -= dirX * unit;
              applied = true;
            } else if (absDy >= threshold) {
              const dirY = Math.sign(remainingDy);
              if (isLegalMove(state.pieceId, 0, dirY)) {
                applyMove(state.pieceId, 0, dirY);
                state.logicalPieceY += dirY;
                remainingDy -= dirY * unit;
                applied = true;
              }
            }
          } else {
            const dirY = Math.sign(remainingDy);
            if (isLegalMove(state.pieceId, 0, dirY)) {
              applyMove(state.pieceId, 0, dirY);
              state.logicalPieceY += dirY;
              remainingDy -= dirY * unit;
              applied = true;
            } else if (absDx >= threshold) {
              const dirX = Math.sign(remainingDx);
              if (isLegalMove(state.pieceId, dirX, 0)) {
                applyMove(state.pieceId, dirX, 0);
                state.logicalPieceX += dirX;
                remainingDx -= dirX * unit;
                applied = true;
              }
            }
          }

          if (!applied) break;
        }

        const mv = motionValues[state.pieceId];
        if (mv) {
          const clampedX = Math.max(-unit * 0.48, Math.min(unit * 0.48, remainingDx));
          const clampedY = Math.max(-unit * 0.48, Math.min(unit * 0.48, remainingDy));
          mv.x.set(state.logicalPieceX * unit + clampedX);
          mv.y.set(state.logicalPieceY * unit + clampedY);
          setDragState({ pieceId: state.pieceId, offsetX: clampedX, offsetY: clampedY });
        }

        rafRef.current = requestAnimationFrame(updateLoop);
      };

      rafRef.current = requestAnimationFrame(updateLoop);
    },
    [
      isWon,
      motionValues,
      unit,
      threshold,
      isLegalMove,
      applyMove,
      stopRAF,
    ]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!pointerRef.current) return;
      e.currentTarget?.releasePointerCapture?.(e.pointerId);

      stopRAF();

      const state = pointerRef.current;
      const mv = motionValues[state.pieceId];
      if (mv) {
        mv.x.set(state.logicalPieceX * unit);
        mv.y.set(state.logicalPieceY * unit);
      }

      pointerRef.current = null;
      setDragState(null);
    },
    [motionValues, unit, stopRAF]
  );

  useEffect(() => stopRAF, [stopRAF]);

  return {
    dragState,
    motionValues,
    handlePointerDown,
    handlePointerMove: (e: React.PointerEvent) => {
       if (pointerRef.current) {
         pointerRef.current.currentMouseX = e.clientX;
         pointerRef.current.currentMouseY = e.clientY;
       }
    },
    handlePointerUp,
    handlePointerCancel: handlePointerUp,
  };
}

const PieceComponent = memo(function PieceComponent({
  piece,
  cellSize,
  isDragging,
  motionValues,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  staggerDelay,
}: {
  piece: Piece;
  cellSize: number;
  isDragging: boolean;
  motionValues: Record<string, { x: any; y: any }>;
  onPointerDown: (e: React.PointerEvent, piece: Piece) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
  onPointerCancel: (e: React.PointerEvent) => void;
  staggerDelay: number;
}) {
  const unit = cellSize + GAP;
  const mv = motionValues[piece.id];

  if (!mv) return null;

  return (
    <motion.div
      className={`piece ${piece.type} ${isDragging ? 'dragging' : ''} ${piece.id === 'master' ? 'master' : ''}`}
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{
        opacity: 1,
        scale: 1,
        zIndex: isDragging ? 20 : 1,
      }}
      transition={
        isDragging
          ? { type: 'spring', stiffness: 420, damping: 26 }
          : { type: 'spring', stiffness: 520, damping: 42, delay: staggerDelay }
      }
      style={{
        width: piece.w * cellSize + (piece.w - 1) * GAP,
        height: piece.h * cellSize + (piece.h - 1) * GAP,
        position: 'absolute',
        top: BOARD_PADDING,
        left: BOARD_PADDING,
        touchAction: 'none',
        willChange: 'transform',
        x: mv.x,
        y: mv.y,
      }}
      onPointerDown={e => onPointerDown(e, piece)}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      <div className="piece-inner" />
    </motion.div>
  );
});

export default function App() {
  const [userTheme, setUserTheme] = useState<'light' | 'dark' | null>(() => {
    return localStorage.getItem('klotski_theme') as 'light' | 'dark' | null;
  });
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia('(prefers-color-scheme: dark)').matches
  );
  const isDarkMode = userTheme ? userTheme === 'dark' : systemDark;

  const [difficulty, setDifficulty] = useState<Difficulty>(() => {
    const stored = localStorage.getItem('klotski_difficulty') as Difficulty | null;
    return stored || 'medium';
  });
  const [currentLevelIndex, setCurrentLevelIndex] = useState(() => {
    const saved = localStorage.getItem('klotski_level_index');
    return saved ? parseInt(saved, 10) : 0;
  });

  const [levelPieces, setLevelPieces] = useState<Piece[]>([]);
  const [isGenerating, setIsGenerating] = useState(true);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    document.body.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

  useEffect(() => {
    localStorage.setItem('klotski_level_index', currentLevelIndex.toString());
  }, [currentLevelIndex]);

  useEffect(() => {
    localStorage.setItem('klotski_difficulty', difficulty);
  }, [difficulty]);

  const toggleTheme = () => {
    const newTheme = isDarkMode ? 'light' : 'dark';
    setUserTheme(newTheme);
    localStorage.setItem('klotski_theme', newTheme);
  };

  const boardEngine = useBoardEngine(levelPieces);
  const { pieces, moves, isWon, undo, reset, solverData } = boardEngine;

  useEffect(() => {
    if (levelPieces.length > 0) {
      reset(levelPieces);
    }
  }, [levelPieces, reset]);

  const [cellSize, setCellSize] = useState(70);
  useEffect(() => {
    const updateSize = () => {
      const paddingX = 80;
      const paddingY = 160;
      const headerHeight = 140;
      const maxW = Math.min(window.innerWidth - paddingX, 500);
      const maxH = Math.min(window.innerHeight - headerHeight - paddingY, 700);

      const sizeW = (maxW - (BOARD_W - 1) * GAP - 2 * BOARD_PADDING) / BOARD_W;
      const sizeH = (maxH - (BOARD_H - 1) * GAP - 2 * BOARD_PADDING) / BOARD_H;

      setCellSize(Math.max(35, Math.min(sizeW, sizeH)));
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const { dragState, motionValues, handlePointerDown, handlePointerMove, handlePointerUp, handlePointerCancel } = useDragController(boardEngine, cellSize);

  const [stagger, setStagger] = useState(true);
  useEffect(() => {
    if (stagger) {
      const t = setTimeout(() => setStagger(false), 900);
      return () => clearTimeout(t);
    }
  }, [stagger]);

  // const haptics = useMemo(() => new WebHaptics(), []);
  const haptics = useMemo(() => ({ trigger: () => {} }), []);
  // const [playSelectRaw] = useSound('/audio/click1.ogg', { volume: 0.15 });
  // const [playMoveRaw] = useSound('/audio/switch1.ogg', { volume: 0.25 });
  // const [playWinRaw] = useSound('/audio/switch33.ogg', { volume: 0.4 });
  const playSelectRaw = () => {};
  const playMoveRaw = () => {};
  const playWinRaw = () => {};

  const lastSoundTime = useRef({ select: 0, move: 0, win: 0 });
  const playSelect = useCallback(() => {
    const now = Date.now();
    if (now - lastSoundTime.current.select > 100) {
      playSelectRaw?.();
      lastSoundTime.current.select = now;
    }
  }, [playSelectRaw]);
  const playMove = useCallback(() => {
    const now = Date.now();
    if (now - lastSoundTime.current.move > 120) {
      playMoveRaw?.();
      lastSoundTime.current.move = now;
    }
  }, [playMoveRaw]);
  const playWin = useCallback(() => {
    const now = Date.now();
    if (now - lastSoundTime.current.win > 1000) {
      playWinRaw?.();
      lastSoundTime.current.win = now;
    }
  }, [playWinRaw]);

  useEffect(() => {
    if (isWon) {
      haptics.trigger('success');
      playWin();
    }
  }, [isWon, haptics, playWin]);

  const loadLevel = useCallback(
    (nextIndex: number, difficultyOverride?: Difficulty) => {
      const diff = difficultyOverride || difficulty;
      setIsGenerating(true);
      
      // Use setTimeout to allow the UI to show the loading state
      setTimeout(() => {
        const nextPieces = produceSolvableLevel({ difficulty: diff });
        setLevelPieces(nextPieces);
        reset(nextPieces);
        setCurrentLevelIndex(nextIndex);
        setStagger(true);
        setIsGenerating(false);
      }, 100);
    },
    [difficulty, reset]
  );

  // Initial level load
  useEffect(() => {
    loadLevel(currentLevelIndex);
  }, []); // Only on mount

  const handleNextLevel = useCallback(() => {
    haptics.trigger('medium');
    playSelect();
    loadLevel(currentLevelIndex + 1);
  }, [currentLevelIndex, haptics, playSelect, loadLevel]);

  const handleReset = useCallback(() => {
    haptics.trigger('medium');
    playSelect();
    loadLevel(currentLevelIndex);
  }, [currentLevelIndex, haptics, playSelect, loadLevel]);

  const handleUndoClick = useCallback(() => {
    if (!isWon) {
      haptics.trigger('light');
      playSelect();
      undo();
    }
  }, [isWon, haptics, playSelect, undo]);

  const handleDifficultyChange = useCallback(
    (newDiff: Difficulty) => {
      setDifficulty(newDiff);
      loadLevel(currentLevelIndex, newDiff);
    },
    [currentLevelIndex, loadLevel]
  );

  return (
    <div className="app-container">
      <div className="header">
        <div className="title-group">
          <h1 className="title">Klotski</h1>
          <div className="subtitle">Slide the Master block to the exit</div>
        </div>
        <div className="stats">
          <span className="stat-label">Moves</span>
          <span className="stat-value">{moves.toString().padStart(3, '0')}</span>
          <span className="stat-label" style={{ marginTop: 4 }}>
            {solverData.solvable ? `Shortest ${solverData.shortestPathLength}` : 'Unsolvable'}
          </span>
        </div>
      </div>

      <div
        className="board-container"
        style={{
          width: BOARD_W * cellSize + (BOARD_W - 1) * GAP + 2 * BOARD_PADDING,
          height: BOARD_H * cellSize + (BOARD_H - 1) * GAP + 2 * BOARD_PADDING,
        }}
      >
        {isGenerating && (
          <div className="loading-overlay">
            <div className="loading-spinner" />
            <div className="loading-text">Generating Level...</div>
          </div>
        )}
        <div
          className="board-grid"
          style={{
            top: BOARD_PADDING,
            left: BOARD_PADDING,
            right: BOARD_PADDING,
            bottom: BOARD_PADDING,
            backgroundSize: `${cellSize + GAP}px ${cellSize + GAP}px`,
            backgroundPosition: `0px 0px`,
          }}
        />
        <div
          className="exit-indicator"
          style={{
            left: BOARD_PADDING + cellSize + GAP,
            width: 2 * cellSize + GAP,
          }}
        />

        {pieces.map((piece, index) => (
          <PieceComponent
            key={`${currentLevelIndex}-${piece.id}`}
            piece={piece}
            cellSize={cellSize}
            isDragging={dragState?.pieceId === piece.id}
            motionValues={motionValues}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
            staggerDelay={stagger ? 0.03 * index : 0}
          />
        ))}
      </div>

      <div className="controls">
        <button className="btn" onClick={handleUndoClick} disabled={!boardEngine.history?.length || isWon}>
          <Undo2 size={18} />
          Undo
        </button>
        <button className="btn" onClick={handleReset}>
          <RotateCcw size={18} />
          Reset
        </button>
        <div className="difficulty-selector" style={{ marginLeft: 12 }}>
          <select
            value={difficulty}
            onChange={e => handleDifficultyChange(e.target.value as Difficulty)}
            aria-label="Select difficulty"
            className="btn"
            style={{ padding: '12px 16px', fontSize: 14 }}
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
            <option value="expert">Expert</option>
          </select>
        </div>
      </div>

      <div className="bottom-right-controls">
        <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle dark mode">
          {isDarkMode ? <Sun size={14} /> : <Moon size={14} />}
        </button>
        <div className="level-indicator">
          #{currentLevelIndex + 1} • {difficulty}
        </div>
      </div>

      <AnimatePresence>
        {isWon && (
          <motion.div
            className="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <motion.div
              className="win-card"
              initial={{ y: 30, scale: 0.95, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30, delay: 0.1 }}
            >
              <div className="win-icon">
                <Check size={32} strokeWidth={3} />
              </div>
              <h2 className="win-title">Solved</h2>
              <p className="win-subtitle">Master block escaped</p>

              <div className="win-stats">
                <div className="win-stat-col">
                  <span className="win-stat-val">{moves.toString().padStart(3, '0')}</span>
                  <span className="win-stat-lbl">Moves</span>
                </div>
                <div className="win-stat-col">
                  <span className="win-stat-val">
                    {solverData.shortestPathLength === Infinity ? '—' : solverData.shortestPathLength}
                  </span>
                  <span className="win-stat-lbl">Shortest</span>
                </div>
              </div>

              <button
                className="btn"
                onClick={handleNextLevel}
                style={{ margin: '0 auto', width: '100%', justifyContent: 'center' }}
              >
                <Check size={18} />
                Next Level
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

