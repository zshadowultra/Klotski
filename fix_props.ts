import * as fs from 'fs';

let content = fs.readFileSync('./src/App.tsx', 'utf-8');

// Remove dragTargetX and dragTargetY from PieceComponent props
content = content.replace(
  "  dragTargetX,\n  dragTargetY,\n",
  ""
);

content = content.replace(
  "  dragTargetX: any;\n  dragTargetY: any;\n",
  ""
);

// Remove the useEffect that listens to dragTargetX and dragTargetY
content = content.replace(
  "  useEffect(() => {\n    if (isDragging) {\n      const unsubscribeX = dragTargetX.on('change', (val: number) => {\n        // Optional: add subtle tilt based on velocity\n      });\n      const unsubscribeY = dragTargetY.on('change', (val: number) => {\n        \n      });\n      return () => {\n        unsubscribeX();\n        unsubscribeY();\n      };\n    }\n  }, [isDragging, dragTargetX, dragTargetY]);",
  ""
);

// Remove from the render
content = content.replace(
  "            dragTargetX={dragTargetX}\n            dragTargetY={dragTargetY}\n",
  ""
);

fs.writeFileSync('./src/App.tsx', content);
