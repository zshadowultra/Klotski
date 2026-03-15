import * as fs from 'fs';

let content = fs.readFileSync('./src/App.tsx', 'utf-8');

// 1. Rename dragOffsetX to dragTargetX
content = content.replace(
  "const dragOffsetX = useMotionValue(0);",
  "const dragTargetX = useMotionValue(0);"
);
content = content.replace(
  "const dragOffsetY = useMotionValue(0);",
  "const dragTargetY = useMotionValue(0);"
);

// 2. Update handlePointerDown
content = content.replace(
  "dragOffsetX.set(0);\n    dragOffsetY.set(0);",
  "const unit = cellSize + GAP;\n    dragTargetX.set(BOARD_PADDING + piece.x * unit);\n    dragTargetY.set(BOARD_PADDING + piece.y * unit);"
);

// 3. Update handlePointerMove
content = content.replace(
  "dragOffsetX.set(offsetX);\n      dragOffsetY.set(offsetY);",
  "dragTargetX.set(BOARD_PADDING + piece.x * unit + offsetX);\n      dragTargetY.set(BOARD_PADDING + piece.y * unit + offsetY);"
);

// 4. Update handlePointerUp
content = content.replace(
  "const clampedOffsetX = Math.max(minPx, Math.min(maxPx, dragOffsetX.get() || 0));",
  "const currentDx = dragTargetX.get() - (BOARD_PADDING + piece.x * unit);\n    const clampedOffsetX = Math.max(minPx, Math.min(maxPx, currentDx));"
);
content = content.replace(
  "const clampedOffsetY = Math.max(minPy, Math.min(maxPy, dragOffsetY.get() || 0));",
  "const currentDy = dragTargetY.get() - (BOARD_PADDING + piece.y * unit);\n    const clampedOffsetY = Math.max(minPy, Math.min(maxPy, currentDy));"
);

// 5. Update PieceComponent
content = content.replace(
  "dragOffsetX,",
  "dragTargetX,"
);
content = content.replace(
  "dragOffsetY,",
  "dragTargetY,"
);
content = content.replace(
  "dragOffsetX={dragOffsetX}",
  "dragTargetX={dragTargetX}"
);
content = content.replace(
  "dragOffsetY={dragOffsetY}",
  "dragTargetY={dragTargetY}"
);

content = content.replace(
  "const unsubscribeX = dragOffsetX.on('change', (offset: number) => {\n        targetX.set(baseRenderX + offset);\n      });",
  "const unsubscribeX = dragTargetX.on('change', (val: number) => {\n        targetX.set(val);\n      });"
);
content = content.replace(
  "const unsubscribeY = dragOffsetY.on('change', (offset: number) => {\n        targetY.set(baseRenderY + offset);\n      });",
  "const unsubscribeY = dragTargetY.on('change', (val: number) => {\n        targetY.set(val);\n      });"
);
content = content.replace(
  "}, [isDragging, baseRenderX, baseRenderY, dragOffsetX, dragOffsetY]);",
  "}, [isDragging, dragTargetX, dragTargetY]);"
);

fs.writeFileSync('./src/App.tsx', content);
