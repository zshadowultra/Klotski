import * as fs from 'fs';

let content = fs.readFileSync('./src/App.tsx', 'utf-8');

// 1. Remove useMotionValue
content = content.replace("import { motion, useMotionValue } from 'framer-motion';", "import { motion } from 'framer-motion';");

// 2. Remove dragTargetX and dragTargetY
content = content.replace("const dragTargetX = useMotionValue(0);\n  const dragTargetY = useMotionValue(0);", "");

// 3. Add dragState
content = content.replace(
  "const [dragPieceId, setDragPieceId] = useState<string | null>(null);",
  "const [dragState, setDragState] = useState<{ pieceId: string, x: number, y: number } | null>(null);"
);

// 4. Update handlePointerDown
content = content.replace(
  "dragTargetX.set(BOARD_PADDING + piece.x * unit);\n    dragTargetY.set(BOARD_PADDING + piece.y * unit);\n    setDragPieceId(piece.id);",
  "setDragState({\n      pieceId: piece.id,\n      x: BOARD_PADDING + piece.x * unit,\n      y: BOARD_PADDING + piece.y * unit\n    });"
);

// 5. Update processPointerMove
content = content.replace(
  "dragTargetX.set(BOARD_PADDING + piece.x * unit + offsetX);\n    dragTargetY.set(BOARD_PADDING + piece.y * unit + offsetY);",
  "setDragState({\n      pieceId: piece.id,\n      x: BOARD_PADDING + piece.x * unit + offsetX,\n      y: BOARD_PADDING + piece.y * unit + offsetY\n    });"
);

// 6. Update handlePointerUp
content = content.replace(
  "const currentDx = dragTargetX.get() - (BOARD_PADDING + piece.x * unit);\n    const clampedOffsetX = Math.max(minPx, Math.min(maxPx, currentDx));\n    const currentDy = dragTargetY.get() - (BOARD_PADDING + piece.y * unit);\n    const clampedOffsetY = Math.max(minPy, Math.min(maxPy, currentDy));",
  "const currentDx = dragState ? dragState.x - (BOARD_PADDING + piece.x * unit) : 0;\n    const clampedOffsetX = Math.max(minPx, Math.min(maxPx, currentDx));\n    const currentDy = dragState ? dragState.y - (BOARD_PADDING + piece.y * unit) : 0;\n    const clampedOffsetY = Math.max(minPy, Math.min(maxPy, currentDy));"
);

content = content.replace(
  "dragRef.current = null;\n        setDragPieceId(null);",
  "dragRef.current = null;\n        setDragState(null);"
);

content = content.replace(
  "dragRef.current = null;\n    setDragPieceId(null);",
  "dragRef.current = null;\n    setDragState(null);"
);

// 7. Update motion.div
content = content.replace(
  "const isDragging = dragPieceId === piece.id;",
  "const isDragging = dragState?.pieceId === piece.id;\n            const visualX = isDragging ? dragState.x : BOARD_PADDING + piece.x * unit;\n            const visualY = isDragging ? dragState.y : BOARD_PADDING + piece.y * unit;"
);

content = content.replace(
  "animate={{\n              x: isDragging ? undefined : BOARD_PADDING + piece.x * unit,\n              y: isDragging ? undefined : BOARD_PADDING + piece.y * unit,\n            }}\n            style={{\n              width: piece.w * unit - GAP,\n              height: piece.h * unit - GAP,\n              x: isDragging ? dragTargetX : BOARD_PADDING + piece.x * unit,\n              y: isDragging ? dragTargetY : BOARD_PADDING + piece.y * unit,\n              zIndex: isDragging ? 10 : 1,\n              touchAction: 'none'\n            }}\n            transition={{ type: 'spring', stiffness: 400, damping: 30 }}",
  "animate={{ x: visualX, y: visualY }}\n            style={{\n              width: piece.w * unit - GAP,\n              height: piece.h * unit - GAP,\n              zIndex: isDragging ? 10 : 1,\n              touchAction: 'none'\n            }}\n            transition={isDragging ? { duration: 0 } : { type: 'spring', stiffness: 400, damping: 30 }}"
);

fs.writeFileSync('./src/App.tsx', content);
