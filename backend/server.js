import express from 'express';
import multer from 'multer';
import fs from 'fs';
import { computePairs } from './computePairs.js';

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use((_, res, next) => {           
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

app.post('/api/upload', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'File missing' });
  try {
    const data = await computePairs(fs.createReadStream(req.file.path));
    fs.unlink(req.file.path, () => {});      
    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`API ready on http://localhost:${PORT}`));