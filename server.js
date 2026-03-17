import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// Railway will automatically inject its own PORT here
const PORT = process.env.PORT || 3000;

// Tell Express to serve your built frontend files
// Express natively knows to serve .ogg files as 'audio/ogg'
app.use(express.static(path.join(__dirname, 'dist')));

// SPA Fallback: If a route isn't found, send them back to the React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
