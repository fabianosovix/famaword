import express from 'express';
import { upload, fileUrl } from '../lib/upload.js';
import fs from 'fs';
import path from 'path';
import { config } from '../config.js';

const router = express.Router();

// POST /api/media/upload — upload a file (stored locally)
router.post('/upload', upload.single('file'), (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file provided' });
    const url = fileUrl(req.file.filename);
    // Return both file_url (public) and file_uri (for signed URLs) — same value for local storage
    res.json({
      file_url: url,
      file_uri: url,
      filename: req.file.filename,
      size: req.file.size,
    });
  } catch (e) { next(e); }
});

// POST /api/media/upload-private — alias (files are always local in self-hosted)
router.post('/upload-private', upload.single('file'), (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file provided' });
    const url = fileUrl(req.file.filename);
    res.json({ file_uri: url, file_url: url });
  } catch (e) { next(e); }
});

// POST /api/media/signed-url — returns the same URL (files are already public locally)
router.post('/signed-url', (req, res, next) => {
  try {
    const { file_uri } = req.body;
    if (!file_uri) return res.status(400).json({ message: 'file_uri is required' });
    res.json({ signed_url: file_uri });
  } catch (e) { next(e); }
});

// DELETE /api/media/:filename — delete an uploaded file
router.delete('/:filename', (req, res, next) => {
  try {
    const filePath = path.join(config.uploadsDir, req.params.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      res.json({ ok: true });
    } else {
      res.status(404).json({ message: 'File not found' });
    }
  } catch (e) { next(e); }
});

export default router;