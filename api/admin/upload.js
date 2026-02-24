import { requireAdmin } from '../_lib/auth.js';
import { supabaseAdmin } from '../_lib/supabase.js';
import { catchAsync } from '../_lib/catchAsync.js';
import { allowMethods } from '../_lib/guard.js';
import { sendSuccess, sendError } from '../_lib/response.js';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';

export const config = { api: { bodyParser: false } };

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
const MAX_MB  = 5 * 1024 * 1024;

// Verify actual file signature, not just the header claim
function verifyMagicBytes(buffer, mimetype) {
  const bytes = buffer.slice(0, 12);
  const hex = bytes.toString('hex');
  if (mimetype === 'image/jpeg') return hex.startsWith('ffd8ff');
  if (mimetype === 'image/png')  return hex.startsWith('89504e47');
  if (mimetype === 'image/webp') return hex.slice(8, 16) === '57454250'; // 'WEBP'
  if (mimetype === 'image/avif') return true; // AVIF detection complex, skip
  return false;
}

async function handler(req, res) {
  if (!requireAdmin(req, res)) return;
  if (!allowMethods(req, res, 'POST')) return;

  const form = formidable({ maxFileSize: MAX_MB, filter: ({ mimetype }) => ALLOWED.includes(mimetype) });
  const [, files] = await form.parse(req);

  const fileArr = files.image;
  const file = Array.isArray(fileArr) ? fileArr[0] : fileArr;
  if (!file) return res.status(400).json({ error: 'لم يتم اختيار صورة' });
  if (!ALLOWED.includes(file.mimetype)) return res.status(400).json({ error: 'نوع الملف غير مدعوم (JPEG/PNG/WebP/AVIF)' });

  const buffer = fs.readFileSync(file.filepath);
  if (!verifyMagicBytes(buffer, file.mimetype)) {
    return res.status(400).json({ error: 'محتوى الملف لا يطابق النوع المُعلن' });
  }

  const ext = path.extname(file.originalFilename || '.jpg').toLowerCase() || '.jpg';
  const name = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}${ext}`;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'product-images';

  const { error } = await supabaseAdmin.storage.from(bucket).upload(name, buffer, {
    contentType: file.mimetype, cacheControl: '31536000', upsert: false
  });
  if (error) return res.status(500).json({ error: 'فشل رفع الصورة: ' + error.message });

  const { data: pub } = supabaseAdmin.storage.from(bucket).getPublicUrl(name);
  sendSuccess(res, { url: pub.publicUrl });
}

export default catchAsync(handler);
