import { playSound, initAudioSync, initAudio, getAudioTime } from './soundManager';
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { RotateCcw, Undo2, Check, Moon, Sun, ChevronLeft, ChevronRight } from 'lucide-react';
import { WebHaptics } from 'web-haptics';
import { motion, AnimatePresence, useMotionValue, animate, useSpring } from 'motion/react';
import { Piece } from './types';
import { LEVELS } from './levels';
import { CONFIG } from './config';

// Use static URLs with a cache-busting query parameter to ensure new uploads are fetched
const SOUND_URLS = {
  move: '/sounds/move.mp3?v=11',
  select: '/sounds/select.mp3?v=11',
  win: '/sounds/win.mp3?v=11',
} as const;

const BOARD_W = 4;
const BOARD_H = 5;

function getBounds(
  piece: Piece,
  axis: 'x' | 'y',
  currentPieces: Piece[],
  cachedGrid?: boolean[][]
): { minDelta: number; maxDelta: number } {
  let grid = cachedGrid;
  if (!grid) {
    grid = Array(BOARD_H).fill(null).map(() => Array(BOARD_W).fill(false));
    currentPieces.forEach(p => {
      if (p.id === piece.id) return;
      for (let r = 0; r < p.h; r++) {
        for (let c = 0; c < p.w; c++) {
          grid![p.y + r][p.x + c] = true;
        }
      }
    });
  }

  let minDelta = 0;
  let maxDelta = 0;

  if (axis === 'x') {
    for (let d = 1; d <= piece.x; d++) {
      let canMove = true;
      for (let r = 0; r < piece.h; r++) {
        if (grid![piece.y + r][piece.x - d]) canMove = false;
      }
      if (canMove) minDelta = -d; else break;
    }
    for (let d = 1; d <= BOARD_W - (piece.x + piece.w); d++) {
      let canMove = true;
      for (let r = 0; r < piece.h; r++) {
        if (grid![piece.y + r][piece.x + piece.w - 1 + d]) canMove = false;
      }
      if (canMove) maxDelta = d; else break;
    }
  } else {
    for (let d = 1; d <= piece.y; d++) {
      let canMove = true;
      for (let c = 0; c < piece.w; c++) {
        if (grid![piece.y - d][piece.x + c]) canMove = false;
      }
      if (canMove) minDelta = -d; else break;
    }
    for (let d = 1; d <= BOARD_H - (piece.y + piece.h); d++) {
      let canMove = true;
      for (let c = 0; c < piece.w; c++) {
        if (grid![piece.y + piece.h - 1 + d][piece.x + c]) canMove = false;
      }
      if (canMove) maxDelta = d; else break;
    }
  }
  return { minDelta, maxDelta };
}

interface VisualDragState {
  pieceId: string;
  offsetX: number;
  offsetY: number;
}


const PieceComponent = React.memo(({
  piece,
  isDragging,
  cellSize,
  GAP,
  BOARD_PADDING,
  onPointerDown,
  staggerIndex,
  stagger,
  resetCount,
  pieceMotionValues
}: any) => {
  const unit = cellSize + GAP;
  const baseRenderX = BOARD_PADDING + piece.x * unit;
  const baseRenderY = BOARD_PADDING + piece.y * unit;

  const xValue = useMotionValue(baseRenderX);
  const yValue = useMotionValue(baseRenderY);
  
  const [pointerType, setPointerType] = useState<'mouse' | 'touch' | 'pen'>('touch');

  // Dynamic physics based on input device and drag state.
  const physics = useMemo(() => {
    if (!isDragging) {
      // Snappier slide into the grid when released, undoing, or resetting
      return { stiffness: 500, damping: 30, mass: 0.5 };
    }
    if (pointerType === 'mouse') {
      return { stiffness: 2000, damping: 40, mass: 0.1 }; // Fast and stable
    }
    return { stiffness: 1500, damping: 35, mass: 0.2 }; // Smooth touch tracking
  }, [pointerType, isDragging]);

  const xSpring = useSpring(xValue, physics);
  const ySpring = useSpring(yValue, physics);

  useEffect(() => {
    pieceMotionValues.current.set(piece.id, { x: xValue, y: yValue });
    return () => {
      pieceMotionValues.current.delete(piece.id);
    };
  }, [piece.id, xValue, yValue, pieceMotionValues]);

  useEffect(() => {
    if (!isDragging) {
      xValue.set(baseRenderX);
      yValue.set(baseRenderY);
    }
  }, [isDragging, baseRenderX, baseRenderY, xValue, yValue]);

  return (
    <motion.div
      key={`${resetCount}-${piece.id}`}
      className={`piece ${piece.type} ${isDragging ? 'dragging' : ''} ${piece.id === 'master' ? 'master' : ''}`}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ 
        opacity: 1, 
        scale: 1
      }}
      transition={{ type: 'spring', stiffness: 400, damping: 35, mass: 1, delay: stagger ? 0.03 * staggerIndex : 0 }}
      style={{
        x: xSpring,
        y: ySpring,
        zIndex: isDragging ? 20 : 1,
        width: piece.w * cellSize + (piece.w - 1) * GAP,
        height: piece.h * cellSize + (piece.h - 1) * GAP,
        touchAction: 'none',
        userSelect: 'none',
        willChange: isDragging ? 'transform' : 'auto'
      }}
      onPointerDown={(e) => {
        setPointerType(e.pointerType as 'mouse' | 'touch' | 'pen');
        onPointerDown(e, piece);
      }}
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
    >
      <div className="piece-inner" />
    </motion.div>
  );
}, (prev: any, next: any) => {
  return (
    prev.piece.x === next.piece.x &&
    prev.piece.y === next.piece.y &&
    prev.piece.id === next.piece.id &&
    prev.isDragging === next.isDragging &&
    prev.cellSize === next.cellSize &&
    prev.stagger === next.stagger &&
    prev.staggerIndex === next.staggerIndex &&
    prev.resetCount === next.resetCount &&
    prev.onPointerDown === next.onPointerDown
  );
});

export default function App() {
  const [userTheme, setUserTheme] = useState<'light' | 'dark' | null>(() => {
    return localStorage.getItem('klotski_theme') as 'light' | 'dark' | null;
  });
  const [systemDark, setSystemDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches);
  
  const isDarkMode = userTheme ? userTheme === 'dark' : systemDark;

  const [currentLevel, setCurrentLevel] = useState(() => {
    const saved = localStorage.getItem('klotski_level');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [pieces, setPieces] = useState<Piece[]>(LEVELS[currentLevel] || LEVELS[0]);
  const piecesRef = useRef<Piece[]>(LEVELS[currentLevel] || LEVELS[0]);
  const [history, setHistory] = useState<Piece[][]>([]);

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
    localStorage.setItem('klotski_level', currentLevel.toString());
  }, [currentLevel]);

  const toggleTheme = () => {
    const newTheme = isDarkMode ? 'light' : 'dark';
    setUserTheme(newTheme);
    localStorage.setItem('klotski_theme', newTheme);
  };

  const loadLevel = (levelIndex: number) => {
    const level = LEVELS[levelIndex] || LEVELS[0];
    setPieces(level);
    piecesRef.current = level;
    setHistory([]);
    setMoves(0);
    setIsWon(false);
    setResetCount(c => c + 1);
    setStagger(true);
  };

  const handlePrevLevel = () => {
    if (currentLevel > 0) {
      haptics.trigger('medium');
      playSelect();
      const next = currentLevel - 1;
      setCurrentLevel(next);
      loadLevel(next);
    }
  };

  const handleNextLevel = () => {
    if (currentLevel < LEVELS.length - 1) {
      haptics.trigger('medium');
      playSelect();
      const next = currentLevel + 1;
      setCurrentLevel(next);
      loadLevel(next);
    }
  };
  const [moves, setMoves] = useState(0);
  const [isWon, setIsWon] = useState(false);
  const [resetCount, setResetCount] = useState(0);
  const [cellSize, setCellSize] = useState(70);
  const GAP = (6 / 70) * cellSize;
  const BOARD_PADDING = (14 / 70) * cellSize;
  const [dragState, setDragState] = useState<{ pieceId: string, x: number, y: number } | null>(null);
  
  const [moveClicks, setMoveClicks] = useState<number[]>([]);
  const [isSkipRevealed, setIsSkipRevealed] = useState(false);
  const boardRef = useRef<HTMLDivElement>(null);

  const handleMovesClick = () => {
    const now = Date.now();
    const recentClicks = [...moveClicks, now].filter(t => now - t < 10000);
    setMoveClicks(recentClicks);
    if (recentClicks.length >= 15 && !isSkipRevealed) {
      setIsSkipRevealed(true);
      haptics.trigger('success');
    }
  };
  const dragRef = useRef<{
    grid: boolean[][];
    pieceId: string;
    pointerX: number;
    pointerY: number;
    pieces: Piece[];
    initialPieces: Piece[];
    hasMoved: boolean;
    pointerId: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  
  const pieceMotionValues = useRef<Map<string, { x: any, y: any }>>(new Map());

  const [stagger, setStagger] = useState(true);
  
  const haptics = useMemo(() => new WebHaptics(), []);

  const lastSoundTime = useRef<{ select: number; move: number; win: number }>({ select: 0, move: 0, win: 0 });

  const playSelect = useCallback(() => {
    const now = Date.now();
    if (now - lastSoundTime.current.select > 100) {
      playSound('select').catch(() => {});
      lastSoundTime.current.select = now;
    }
  }, []);

  const playMove = useCallback((count = 1) => {
    const now = Date.now();
    
    // Prevent overlapping sequences if a multi-step sound is still playing
    if (now < lastSoundTime.current.move) {
      return;
    }
    
    if (count === 1) {
      // Standard single-step throttle
      if (now - lastSoundTime.current.move > 60) {
        playSound('move', 0.3).catch(() => {});
        lastSoundTime.current.move = now;
      }
    } else {
      // For multi-step moves (fast drags), play a sequence of sounds
      // using precise audio context timing if available
      const startTime = getAudioTime();
      const safeCount = Math.min(count, 4); // Limit to max 4 sounds per drag burst
      
      if (startTime > 0) {
        for (let i = 0; i < safeCount; i++) {
          // Increase pitch slightly for each step to make it sound like a slide
          const rate = 1.0 + (i * 0.05);
          playSound('move', 0.2, startTime + i * 0.05, rate).catch(() => {});
        }
      } else {
        // Fallback to setTimeout if audio context isn't ready
        for (let i = 0; i < safeCount; i++) {
          setTimeout(() => {
            playSound('move', 0.2).catch(() => {});
          }, i * 50);
        }
      }
      lastSoundTime.current.move = now + (safeCount * 50);
    }
  }, []);

  const playWin = useCallback(() => {
    const now = Date.now();
    if (now - lastSoundTime.current.win > 1000) {
      playSound('win').catch(() => {});
      lastSoundTime.current.win = now;
    }
  }, []);

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
      
      const sizeW = (maxW * 70) / 326;
      const sizeH = (maxH * 70) / 402;
      
      setCellSize(Math.max(35, Math.min(sizeW, sizeH)));
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    initAudioSync();
  }, []);

  const audioInitializedRef = useRef(false);

  const handlePointerDown = useCallback((e: React.PointerEvent, piece: Piece) => {
    if (isWon || dragRef.current || e.button !== 0) return;
    
    if (!audioInitializedRef.current) {
      audioInitializedRef.current = true;
      initAudio(SOUND_URLS).catch(() => {});
    }
    
    boardRef.current?.setPointerCapture(e.pointerId);
    
    const grid = Array(BOARD_H).fill(null).map(() => Array(BOARD_W).fill(false));
    piecesRef.current.forEach(p => {
      if (p.id === piece.id) return;
      for (let r = 0; r < p.h; r++) {
        for (let c = 0; c < p.w; c++) {
          grid[p.y + r][p.x + c] = true;
        }
      }
    });

    dragRef.current = {
      pieceId: piece.id,
      pointerX: e.clientX,
      pointerY: e.clientY,
      pieces: piecesRef.current,
      initialPieces: piecesRef.current,
      hasMoved: false,
      grid,
      pointerId: e.pointerId,
      offsetX: 0,
      offsetY: 0
    };

    const unit = cellSize + GAP;
    setDragState({
      pieceId: piece.id,
      x: BOARD_PADDING + piece.x * unit,
      y: BOARD_PADDING + piece.y * unit
    });

    haptics.trigger('selection');
    playSelect();
  }, [cellSize, isWon, haptics, playSelect]);

  const rAFRef = useRef<number | null>(null);
  const latestPointerRef = useRef<{ x: number, y: number } | null>(null);

  
  const processPointerMove = () => {
    if (!dragRef.current || !latestPointerRef.current) {
      rAFRef.current = null;
      return;
    }

    try {
      const state = dragRef.current;
      const currentPointerX = latestPointerRef.current.x;
      const currentPointerY = latestPointerRef.current.y;
      let { pointerX, pointerY, pieces: currentPieces } = state;

      let dx = currentPointerX - pointerX;
      let dy = currentPointerY - pointerY;

      const unit = cellSize + GAP;
      const threshold = unit * 0.51;

      let stepsCount = 0;
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
            const bounds = getBounds(piece, 'x', newPieces, state.grid);
            if ((dir > 0 && bounds.maxDelta >= 1) || (dir < 0 && bounds.minDelta <= -1)) {
              newPieces = newPieces.map(p => p.id === piece.id ? { ...p, x: p.x + dir } : p);
              piece = newPieces.find(p => p.id === state.pieceId)!;
              pointerX += dir * unit;
              dx = currentPointerX - pointerX;
              stepsCount++;
              keepChecking = true;
            } else if (absDy > threshold) {
              const dirY = Math.sign(dy);
              const boundsY = getBounds(piece, 'y', newPieces, state.grid);
              if ((dirY > 0 && boundsY.maxDelta >= 1) || (dirY < 0 && boundsY.minDelta <= -1)) {
                newPieces = newPieces.map(p => p.id === piece.id ? { ...p, y: p.y + dirY } : p);
                piece = newPieces.find(p => p.id === state.pieceId)!;
                pointerY += dirY * unit;
                dy = currentPointerY - pointerY;
                stepsCount++;
                keepChecking = true;
              }
            }
          } else {
            const dir = Math.sign(dy);
            const bounds = getBounds(piece, 'y', newPieces, state.grid);
            if ((dir > 0 && bounds.maxDelta >= 1) || (dir < 0 && bounds.minDelta <= -1)) {
              newPieces = newPieces.map(p => p.id === piece.id ? { ...p, y: p.y + dir } : p);
              piece = newPieces.find(p => p.id === state.pieceId)!;
              pointerY += dir * unit;
              dy = currentPointerY - pointerY;
              stepsCount++;
              keepChecking = true;
            } else if (absDx > threshold) {
              const dirX = Math.sign(dx);
              const boundsX = getBounds(piece, 'x', newPieces, state.grid);
              if ((dirX > 0 && boundsX.maxDelta >= 1) || (dirX < 0 && boundsX.minDelta <= -1)) {
                newPieces = newPieces.map(p => p.id === piece.id ? { ...p, x: p.x + dirX } : p);
                piece = newPieces.find(p => p.id === state.pieceId)!;
                pointerX += dirX * unit;
                dx = currentPointerX - pointerX;
                stepsCount++;
                keepChecking = true;
              }
            }
          }
        }
      }

      const boundsX = getBounds(piece, 'x', newPieces, state.grid);
      const boundsY = getBounds(piece, 'y', newPieces, state.grid);
      const minPx = boundsX.minDelta * unit;
      const maxPx = boundsX.maxDelta * unit;
      const minPy = boundsY.minDelta * unit;
      const maxPy = boundsY.maxDelta * unit;
      
      dx = currentPointerX - pointerX;
      dy = currentPointerY - pointerY;

      if (dx > maxPx) {
        pointerX = currentPointerX - maxPx;
        dx = maxPx;
      } else if (dx < minPx) {
        pointerX = currentPointerX - minPx;
        dx = minPx;
      }

      if (dy > maxPy) {
        pointerY = currentPointerY - maxPy;
        dy = maxPy;
      } else if (dy < minPy) {
        pointerY = currentPointerY - minPy;
        dy = minPy;
      }

      const offsetX = dx;
      const offsetY = dy;

      state.pointerX = pointerX;
      state.pointerY = pointerY;
      state.pieces = newPieces;
      state.offsetX = offsetX;
      state.offsetY = offsetY;
      if (stepsCount > 0) state.hasMoved = true;

      if (stepsCount > 0) {
        piecesRef.current = newPieces;
        haptics.trigger('light');
        playMove(stepsCount);
        const master = newPieces.find(p => p.id === 'master')!;
        if (master.x === 1 && master.y === 3) {
          setPieces(newPieces);
          setIsWon(true);
          haptics.trigger('success');
          playWin();
          dragRef.current = null;
          setDragState(null);
          return;
        }
      }

      const applyStickiness = (val: number) => {
        const abs = Math.abs(val);
        if (abs < 6) return 0;
        if (abs < 32) {
          return Math.sign(val) * (abs - 6) * (32 / 26);
        }
        return val;
      };

      const motionValues = pieceMotionValues.current.get(piece.id);
      if (motionValues) {
        let renderDx = offsetX;
        let renderDy = offsetY;

        motionValues.x.set(BOARD_PADDING + piece.x * unit + applyStickiness(renderDx));
        motionValues.y.set(BOARD_PADDING + piece.y * unit + applyStickiness(renderDy));
      }
    } finally {
      rAFRef.current = null;
    }
  };

  const handlePointerMove = (e: PointerEvent) => {
    if (!dragRef.current || dragRef.current.pointerId !== e.pointerId) return;

    latestPointerRef.current = { x: e.clientX, y: e.clientY };

    if (rAFRef.current !== null) return;

    rAFRef.current = requestAnimationFrame(() => {
      handlersRef.current.processPointerMove();
    });
  };

  const handlePointerUp = (e: PointerEvent) => {
    if (!dragRef.current || dragRef.current.pointerId !== e.pointerId) return;
    if (rAFRef.current !== null) {
      cancelAnimationFrame(rAFRef.current);
      rAFRef.current = null;
      handlersRef.current.processPointerMove();
    }
    try {
      if (boardRef.current?.hasPointerCapture(e.pointerId)) {
        boardRef.current.releasePointerCapture(e.pointerId);
      }
    } catch (err) {}

    const state = dragRef.current;
    let finalPieces = state.pieces;
    let didMoveNow = false;

    const unit = cellSize + GAP;
    const piece = finalPieces.find(p => p.id === state.pieceId)!;
    const boundsX = getBounds(piece, 'x', finalPieces, state.grid);
    const boundsY = getBounds(piece, 'y', finalPieces, state.grid);
    
    const minPx = boundsX.minDelta * unit;
    const maxPx = boundsX.maxDelta * unit;
    const minPy = boundsY.minDelta * unit;
    const maxPy = boundsY.maxDelta * unit;
    
    const currentDx = state.offsetX;
    const clampedOffsetX = Math.max(minPx, Math.min(maxPx, currentDx));
    const currentDy = state.offsetY;
    const clampedOffsetY = Math.max(minPy, Math.min(maxPy, currentDy));
    
    let logicalDeltaX = Math.round(clampedOffsetX / unit);
    let logicalDeltaY = Math.round(clampedOffsetY / unit);

    if (logicalDeltaX !== 0 && logicalDeltaY !== 0) {
      if (Math.abs(clampedOffsetX) >= Math.abs(clampedOffsetY)) {
        logicalDeltaY = 0;
      } else {
        logicalDeltaX = 0;
      }
    }

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
      piecesRef.current = finalPieces;
      didMoveNow = true;
      haptics.trigger('light');
      playMove();
    }

    if (state.hasMoved || didMoveNow) {
      if (!didMoveNow) {
        setPieces(finalPieces);
        piecesRef.current = finalPieces;
      }
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
    
    // Snap motion values to exact grid position before releasing drag.
    // Without this, the spring starts from a slightly wrong position on handoff,
    // causing the visible bounce when the piece hits a border at speed.
    const endPiece = finalPieces.find(p => p.id === state.pieceId);
    if (endPiece) {
      const motionVals = pieceMotionValues.current.get(state.pieceId);
      if (motionVals) {
        motionVals.x.set(BOARD_PADDING + endPiece.x * unit);
        motionVals.y.set(BOARD_PADDING + endPiece.y * unit);
      }
    }
    dragRef.current = null;
    setDragState(null);
  };

const handlePointerCancel = (_e: PointerEvent) => {
  if (!dragRef.current) return;
  if (rAFRef.current !== null) {
    cancelAnimationFrame(rAFRef.current);
    rAFRef.current = null;
  }
  // Snap motion values back to the pre-drag grid position
  const unit = cellSize + GAP;
  const cancelPiece = dragRef.current.initialPieces.find(
    p => p.id === dragRef.current!.pieceId
  );
  if (cancelPiece) {
    const motionVals = pieceMotionValues.current.get(dragRef.current.pieceId);
    if (motionVals) {
      motionVals.x.set(BOARD_PADDING + cancelPiece.x * unit);
      motionVals.y.set(BOARD_PADDING + cancelPiece.y * unit);
    }
  }
  // Restore board to pre-drag state on cancel
  piecesRef.current = dragRef.current.initialPieces;
  setPieces(dragRef.current.initialPieces);
  dragRef.current = null;
  setDragState(null);
};

  const handlersRef = useRef({
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
    processPointerMove
  });

  useEffect(() => {
    handlersRef.current = { handlePointerMove, handlePointerUp, handlePointerCancel, processPointerMove };
  });

  useEffect(() => {
    const onMove = (e: PointerEvent) => handlersRef.current.handlePointerMove(e);
    const onUp = (e: PointerEvent) => handlersRef.current.handlePointerUp(e);
    const onCancel = (e: PointerEvent) => handlersRef.current.handlePointerCancel(e);
    
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerup', onUp, { passive: true });
    window.addEventListener('pointercancel', onCancel, { passive: true });

    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
    };
  }, []);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && dragRef.current) {
        piecesRef.current = dragRef.current.initialPieces;
        setPieces(dragRef.current.initialPieces);
        dragRef.current = null;
        setDragState(null);
        if (rAFRef.current !== null) {
          cancelAnimationFrame(rAFRef.current);
          rAFRef.current = null;
        }
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  useEffect(() => {
    const onBlur = () => {
      if (dragRef.current) {
        piecesRef.current = dragRef.current.initialPieces;
        setPieces(dragRef.current.initialPieces);
        dragRef.current = null;
        setDragState(null);
        if (rAFRef.current !== null) {
          cancelAnimationFrame(rAFRef.current);
          rAFRef.current = null;
        }
      }
    };
    window.addEventListener('blur', onBlur);
    return () => window.removeEventListener('blur', onBlur);
  }, []);

  const handleUndo = () => {
    if (history.length === 0 || isWon || dragRef.current) return;
    haptics.trigger('light');
    playSelect();
    const prev = history[history.length - 1];
    setPieces(prev);
    piecesRef.current = prev;
    setHistory(h => h.slice(0, -1));
    setMoves(m => m - 1);
  };

  const handleReset = () => {
    if (dragRef.current) return;
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
        <div className="stats" onClick={handleMovesClick} style={{ cursor: 'pointer', userSelect: 'none' }}>
          <span className="stat-label">Moves</span>
          <span className="stat-value">{moves.toString().padStart(3, '0')}</span>
        </div>
      </div>

      <div
        ref={boardRef}
        className="board-container"
        style={{
          width: BOARD_W * cellSize + (BOARD_W - 1) * GAP + 2 * BOARD_PADDING,
          height: BOARD_H * cellSize + (BOARD_H - 1) * GAP + 2 * BOARD_PADDING,
          touchAction: 'none',
          '--cell-size': `${cellSize}px`,
          '--piece-radius': `${(CONFIG.pieceRadius / 70) * cellSize}px`,
          '--radius': `calc(var(--piece-radius) + ${BOARD_PADDING}px)`
        } as React.CSSProperties}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div
          className="board-grid"
          style={{
            top: BOARD_PADDING, left: BOARD_PADDING, right: BOARD_PADDING, bottom: BOARD_PADDING,
            backgroundSize: `${cellSize + GAP}px ${cellSize + GAP}px`,
            backgroundPosition: `calc(-${GAP / 2}px) calc(-${GAP / 2}px)`
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
            key={`${resetCount}-${piece.id}`}
            piece={piece}
            isDragging={dragState?.pieceId === piece.id}
            cellSize={cellSize}
            GAP={GAP}
            BOARD_PADDING={BOARD_PADDING}
            onPointerDown={handlePointerDown}
            staggerIndex={index}
            stagger={stagger}
            resetCount={resetCount}
            pieceMotionValues={pieceMotionValues}
          />
        ))}
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
        <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle dark mode">
          {isDarkMode ? <Sun size={14} /> : <Moon size={14} />}
        </button>
        <div className="level-selector">
          <button onClick={handlePrevLevel} disabled={currentLevel === 0} className="level-nav-btn">
            <ChevronLeft size={14} />
          </button>
          <div className="level-indicator">Level {currentLevel + 1}</div>
          <AnimatePresence>
            {isSkipRevealed && (
              <motion.button 
                initial={{ width: 0, opacity: 0, y: 12 }}
                animate={{ width: 'auto', opacity: 1, y: 0 }}
                exit={{ width: 0, opacity: 0, y: -12 }}
                transition={{ 
                  type: "spring",
                  stiffness: 100,
                  damping: 20,
                  mass: 0.5,
                }}
                onClick={handleNextLevel} 
                disabled={currentLevel === LEVELS.length - 1} 
                className="level-nav-btn overflow-hidden"
              >
                <ChevronRight size={14} />
              </motion.button>
            )}
          </AnimatePresence>
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
            style={{ willChange: "opacity" }}
          >
            <motion.div 
              className="win-card"
              initial={{ y: 30, scale: 0.95, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30, delay: 0.1 }}
              style={{ willChange: "transform, opacity" }}
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
                <motion.button 
                  className="btn" 
                  onClick={handleNextLevel} 
                  style={{ margin: '0 auto', width: '100%', justifyContent: 'center' }}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, type: 'spring', stiffness: 100, damping: 20, mass: 0.5 }}
                >
                  <Check size={18} />
                  Next Level
                </motion.button>
              ) : (
                <motion.button 
                  className="btn" 
                  onClick={handleReset} 
                  style={{ margin: '0 auto', width: '100%', justifyContent: 'center' }}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, type: 'spring', stiffness: 100, damping: 20, mass: 0.5 }}
                >
                  <RotateCcw size={18} />
                  Play Again
                </motion.button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
