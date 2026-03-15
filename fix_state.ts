import * as fs from 'fs';

let content = fs.readFileSync('./src/App.tsx', 'utf-8');

// 1. Add piecesRef
content = content.replace(
  "const [pieces, setPieces] = useState<Piece[]>([]);",
  "const [pieces, setPieces] = useState<Piece[]>([]);\n  const piecesRef = useRef<Piece[]>([]);"
);

// 2. Update setPieces calls
content = content.replace(
  "setPieces(newPieces);",
  "setPieces(newPieces);\n        piecesRef.current = newPieces;"
);
content = content.replace(
  "setPieces(finalPieces);",
  "setPieces(finalPieces);\n      piecesRef.current = finalPieces;"
);
content = content.replace(
  "setPieces(prev);",
  "setPieces(prev);\n    piecesRef.current = prev;"
);
content = content.replace(
  "setPieces(levelPieces);",
  "setPieces(levelPieces);\n    piecesRef.current = levelPieces;"
);

// 3. Use piecesRef in handlePointerDown
content = content.replace(
  "pieces.forEach(p => {",
  "piecesRef.current.forEach(p => {"
);
content = content.replace(
  "pieces: pieces,",
  "pieces: piecesRef.current,"
);
content = content.replace(
  "initialPieces: pieces,",
  "initialPieces: piecesRef.current,"
);

fs.writeFileSync('./src/App.tsx', content);
