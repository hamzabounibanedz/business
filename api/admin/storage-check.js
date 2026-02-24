import { requireAdmin } from '../_lib/auth.js';
import { supabaseAdmin } from '../_lib/supabase.js';
import { catchAsync } from '../_lib/catchAsync.js';

async function handler(req, res) {
  if (!requireAdmin(req, res)) return;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'product-images';
  const { data: buckets, error } = await supabaseAdmin.storage.listBuckets();
  if (error) return res.status(500).json({ error: error.message, buckets: null });
  const found = buckets?.find(b => b.name === bucket);
  return res.status(200).json({
    bucketName: bucket,
    exists: !!found,
    isPublic: found?.public || false,
    allBuckets: buckets?.map(b => ({ name: b.name, public: b.public }))
  });
}

export default catchAsync(handler);
