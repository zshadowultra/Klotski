import * as fs from 'fs';

let content = fs.readFileSync('./src/App.tsx', 'utf-8');

// 1. Add pointerId to dragRef type
content = content.replace(
  "hasMoved: boolean;\n  } | null>(null);",
  "hasMoved: boolean;\n    pointerId: number;\n  } | null>(null);"
);

// 2. Add pointerId to dragRef.current initialization
content = content.replace(
  "hasMoved: false,\n      grid\n    };",
  "hasMoved: false,\n      grid,\n      pointerId: e.pointerId\n    };"
);

// 3. Check pointerId in handlePointerMove
content = content.replace(
  "const handlePointerMove = (e: React.PointerEvent) => {\n    if (!dragRef.current) return;",
  "const handlePointerMove = (e: React.PointerEvent) => {\n    if (!dragRef.current || dragRef.current.pointerId !== e.pointerId) return;"
);

// 4. Check pointerId in handlePointerUp
content = content.replace(
  "const handlePointerUp = (e: React.PointerEvent) => {\n    if (rAFRef.current !== null) {\n      cancelAnimationFrame(rAFRef.current);\n      rAFRef.current = null;\n    }\n    if (!dragRef.current) return;",
  "const handlePointerUp = (e: React.PointerEvent) => {\n    if (!dragRef.current || dragRef.current.pointerId !== e.pointerId) return;\n    if (rAFRef.current !== null) {\n      cancelAnimationFrame(rAFRef.current);\n      rAFRef.current = null;\n    }"
);

fs.writeFileSync('./src/App.tsx', content);
