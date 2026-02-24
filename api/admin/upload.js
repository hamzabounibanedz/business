/**
 * Admin image upload: multipart form field "image" → Supabase Storage.
 * Bucket is auto-created if missing. Requires bodyParser: false for formidable.
 */
import { requireAdminAndMethods } from '../_lib/adminGuard.js';
import { supabaseAdmin } from '../_lib/supabase.js';
import { catchAsync } from '../_lib/catchAsync.js';
import { sendSuccess } from '../_lib/response.js';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';

export const config = { api: { bodyParser: false } };

const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB
const BUCKET_DEFAULT = 'product-images';

/** Verify file signature matches declared MIME (security). */
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
  if (!requireAdminAndMethods(req, res, 'POST')) return;

  const form = formidable({
    maxFileSize: MAX_FILE_BYTES,
    filter: ({ mimetype }) => ALLOWED_MIMES.includes(mimetype),
  });
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
  if (!ALLOWED_MIMES.includes(file.mimetype)) return res.status(400).json({ error: 'نوع الملف غير مدعوم (JPEG/PNG/WebP/AVIF)' });

  const buffer = fs.readFileSync(file.filepath);
  if (!verifyMagicBytes(buffer, file.mimetype)) {
    return res.status(400).json({ error: 'محتوى الملف لا يطابق النوع المُعلن' });
  }

  const ext = path.extname(file.originalFilename || '.jpg').toLowerCase() || '.jpg';
  const name = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}${ext}`;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || BUCKET_DEFAULT;

  const { data: buckets, error: bucketsErr } = await supabaseAdmin.storage.listBuckets();
  if (bucketsErr) return res.status(500).json({ error: 'خطأ في التحقق من التخزين: ' + bucketsErr.message });

  const bucketExists = buckets?.some(b => b.name === bucket);
  if (!bucketExists) {
    const { error: createErr } = await supabaseAdmin.storage.createBucket(bucket, {
      public: true,
      fileSizeLimit: MAX_FILE_BYTES,
      allowedMimeTypes: ALLOWED_MIMES,
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
