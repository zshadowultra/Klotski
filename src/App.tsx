import React, { useState, useEffect, useMemo } from 'react';
import { RotateCcw, Undo2, Check } from 'lucide-react';
import { WebHaptics } from 'web-haptics';
import { motion, AnimatePresence } from 'motion/react';

type PieceType = 'master' | 'v' | 'h' | 's';

interface Piece {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  type: PieceType;
}

// Classic "Forget-me-not" Layout
const INITIAL_PIECES: Piece[] = [
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
];

const BOARD_W = 4;
const BOARD_H = 5;
const GAP = 6;

interface DragState {
  pieceId: string;
  startX: number;
  startY: number;
  pointerX: number;
  pointerY: number;
  currentPointerX: number;
  currentPointerY: number;
  axis: 'x' | 'y' | null;
  offsetPx: number;
  initialPieces: Piece[];
  hasMoved: boolean;
}

export default function App() {
  const [pieces, setPieces] = useState<Piece[]>(INITIAL_PIECES);
  const [history, setHistory] = useState<Piece[][]>([]);
  const [moves, setMoves] = useState(0);
  const [isWon, setIsWon] = useState(false);
  const [resetCount, setResetCount] = useState(0);
  const [cellSize, setCellSize] = useState(70);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [stagger, setStagger] = useState(true);
  
  const haptics = useMemo(() => new WebHaptics(), []);

  useEffect(() => {
    if (stagger) {
      const t = setTimeout(() => setStagger(false), 1000);
      return () => clearTimeout(t);
    }
  }, [stagger]);

  useEffect(() => {
    const updateSize = () => {
      const padding = 48; // 24px padding on each side
      const headerHeight = 140; // Approximate header + controls height
      const maxW = Math.min(window.innerWidth - padding, 500);
      const maxH = Math.min(window.innerHeight - headerHeight - padding, 700);
      
      const sizeW = (maxW - (BOARD_W + 1) * GAP) / BOARD_W;
      const sizeH = (maxH - (BOARD_H + 1) * GAP) / BOARD_H;
      
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
    setDragState({
      pieceId: piece.id,
      startX: piece.x,
      startY: piece.y,
      pointerX: e.clientX,
      pointerY: e.clientY,
      currentPointerX: e.clientX,
      currentPointerY: e.clientY,
      axis: null,
      offsetPx: 0,
      initialPieces: pieces,
      hasMoved: false
    });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragState) return;

    const currentPointerX = e.clientX;
    const currentPointerY = e.clientY;
    const dx = currentPointerX - dragState.pointerX;
    const dy = currentPointerY - dragState.pointerY;

    const unit = cellSize + GAP;
    const threshold = unit * 0.6; // 60% of a cell to commit mid-drag

    let moved = false;
    let newPieces = pieces;
    let newPointerX = dragState.pointerX;
    let newPointerY = dragState.pointerY;

    const piece = pieces.find(p => p.id === dragState.pieceId)!;

    // Check for mid-drag logical commit
    if (Math.abs(dx) > threshold && Math.abs(dx) > Math.abs(dy)) {
      const dir = Math.sign(dx);
      const bounds = getBounds(piece, 'x', pieces);
      if ((dir > 0 && bounds.maxDelta >= 1) || (dir < 0 && bounds.minDelta <= -1)) {
        newPieces = pieces.map(p => p.id === piece.id ? { ...p, x: p.x + dir } : p);
        newPointerX += dir * unit;
        moved = true;
      }
    } else if (Math.abs(dy) > threshold && Math.abs(dy) > Math.abs(dx)) {
      const dir = Math.sign(dy);
      const bounds = getBounds(piece, 'y', pieces);
      if ((dir > 0 && bounds.maxDelta >= 1) || (dir < 0 && bounds.minDelta <= -1)) {
        newPieces = pieces.map(p => p.id === piece.id ? { ...p, y: p.y + dir } : p);
        newPointerY += dir * unit;
        moved = true;
      }
    }

    if (moved) {
      setPieces(newPieces);
      haptics.trigger('light');
      
      setDragState({
        ...dragState,
        pointerX: newPointerX,
        pointerY: newPointerY,
        currentPointerX,
        currentPointerY,
        offsetPx: 0,
        axis: null,
        hasMoved: true
      });

      const master = newPieces.find(p => p.id === 'master')!;
      if (master.x === 1 && master.y === 3) {
        setIsWon(true);
        haptics.trigger('success');
        setDragState(null);
      }
      return;
    }

    // Visual drag update
    const boundsX = getBounds(piece, 'x', pieces);
    const boundsY = getBounds(piece, 'y', pieces);

    let activeAxis = dragState.axis;
    const lockThreshold = 8;

    if (!activeAxis) {
      if (Math.abs(dx) > lockThreshold && Math.abs(dx) > Math.abs(dy)) activeAxis = 'x';
      else if (Math.abs(dy) > lockThreshold && Math.abs(dy) > Math.abs(dx)) activeAxis = 'y';
    } else {
      if (activeAxis === 'x' && Math.abs(dx) < 15 && Math.abs(dy) > 15) activeAxis = 'y';
      if (activeAxis === 'y' && Math.abs(dy) < 15 && Math.abs(dx) > 15) activeAxis = 'x';
    }

    let offsetPx = 0;
    if (activeAxis === 'x') {
      const minPx = boundsX.minDelta * unit;
      const maxPx = boundsX.maxDelta * unit;
      let rawOffset = dx;
      if (rawOffset < minPx) offsetPx = minPx + (rawOffset - minPx) * 0.15;
      else if (rawOffset > maxPx) offsetPx = maxPx + (rawOffset - maxPx) * 0.15;
      else offsetPx = rawOffset;
    } else if (activeAxis === 'y') {
      const minPx = boundsY.minDelta * unit;
      const maxPx = boundsY.maxDelta * unit;
      let rawOffset = dy;
      if (rawOffset < minPx) offsetPx = minPx + (rawOffset - minPx) * 0.15;
      else if (rawOffset > maxPx) offsetPx = maxPx + (rawOffset - maxPx) * 0.15;
      else offsetPx = rawOffset;
    }

    setDragState(prev => prev ? { ...prev, currentPointerX, currentPointerY, axis: activeAxis, offsetPx } : null);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!dragState) return;
    e.currentTarget.releasePointerCapture(e.pointerId);

    let finalPieces = pieces;
    let didMoveNow = false;

    if (dragState.axis) {
      const unit = cellSize + GAP;
      const piece = pieces.find(p => p.id === dragState.pieceId)!;
      const bounds = getBounds(piece, dragState.axis, pieces);
      const minPx = bounds.minDelta * unit;
      const maxPx = bounds.maxDelta * unit;
      
      const clampedOffset = Math.max(minPx, Math.min(maxPx, dragState.offsetPx));
      const logicalDelta = Math.round(clampedOffset / unit);

      if (logicalDelta !== 0) {
        finalPieces = pieces.map(p => {
          if (p.id === dragState.pieceId) {
            return {
              ...p,
              x: p.x + (dragState.axis === 'x' ? logicalDelta : 0),
              y: p.y + (dragState.axis === 'y' ? logicalDelta : 0)
            };
          }
          return p;
        });
        setPieces(finalPieces);
        didMoveNow = true;
        haptics.trigger('light');
      }
    }

    if (dragState.hasMoved || didMoveNow) {
      setHistory(prev => [...prev, dragState.initialPieces]);
      setMoves(m => m + 1);
      
      const master = finalPieces.find(p => p.id === 'master')!;
      if (master.x === 1 && master.y === 3) {
        setIsWon(true);
        haptics.trigger('success');
      }
    } else {
      haptics.trigger('soft');
    }
    
    setDragState(null);
  };

  const handleUndo = () => {
    if (history.length === 0 || isWon) return;
    haptics.trigger('light');
    const prev = history[history.length - 1];
    setPieces(prev);
    setHistory(h => h.slice(0, -1));
    setMoves(m => m - 1);
  };

  const handleReset = () => {
    haptics.trigger('medium');
    setPieces(INITIAL_PIECES);
    setHistory([]);
    setMoves(0);
    setIsWon(false);
    setResetCount(c => c + 1);
    setStagger(true);
  };

  return (
    <div className="app-container">
      <div className="header">
        <div className="title-group">
          <span className="title-badge">Classic</span>
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
          width: BOARD_W * cellSize + (BOARD_W + 1) * GAP,
          height: BOARD_H * cellSize + (BOARD_H + 1) * GAP,
        }}
      >
        <div
          className="board-grid"
          style={{
            backgroundSize: `${cellSize + GAP}px ${cellSize + GAP}px`,
            backgroundPosition: `${GAP}px ${GAP}px`
          }}
        />
        <div
          className="exit-indicator"
          style={{
            left: GAP + cellSize + GAP,
            width: 2 * cellSize + GAP,
          }}
        />
        
        {pieces.map(piece => {
          const isDragging = dragState?.pieceId === piece.id;
          const unit = cellSize + GAP;

          let renderX = piece.x * unit + GAP;
          let renderY = piece.y * unit + GAP;

          if (isDragging && dragState) {
            if (dragState.axis === 'x') {
              renderX += dragState.offsetPx;
              renderY += (dragState.currentPointerY - dragState.pointerY) * 0.03;
            } else if (dragState.axis === 'y') {
              renderY += dragState.offsetPx;
              renderX += (dragState.currentPointerX - dragState.pointerX) * 0.03;
            } else {
              renderX += (dragState.currentPointerX - dragState.pointerX) * 0.15;
              renderY += (dragState.currentPointerY - dragState.pointerY) * 0.15;
            }
          }

          return (
            <motion.div
              key={`${resetCount}-${piece.id}`}
              className={`piece ${piece.type} ${isDragging ? 'dragging' : ''} ${piece.id === 'master' ? 'master' : ''}`}
              initial={{ opacity: 0, scale: 0.8, y: renderY + 20, x: renderX }}
              animate={{ 
                opacity: 1, 
                scale: isDragging ? 1.04 : 1, 
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
                  <span className="win-stat-val">81</span>
                  <span className="win-stat-lbl">Optimal</span>
                </div>
              </div>

              <button className="btn" onClick={handleReset} style={{ margin: '0 auto', width: '100%', justifyContent: 'center' }}>
                <RotateCcw size={18} />
                Play Again
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
