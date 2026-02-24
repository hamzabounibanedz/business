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
  if (mimetype === 'image/webp') return hex.slice(16, 24) === '57454250'; // bytes 8–11 = 'WEBP'
  if (mimetype === 'image/avif') return true; // AVIF detection complex, skip
  return false;
}

async function handler(req, res) {
  if (!requireAdmin(req, res)) return;
  if (!allowMethods(req, res, 'POST')) return;

  const form = formidable({ maxFileSize: MAX_MB, filter: ({ mimetype }) => ALLOWED.includes(mimetype) });
  let files;
  try {
    [, files] = await form.parse(req);
  } catch (parseErr) {
    return res.status(413).json({
      error: 'فشل تحليل الملف — تأكد أن الحجم لا يتجاوز 5MB ونوع الملف مدعوم'
    });
  }

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

  // Check bucket exists first — gives a clearer error message
  const { data: buckets, error: bucketsErr } = await supabaseAdmin.storage.listBuckets();
  if (bucketsErr) return res.status(500).json({ error: 'خطأ في التحقق من التخزين: ' + bucketsErr.message });

  const bucketExists = buckets?.some(b => b.name === bucket);
  if (!bucketExists) {
    // Auto-create the bucket as public
    const { error: createErr } = await supabaseAdmin.storage.createBucket(bucket, {
      public: true,
      fileSizeLimit: 5242880, // 5MB
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif']
    });
    if (createErr) {
      return res.status(500).json({
        error: `الحاوية "${bucket}" غير موجودة ولم يمكن إنشاؤها: ${createErr.message}`
      });
    }
  }

  const { error: uploadErr } = await supabaseAdmin.storage.from(bucket).upload(name, buffer, {
    contentType: file.mimetype, cacheControl: '31536000', upsert: false
  });
  if (uploadErr) {
    console.error('Supabase upload error:', JSON.stringify(uploadErr));
    return res.status(500).json({
      error: `فشل رفع الصورة: ${uploadErr.message}`,
      code: uploadErr.statusCode || uploadErr.error
    });
  }

  const { data: pub } = supabaseAdmin.storage.from(bucket).getPublicUrl(name);
  sendSuccess(res, { url: pub.publicUrl });
}

export default catchAsync(handler);
