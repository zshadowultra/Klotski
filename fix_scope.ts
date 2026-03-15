import * as fs from 'fs';

let content = fs.readFileSync('./src/App.tsx', 'utf-8');

const processPointerMoveStr = `
  const processPointerMove = () => {
    rAFRef.current = null;
    if (!dragRef.current || !latestPointerRef.current) return;

    const state = dragRef.current;
    const currentPointerX = latestPointerRef.current.x;
    const currentPointerY = latestPointerRef.current.y;
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
          const bounds = getBounds(piece, 'x', newPieces, state.grid);
          if ((dir > 0 && bounds.maxDelta >= 1) || (dir < 0 && bounds.minDelta <= -1)) {
            newPieces = newPieces.map(p => p.id === piece.id ? { ...p, x: p.x + dir } : p);
            piece = newPieces.find(p => p.id === state.pieceId)!;
            pointerX += dir * unit;
            dx = currentPointerX - pointerX;
            moved = true;
            keepChecking = true;
          } else if (absDy > threshold) {
            const dirY = Math.sign(dy);
            const boundsY = getBounds(piece, 'y', newPieces, state.grid);
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
          const bounds = getBounds(piece, 'y', newPieces, state.grid);
          if ((dir > 0 && bounds.maxDelta >= 1) || (dir < 0 && bounds.minDelta <= -1)) {
            newPieces = newPieces.map(p => p.id === piece.id ? { ...p, y: p.y + dir } : p);
            piece = newPieces.find(p => p.id === state.pieceId)!;
            pointerY += dir * unit;
            dy = currentPointerY - pointerY;
            moved = true;
            keepChecking = true;
          } else if (absDx > threshold) {
            const dirX = Math.sign(dx);
            const boundsX = getBounds(piece, 'x', newPieces, state.grid);
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
    if (moved) state.hasMoved = true;

    if (moved) {
      setPieces(newPieces);
      piecesRef.current = newPieces;
      haptics.trigger('light');
      playMove();
      const master = newPieces.find(p => p.id === 'master')!;
      if (master.x === 1 && master.y === 3) {
        setIsWon(true);
        haptics.trigger('success');
        playWin();
        dragRef.current = null;
        setDragPieceId(null);
        return;
      }
    }

    dragTargetX.set(BOARD_PADDING + piece.x * unit + offsetX);
    dragTargetY.set(BOARD_PADDING + piece.y * unit + offsetY);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current || dragRef.current.pointerId !== e.pointerId) return;

    latestPointerRef.current = { x: e.clientX, y: e.clientY };

    if (rAFRef.current !== null) return;

    rAFRef.current = requestAnimationFrame(processPointerMove);
  };
`;

// Find the start of handlePointerMove
const startIdx = content.indexOf('const handlePointerMove = (e: React.PointerEvent) => {');
// Find the end of handlePointerMove
const endIdx = content.indexOf('const handlePointerUp = (e: React.PointerEvent) => {');

content = content.substring(0, startIdx) + processPointerMoveStr + '\n  ' + content.substring(endIdx);

fs.writeFileSync('./src/App.tsx', content);
