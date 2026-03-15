import * as fs from 'fs';

let content = fs.readFileSync('./src/App.tsx', 'utf-8');

// 1. Fix handlePointerDown
content = content.replace(
  "const handlePointerDown = (e: React.PointerEvent, piece: Piece) => {\n    if (isWon) return;",
  "const handlePointerDown = (e: React.PointerEvent, piece: Piece) => {\n    if (isWon || dragRef.current || e.button !== 0) return;"
);

// 2. Fix handlePointerUp releasePointerCapture
content = content.replace(
  "e.currentTarget.releasePointerCapture(e.pointerId);",
  "try {\n      if (e.currentTarget.hasPointerCapture(e.pointerId)) {\n        e.currentTarget.releasePointerCapture(e.pointerId);\n      }\n    } catch (err) {}"
);

fs.writeFileSync('./src/App.tsx', content);
