import * as fs from 'fs';

let content = fs.readFileSync('./src/App.tsx', 'utf-8');

// Add dragState to PieceComponent props
content = content.replace(
  "  isDragging,\n  cellSize,",
  "  isDragging,\n  dragState,\n  cellSize,"
);

// Replace the useEffect that listens to dragTargetX and dragTargetY
content = content.replace(
  "  React.useEffect(() => {\n    if (isDragging) {\n      const unsubscribeX = dragTargetX.on('change', (val: number) => {\n        targetX.set(val);\n      });\n      const unsubscribeY = dragTargetY.on('change', (val: number) => {\n        targetY.set(val);\n      });\n      return () => {\n        unsubscribeX();\n        unsubscribeY();\n      };\n    }\n  }, [isDragging, dragTargetX, dragTargetY]);",
  "  React.useEffect(() => {\n    if (isDragging && dragState) {\n      targetX.set(dragState.x);\n      targetY.set(dragState.y);\n    }\n  }, [isDragging, dragState, targetX, targetY]);"
);

// Pass dragState to PieceComponent in App.tsx
content = content.replace(
  "            isDragging={dragState?.pieceId === piece.id}",
  "            isDragging={dragState?.pieceId === piece.id}\n            dragState={dragState}"
);

fs.writeFileSync('./src/App.tsx', content);
