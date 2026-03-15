import * as fs from 'fs';

let content = fs.readFileSync('./src/App.tsx', 'utf-8');

// 1. Add imports
content = content.replace(
  "import { motion, AnimatePresence } from 'motion/react';",
  "import { motion, AnimatePresence, useMotionValue, useSpring } from 'motion/react';"
);

// 2. Add PieceComponent
const pieceComponentCode = `
const PieceComponent = ({
  piece,
  isDragging,
  dragOffsetX,
  dragOffsetY,
  cellSize,
  GAP,
  BOARD_PADDING,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  staggerIndex,
  stagger,
  resetCount
}: any) => {
  const unit = cellSize + GAP;
  const baseRenderX = BOARD_PADDING + piece.x * unit;
  const baseRenderY = BOARD_PADDING + piece.y * unit;

  const targetX = useMotionValue(baseRenderX);
  const targetY = useMotionValue(baseRenderY + 20);

  const springConfig = isDragging 
    ? { stiffness: 400, damping: 25 } 
    : { stiffness: 500, damping: 40 };

  const x = useSpring(targetX, springConfig);
  const y = useSpring(targetY, springConfig);

  React.useEffect(() => {
    if (!isDragging) {
      if (stagger) {
        const timeout = setTimeout(() => {
          targetX.set(baseRenderX);
          targetY.set(baseRenderY);
        }, 30 * staggerIndex);
        return () => clearTimeout(timeout);
      } else {
        targetX.set(baseRenderX);
        targetY.set(baseRenderY);
      }
    }
  }, [baseRenderX, baseRenderY, isDragging, stagger, staggerIndex]);

  React.useEffect(() => {
    if (isDragging) {
      const unsubscribeX = dragOffsetX.on('change', (offset: number) => {
        targetX.set(baseRenderX + offset);
      });
      const unsubscribeY = dragOffsetY.on('change', (offset: number) => {
        targetY.set(baseRenderY + offset);
      });
      return () => {
        unsubscribeX();
        unsubscribeY();
      };
    }
  }, [isDragging, baseRenderX, baseRenderY, dragOffsetX, dragOffsetY]);

  return (
    <motion.div
      key={\`\${resetCount}-\${piece.id}\`}
      className={\`piece \${piece.type} \${isDragging ? 'dragging' : ''} \${piece.id === 'master' ? 'master' : ''}\`}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ 
        opacity: 1, 
        scale: 1, 
        zIndex: isDragging ? 20 : 1
      }}
      transition={{ type: 'spring', stiffness: 500, damping: 40, delay: stagger ? 0.03 * staggerIndex : 0 }}
      style={{
        x,
        y,
        width: piece.w * cellSize + (piece.w - 1) * GAP,
        height: piece.h * cellSize + (piece.h - 1) * GAP,
      }}
      onPointerDown={(e) => onPointerDown(e, piece)}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div className="piece-inner" />
    </motion.div>
  );
};
`;

content = content.replace(
  "export default function App() {",
  pieceComponentCode + "\nexport default function App() {"
);

// 3. Update dragRef type
content = content.replace(
  "const dragRef = useRef<{",
  "const dragRef = useRef<{\n    grid: boolean[][];"
);

// 4. Update getBounds
content = content.replace(
  "const getBounds = (piece: Piece, axis: 'x' | 'y', currentPieces: Piece[]) => {",
  "const getBounds = (piece: Piece, axis: 'x' | 'y', currentPieces: Piece[], cachedGrid?: boolean[][]) => {"
);
content = content.replace(
  "const grid = Array(BOARD_H).fill(null).map(() => Array(BOARD_W).fill(false));",
  "let grid = cachedGrid;\n    if (!grid) {\n      grid = Array(BOARD_H).fill(null).map(() => Array(BOARD_W).fill(false));"
);
content = content.replace(
  "grid[p.y + r][p.x + c] = true;",
  "grid![p.y + r][p.x + c] = true;"
);
content = content.replace(
  "grid[piece.y + r][piece.x - d]",
  "grid![piece.y + r][piece.x - d]"
);
content = content.replace(
  "grid[piece.y + r][piece.x + piece.w - 1 + d]",
  "grid![piece.y + r][piece.x + piece.w - 1 + d]"
);
content = content.replace(
  "grid[piece.y - d][piece.x + c]",
  "grid![piece.y - d][piece.x + c]"
);
content = content.replace(
  "grid[piece.y + piece.h - 1 + d][piece.x + c]",
  "grid![piece.y + piece.h - 1 + d][piece.x + c]"
);

// 5. Update handlePointerDown
content = content.replace(
  "dragRef.current = {\n      pieceId: piece.id,\n      pointerX: e.clientX,\n      pointerY: e.clientY,\n      pieces: pieces,\n      initialPieces: pieces,\n      hasMoved: false\n    };",
  `const grid = Array(BOARD_H).fill(null).map(() => Array(BOARD_W).fill(false));
    pieces.forEach(p => {
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
      pieces: pieces,
      initialPieces: pieces,
      hasMoved: false,
      grid
    };`
);

// 6. Update dragState to dragPieceId and MotionValues
content = content.replace(
  "const [dragState, setDragState] = useState<VisualDragState | null>(null);",
  "const [dragPieceId, setDragPieceId] = useState<string | null>(null);\n  const dragOffsetX = useMotionValue(0);\n  const dragOffsetY = useMotionValue(0);"
);

content = content.replace(
  "setDragState({\n      pieceId: piece.id,\n      offsetX: 0,\n      offsetY: 0\n    });",
  "dragOffsetX.set(0);\n    dragOffsetY.set(0);\n    setDragPieceId(piece.id);"
);

// 7. Update handlePointerMove
content = content.replace(/getBounds\(piece, 'x', newPieces\)/g, "getBounds(piece, 'x', newPieces, state.grid)");
content = content.replace(/getBounds\(piece, 'y', newPieces\)/g, "getBounds(piece, 'y', newPieces, state.grid)");

content = content.replace(
  "setDragState({\n        pieceId: state.pieceId,\n        offsetX,\n        offsetY\n      });",
  "dragOffsetX.set(offsetX);\n      dragOffsetY.set(offsetY);"
);
content = content.replace(
  "setDragState(null);",
  "setDragPieceId(null);"
);

// 8. Update handlePointerUp
content = content.replace(
  "const boundsX = getBounds(piece, 'x', finalPieces);",
  "const boundsX = getBounds(piece, 'x', finalPieces, state.grid);"
);
content = content.replace(
  "const boundsY = getBounds(piece, 'y', finalPieces);",
  "const boundsY = getBounds(piece, 'y', finalPieces, state.grid);"
);
content = content.replace(
  "setDragState(null);",
  "setDragPieceId(null);"
);

// 9. Update render loop
const oldRenderLoop = `{pieces.map(piece => {
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
              key={\`\${resetCount}-\${piece.id}\`}
              className={\`piece \${piece.type} \${isDragging ? 'dragging' : ''} \${piece.id === 'master' ? 'master' : ''}\`}
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
        })}`;

const newRenderLoop = `{pieces.map((piece, index) => (
          <PieceComponent
            key={\`\${resetCount}-\${piece.id}\`}
            piece={piece}
            isDragging={dragPieceId === piece.id}
            dragOffsetX={dragOffsetX}
            dragOffsetY={dragOffsetY}
            cellSize={cellSize}
            GAP={GAP}
            BOARD_PADDING={BOARD_PADDING}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            staggerIndex={index}
            stagger={stagger}
            resetCount={resetCount}
          />
        ))}`;

content = content.replace(oldRenderLoop, newRenderLoop);

fs.writeFileSync('./src/App.tsx', content);
