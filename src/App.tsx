import React, { useState, useEffect, useMemo, useRef } from 'react';
import { RotateCcw, Undo2, Check, Moon, Sun } from 'lucide-react';
import { WebHaptics } from 'web-haptics';
import { motion, AnimatePresence } from 'motion/react';
import useSound from 'use-sound';

type PieceType = 'master' | 'v' | 'h' | 's';

interface Piece {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  type: PieceType;
}

const LEVELS: Piece[][] = [
  // Level 1: Very Easy
  [
    { id: 'master', x: 1, y: 1, w: 2, h: 2, type: 'master' },
    { id: 'v1', x: 0, y: 1, w: 1, h: 2, type: 'v' },
    { id: 'v2', x: 3, y: 1, w: 1, h: 2, type: 'v' },
    { id: 'h1', x: 1, y: 0, w: 2, h: 1, type: 'h' },
    { id: 's1', x: 1, y: 3, w: 1, h: 1, type: 's' },
    { id: 's2', x: 2, y: 3, w: 1, h: 1, type: 's' },
  ],
  // Level 2: Easy
  [
    { id: 'master', x: 1, y: 0, w: 2, h: 2, type: 'master' },
    { id: 'v1', x: 0, y: 0, w: 1, h: 2, type: 'v' },
    { id: 'v2', x: 3, y: 0, w: 1, h: 2, type: 'v' },
    { id: 'h1', x: 1, y: 2, w: 2, h: 1, type: 'h' },
    { id: 's1', x: 0, y: 2, w: 1, h: 1, type: 's' },
    { id: 's2', x: 3, y: 2, w: 1, h: 1, type: 's' },
    { id: 's3', x: 1, y: 3, w: 1, h: 1, type: 's' },
    { id: 's4', x: 2, y: 3, w: 1, h: 1, type: 's' },
  ],
  // Level 3: Medium (Pennant Puzzle)
  [
    { id: 'master', x: 0, y: 0, w: 2, h: 2, type: 'master' },
    { id: 'v1', x: 2, y: 0, w: 1, h: 2, type: 'v' },
    { id: 'v2', x: 3, y: 0, w: 1, h: 2, type: 'v' },
    { id: 'v3', x: 2, y: 2, w: 1, h: 2, type: 'v' },
    { id: 'v4', x: 3, y: 2, w: 1, h: 2, type: 'v' },
    { id: 'h1', x: 0, y: 2, w: 2, h: 1, type: 'h' },
    { id: 'h2', x: 0, y: 3, w: 2, h: 1, type: 'h' },
    { id: 's1', x: 0, y: 4, w: 1, h: 1, type: 's' },
    { id: 's2', x: 1, y: 4, w: 1, h: 1, type: 's' },
  ],
  // Level 4: Hard (Forget-me-not)
  [
    { id: 'v1', x: 0, y: 0, w: 1, h: 2, type: 'v' },
    { id: 'master', x: 1, y: 0, w: 2, h: 2, type: 'master' },
    { id: 'v2', x: 3, y: 0, w: 1, h: 2, type: 'v' },
    { id: 'v3', x: 0, y: 2, w: 1, h: 2, type: 'v' },
    { id: 'h1', x: 1, y: 2, w: 2, h: 1, type: 'h' },
    { id: 'v4', x: 3, y: 2, w: 1, h: 2, type: 'v' },
    { id: 's1', x: 1, y: 3, w: 1, h: 1, type: 's' },
    { id: 's2', x: 2, y: 3, w: 1, h: 1, type: 's' },
    { id: 's3', x: 0, y: 4, w: 1, h: 1, type: 's' },
    { id: 's4', x: 3, y: 4, w: 1, h: 1, type: 's' },
  ],
  // Level 5: Expert (Red Donkey)
  [
    { id: 'v1', x: 0, y: 0, w: 1, h: 2, type: 'v' },
    { id: 'master', x: 1, y: 0, w: 2, h: 2, type: 'master' },
    { id: 'v2', x: 3, y: 0, w: 1, h: 2, type: 'v' },
    { id: 'v3', x: 0, y: 2, w: 1, h: 2, type: 'v' },
    { id: 'h1', x: 1, y: 2, w: 2, h: 1, type: 'h' },
    { id: 'v4', x: 3, y: 2, w: 1, h: 2, type: 'v' },
    { id: 's1', x: 1, y: 3, w: 1, h: 1, type: 's' },
    { id: 's2', x: 2, y: 3, w: 1, h: 1, type: 's' },
    { id: 's3', x: 1, y: 4, w: 1, h: 1, type: 's' },
    { id: 's4', x: 2, y: 4, w: 1, h: 1, type: 's' },
  ]
];

const BOARD_W = 4;
const BOARD_H = 5;
const GAP = 6;
const BOARD_PADDING = 14;

interface VisualDragState {
  pieceId: string;
  offsetX: number;
  offsetY: number;
}

export default function App() {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('klotski_theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [currentLevel, setCurrentLevel] = useState(() => {
    const saved = localStorage.getItem('klotski_level');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [pieces, setPieces] = useState<Piece[]>(LEVELS[currentLevel] || LEVELS[0]);
  const [history, setHistory] = useState<Piece[][]>([]);

  useEffect(() => {
    localStorage.setItem('klotski_theme', isDarkMode ? 'dark' : 'light');
    document.body.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

  useEffect(() => {
    localStorage.setItem('klotski_level', currentLevel.toString());
  }, [currentLevel]);

  const loadLevel = (levelIndex: number) => {
    const level = LEVELS[levelIndex] || LEVELS[0];
    setPieces(level);
    setHistory([]);
    setMoves(0);
    setIsWon(false);
    setResetCount(c => c + 1);
    setStagger(true);
  };

  const handleNextLevel = () => {
    haptics.trigger('medium');
    playSelect();
    const next = Math.min(currentLevel + 1, LEVELS.length - 1);
    setCurrentLevel(next);
    loadLevel(next);
  };
  const [moves, setMoves] = useState(0);
  const [isWon, setIsWon] = useState(false);
  const [resetCount, setResetCount] = useState(0);
  const [cellSize, setCellSize] = useState(70);
  const [dragState, setDragState] = useState<VisualDragState | null>(null);
  const dragRef = useRef<{
    pieceId: string;
    pointerX: number;
    pointerY: number;
    pieces: Piece[];
    initialPieces: Piece[];
    hasMoved: boolean;
  } | null>(null);
  const [stagger, setStagger] = useState(true);
  
  const haptics = useMemo(() => new WebHaptics(), []);

  const [playSelectRaw] = useSound('/audio/click1.ogg', { volume: 0.15 });
  const [playMoveRaw] = useSound('/audio/switch1.ogg', { volume: 0.25 });
  const [playWinRaw] = useSound('/audio/switch33.ogg', { volume: 0.4 });

  const lastSoundTime = useRef<{ select: number; move: number; win: number }>({ select: 0, move: 0, win: 0 });

  const playSelect = () => {
    const now = Date.now();
    if (now - lastSoundTime.current.select > 100) {
      playSelectRaw();
      lastSoundTime.current.select = now;
    }
  };

  const playMove = () => {
    const now = Date.now();
    if (now - lastSoundTime.current.move > 120) {
      playMoveRaw();
      lastSoundTime.current.move = now;
    }
  };

  const playWin = () => {
    const now = Date.now();
    if (now - lastSoundTime.current.win > 1000) {
      playWinRaw();
      lastSoundTime.current.win = now;
    }
  };

  useEffect(() => {
    if (stagger) {
      const t = setTimeout(() => setStagger(false), 1000);
      return () => clearTimeout(t);
    }
  }, [stagger]);

  useEffect(() => {
    const updateSize = () => {
      const paddingX = 80; // 40px padding on each side
      const paddingY = 160; // 80px padding top and bottom
      const headerHeight = 140; // Approximate header + controls height
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

  const getBounds = (piece: Piece, axis: 'x' | 'y', currentPieces: Piece[]) => {
    const grid = Array(BOARD_H).fill(null).map(() => Array(BOARD_W).fill(false));
    currentPieces.forEach(p => {
      if (p.id === piece.id) return;
      for (let r = 0; r < p.h; r++) {
        for (let c = 0; c < p.w; c++) {
          grid[p.y + r][p.x + c] = true;
        }
      }
    });

    let minDelta = 0;
    let maxDelta = 0;

    if (axis === 'x') {
      for (let d = 1; d <= piece.x; d++) {
        let canMove = true;
        for (let r = 0; r < piece.h; r++) {
          if (grid[piece.y + r][piece.x - d]) canMove = false;
        }
        if (canMove) minDelta = -d; else break;
      }
      for (let d = 1; d <= BOARD_W - (piece.x + piece.w); d++) {
        let canMove = true;
        for (let r = 0; r < piece.h; r++) {
          if (grid[piece.y + r][piece.x + piece.w - 1 + d]) canMove = false;
        }
        if (canMove) maxDelta = d; else break;
      }
    } else {
      for (let d = 1; d <= piece.y; d++) {
        let canMove = true;
        for (let c = 0; c < piece.w; c++) {
          if (grid[piece.y - d][piece.x + c]) canMove = false;
        }
        if (canMove) minDelta = -d; else break;
      }
      for (let d = 1; d <= BOARD_H - (piece.y + piece.h); d++) {
        let canMove = true;
        for (let c = 0; c < piece.w; c++) {
          if (grid[piece.y + piece.h - 1 + d][piece.x + c]) canMove = false;
        }
        if (canMove) maxDelta = d; else break;
      }
    }
    return { minDelta, maxDelta };
  };

  const handlePointerDown = (e: React.PointerEvent, piece: Piece) => {
    if (isWon) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    haptics.trigger('selection');
    playSelect();
    
    dragRef.current = {
      pieceId: piece.id,
      pointerX: e.clientX,
      pointerY: e.clientY,
      pieces: pieces,
      initialPieces: pieces,
      hasMoved: false
    };

    setDragState({
      pieceId: piece.id,
      offsetX: 0,
      offsetY: 0
    });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;

    const state = dragRef.current;
    const currentPointerX = e.clientX;
    const currentPointerY = e.clientY;
    let { pointerX, pointerY, pieces: currentPieces } = state;

    let dx = currentPointerX - pointerX;
    let dy = currentPointerY - pointerY;

    const unit = cellSize + GAP;
    const threshold = unit * 0.55;

    let moved = false;
    let newPieces = currentPieces;
    let piece = newPieces.find(p => p.id === state.pieceId)!;

    let keepChecking = true;
    while (keepChecking) {
      keepChecking = false;
      
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);
      
      if (absDx > threshold || absDy > threshold) {
        if (absDx >= absDy) {
          const dir = Math.sign(dx);
          const bounds = getBounds(piece, 'x', newPieces);
          if ((dir > 0 && bounds.maxDelta >= 1) || (dir < 0 && bounds.minDelta <= -1)) {
            newPieces = newPieces.map(p => p.id === piece.id ? { ...p, x: p.x + dir } : p);
            piece = newPieces.find(p => p.id === state.pieceId)!;
            pointerX += dir * unit;
            dx = currentPointerX - pointerX;
            moved = true;
            keepChecking = true;
          } else if (absDy > threshold) {
            const dirY = Math.sign(dy);
            const boundsY = getBounds(piece, 'y', newPieces);
            if ((dirY > 0 && boundsY.maxDelta >= 1) || (dirY < 0 && boundsY.minDelta <= -1)) {
              newPieces = newPieces.map(p => p.id === piece.id ? { ...p, y: p.y + dirY } : p);
              piece = newPieces.find(p => p.id === state.pieceId)!;
              pointerY += dirY * unit;
              dy = currentPointerY - pointerY;
              moved = true;
              keepChecking = true;
            }
          }
        } else {
          const dir = Math.sign(dy);
          const bounds = getBounds(piece, 'y', newPieces);
          if ((dir > 0 && bounds.maxDelta >= 1) || (dir < 0 && bounds.minDelta <= -1)) {
            newPieces = newPieces.map(p => p.id === piece.id ? { ...p, y: p.y + dir } : p);
            piece = newPieces.find(p => p.id === state.pieceId)!;
            pointerY += dir * unit;
            dy = currentPointerY - pointerY;
            moved = true;
            keepChecking = true;
          } else if (absDx > threshold) {
            const dirX = Math.sign(dx);
            const boundsX = getBounds(piece, 'x', newPieces);
            if ((dirX > 0 && boundsX.maxDelta >= 1) || (dirX < 0 && boundsX.minDelta <= -1)) {
              newPieces = newPieces.map(p => p.id === piece.id ? { ...p, x: p.x + dirX } : p);
              piece = newPieces.find(p => p.id === state.pieceId)!;
              pointerX += dirX * unit;
              dx = currentPointerX - pointerX;
              moved = true;
              keepChecking = true;
            }
          }
        }
      }
    }

    const boundsX = getBounds(piece, 'x', newPieces);
    const boundsY = getBounds(piece, 'y', newPieces);
    const minPx = boundsX.minDelta * unit;
    const maxPx = boundsX.maxDelta * unit;
    const minPy = boundsY.minDelta * unit;
    const maxPy = boundsY.maxDelta * unit;
    
    const offsetX = Math.max(minPx, Math.min(maxPx, dx));
    const offsetY = Math.max(minPy, Math.min(maxPy, dy));

    state.pointerX = pointerX;
    state.pointerY = pointerY;
    state.pieces = newPieces;
    if (moved) state.hasMoved = true;

    if (moved) {
      setPieces(newPieces);
      haptics.trigger('light');
      playMove();
      const master = newPieces.find(p => p.id === 'master')!;
      if (master.x === 1 && master.y === 3) {
        setIsWon(true);
        haptics.trigger('success');
        playWin();
        dragRef.current = null;
        setDragState(null);
        return;
      }
    }

    setDragState({
      pieceId: state.pieceId,
      offsetX,
      offsetY
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    e.currentTarget.releasePointerCapture(e.pointerId);

    const state = dragRef.current;
    let finalPieces = state.pieces;
    let didMoveNow = false;

    const unit = cellSize + GAP;
    const piece = finalPieces.find(p => p.id === state.pieceId)!;
    const boundsX = getBounds(piece, 'x', finalPieces);
    const boundsY = getBounds(piece, 'y', finalPieces);
    
    const minPx = boundsX.minDelta * unit;
    const maxPx = boundsX.maxDelta * unit;
    const minPy = boundsY.minDelta * unit;
    const maxPy = boundsY.maxDelta * unit;
    
    const clampedOffsetX = Math.max(minPx, Math.min(maxPx, dragState?.offsetX || 0));
    const clampedOffsetY = Math.max(minPy, Math.min(maxPy, dragState?.offsetY || 0));
    
    const logicalDeltaX = Math.round(clampedOffsetX / unit);
    const logicalDeltaY = Math.round(clampedOffsetY / unit);

    if (logicalDeltaX !== 0 || logicalDeltaY !== 0) {
      finalPieces = finalPieces.map(p => {
        if (p.id === state.pieceId) {
          return {
            ...p,
            x: p.x + logicalDeltaX,
            y: p.y + logicalDeltaY
          };
        }
        return p;
      });
      setPieces(finalPieces);
      didMoveNow = true;
      haptics.trigger('light');
      playMove();
    }

    if (state.hasMoved || didMoveNow) {
      setHistory(prev => [...prev, state.initialPieces]);
      setMoves(m => m + 1);
      
      const master = finalPieces.find(p => p.id === 'master')!;
      if (master.x === 1 && master.y === 3) {
        setIsWon(true);
        haptics.trigger('success');
        playWin();
      }
    } else {
      haptics.trigger('soft');
    }
    
    dragRef.current = null;
    setDragState(null);
  };

  const handleUndo = () => {
    if (history.length === 0 || isWon) return;
    haptics.trigger('light');
    playSelect();
    const prev = history[history.length - 1];
    setPieces(prev);
    setHistory(h => h.slice(0, -1));
    setMoves(m => m - 1);
  };

  const handleReset = () => {
    haptics.trigger('medium');
    playSelect();
    loadLevel(currentLevel);
  };

  return (
    <div className="app-container">
      <div className="header">
        <div className="title-group">
          <h1 className="title">Klotski</h1>
        </div>
        <div className="stats">
          <span className="stat-label">Moves</span>
          <span className="stat-value">{moves.toString().padStart(3, '0')}</span>
        </div>
      </div>

      <div
        className="board-container"
        style={{
          width: BOARD_W * cellSize + (BOARD_W - 1) * GAP + 2 * BOARD_PADDING,
          height: BOARD_H * cellSize + (BOARD_H - 1) * GAP + 2 * BOARD_PADDING,
        }}
      >
        <div
          className="board-grid"
          style={{
            top: BOARD_PADDING, left: BOARD_PADDING, right: BOARD_PADDING, bottom: BOARD_PADDING,
            backgroundSize: `${cellSize + GAP}px ${cellSize + GAP}px`,
            backgroundPosition: `0px 0px`
          }}
        />
        <div
          className="exit-indicator"
          style={{
            left: BOARD_PADDING + cellSize + GAP,
            width: 2 * cellSize + GAP,
          }}
        />
        
        {pieces.map(piece => {
          const isDragging = dragState?.pieceId === piece.id;
          const unit = cellSize + GAP;

          let renderX = BOARD_PADDING + piece.x * unit;
          let renderY = BOARD_PADDING + piece.y * unit;

          if (isDragging && dragState) {
            renderX += dragState.offsetX;
            renderY += dragState.offsetY;
          }

          return (
            <motion.div
              key={`${resetCount}-${piece.id}`}
              className={`piece ${piece.type} ${isDragging ? 'dragging' : ''} ${piece.id === 'master' ? 'master' : ''}`}
              initial={{ opacity: 0, scale: 0.8, y: renderY + 20, x: renderX }}
              animate={{ 
                opacity: 1, 
                scale: 1, 
                x: renderX, 
                y: renderY,
                zIndex: isDragging ? 20 : 1
              }}
              transition={isDragging 
                ? { type: 'spring', stiffness: 400, damping: 25 } 
                : { type: 'spring', stiffness: 500, damping: 40, delay: stagger ? 0.03 * pieces.indexOf(piece) : 0 }}
              style={{
                width: piece.w * cellSize + (piece.w - 1) * GAP,
                height: piece.h * cellSize + (piece.h - 1) * GAP,
              }}
              onPointerDown={(e) => handlePointerDown(e, piece)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            >
              <div className="piece-inner" />
            </motion.div>
          );
        })}
      </div>

      <div className="controls">
        <button className="btn" onClick={handleUndo} disabled={history.length === 0 || isWon}>
          <Undo2 size={18} />
          Undo
        </button>
        <button className="btn" onClick={handleReset}>
          <RotateCcw size={18} />
          Reset
        </button>
      </div>

      <div className="bottom-right-controls">
        <button className="theme-toggle" onClick={() => setIsDarkMode(!isDarkMode)} aria-label="Toggle dark mode">
          {isDarkMode ? <Sun size={14} /> : <Moon size={14} />}
        </button>
        <div className="level-indicator">#{currentLevel + 1}</div>
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
              </div>

              {currentLevel < LEVELS.length - 1 ? (
                <button className="btn" onClick={handleNextLevel} style={{ margin: '0 auto', width: '100%', justifyContent: 'center' }}>
                  <Check size={18} />
                  Next Level
                </button>
              ) : (
                <button className="btn" onClick={handleReset} style={{ margin: '0 auto', width: '100%', justifyContent: 'center' }}>
                  <RotateCcw size={18} />
                  Play Again
                </button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
