import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { LEVELS } from "./src/levels.ts";
import { isSolvable } from "./src/solver.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  console.log("Checking levels solvability...");
  let allSolvable = true;
  for (let i = 0; i < LEVELS.length; i++) {
    if (!isSolvable(LEVELS[i])) {
      console.error(`Level ${i + 1} is NOT solvable!`);
      allSolvable = false;
    }
  }
  if (allSolvable) {
    console.log(`All ${LEVELS.length} levels are solvable!`);
  } else {
    console.warn("Some levels are not solvable. Please check the logs.");
  }

  const app = express();
  const PORT = process.env.PORT || 3000;

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    // Express static natively serves .ogg files, but let's be explicit
    express.static.mime.define({'audio/ogg': ['ogg']});
    app.use(express.static(distPath, {
      setHeaders: (res, path) => {
        if (path.endsWith('.ogg')) {
          res.setHeader('Content-Type', 'audio/ogg');
        }
      }
    }));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
