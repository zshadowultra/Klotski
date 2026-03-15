import * as fs from 'fs';

let content = fs.readFileSync('./src/App.tsx', 'utf-8');

content = content.replace(
  "pointerId: number;\n  } | null>(null);",
  "pointerId: number;\n    offsetX: number;\n    offsetY: number;\n  } | null>(null);"
);

fs.writeFileSync('./src/App.tsx', content);
