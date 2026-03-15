import * as fs from 'fs';

let content = fs.readFileSync('./src/App.tsx', 'utf-8');

// 1. Add offsetX and offsetY to dragRef initialization
content = content.replace(
  "grid,\n      pointerId: e.pointerId\n    };",
  "grid,\n      pointerId: e.pointerId,\n      offsetX: 0,\n      offsetY: 0\n    };"
);

// 2. Update processPointerMove to save offsetX and offsetY
content = content.replace(
  "state.pointerX = pointerX;\n    state.pointerY = pointerY;\n    state.pieces = newPieces;",
  "state.pointerX = pointerX;\n    state.pointerY = pointerY;\n    state.pieces = newPieces;\n    state.offsetX = offsetX;\n    state.offsetY = offsetY;"
);

// 3. Update handlePointerUp to use state.offsetX and state.offsetY
content = content.replace(
  "const currentDx = dragState ? dragState.x - (BOARD_PADDING + piece.x * unit) : 0;\n    const clampedOffsetX = Math.max(minPx, Math.min(maxPx, currentDx));\n    const currentDy = dragState ? dragState.y - (BOARD_PADDING + piece.y * unit) : 0;\n    const clampedOffsetY = Math.max(minPy, Math.min(maxPy, currentDy));",
  "const currentDx = state.offsetX;\n    const clampedOffsetX = Math.max(minPx, Math.min(maxPx, currentDx));\n    const currentDy = state.offsetY;\n    const clampedOffsetY = Math.max(minPy, Math.min(maxPy, currentDy));"
);

fs.writeFileSync('./src/App.tsx', content);
