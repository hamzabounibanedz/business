/**
 * Admin storage diagnostic: GET returns bucket existence and list (for debugging upload issues).
 */
import { requireAdminAndMethods } from '../_lib/adminGuard.js';
import { supabaseAdmin } from '../_lib/supabase.js';
import { catchAsync } from '../_lib/catchAsync.js';

const BUCKET_DEFAULT = 'product-images';

async function handler(req, res) {
  if (!requireAdminAndMethods(req, res, 'GET')) return;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || BUCKET_DEFAULT;
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
