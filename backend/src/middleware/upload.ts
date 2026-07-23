import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Cross-platform temp directory
const uploadDir = process.platform === 'win32'
  ? path.join(process.env.TEMP || 'C:/temp', 'nexora-uploads')
  : '/tmp/uploads';

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`),
});

export const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    const ok = file.mimetype === 'application/pdf' && path.extname(file.originalname).toLowerCase() === '.pdf';
    cb(ok ? null : new Error('File type not supported. Please upload a PDF up to 10 MB.') as any, ok);
  },
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});
