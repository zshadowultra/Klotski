import * as fs from 'fs';

let content = fs.readFileSync('./src/App.tsx', 'utf-8');

// 1. Extract processPointerMove
content = content.replace(
  "rAFRef.current = requestAnimationFrame(() => {\n      rAFRef.current = null;\n      if (!dragRef.current || !latestPointerRef.current) return;",
  "const processPointerMove = () => {\n      rAFRef.current = null;\n      if (!dragRef.current || !latestPointerRef.current) return;"
);

// 2. Call processPointerMove in rAF
content = content.replace(
  "dragTargetY.set(BOARD_PADDING + piece.y * unit + offsetY);\n    });",
  "dragTargetY.set(BOARD_PADDING + piece.y * unit + offsetY);\n    };\n\n    rAFRef.current = requestAnimationFrame(processPointerMove);"
);

// 3. Call processPointerMove in handlePointerUp
content = content.replace(
  "if (rAFRef.current !== null) {\n      cancelAnimationFrame(rAFRef.current);\n      rAFRef.current = null;\n    }",
  "if (rAFRef.current !== null) {\n      cancelAnimationFrame(rAFRef.current);\n      rAFRef.current = null;\n      processPointerMove();\n    }"
);

fs.writeFileSync('./src/App.tsx', content);
