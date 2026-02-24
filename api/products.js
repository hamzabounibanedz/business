import { supabaseAdmin } from './_lib/supabase.js';
import { catchAsync } from './_lib/catchAsync.js';
import { allowMethods } from './_lib/guard.js';
import { sendSuccess, sendError } from './_lib/response.js';

async function handler(req, res) {
  if (!allowMethods(req, res, 'GET')) return;

  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');

  const { data, error } = await supabaseAdmin
    .from('products')
    .select('id,sku,name_ar,price,inventory,description_ar,images,sizes,tags,is_featured,sort_order,categories(id,name_ar,slug)')
    .eq('is_active', true)
    .order('is_featured', { ascending: false })
    .order('sort_order',  { ascending: true })
    .order('created_at',  { ascending: false });

  if (error) return sendError(res, error);

  const products = (data || []).map(p => ({
    id:          p.id,
    sku:         p.sku,
    name:        p.name_ar,
    description: p.description_ar || '',
    price:       p.price,
    inventory:   p.inventory,
    images:      p.images  || [],
    sizes:       p.sizes   || [],
    tags: [
      ...(p.tags || []),
      ...(p.categories ? [p.categories.slug] : [])
    ],
    category: p.categories ? { id: p.categories.id, name: p.categories.name_ar, slug: p.categories.slug } : null,
    isFeatured: p.is_featured
  }));

  return sendSuccess(res, products);
}

export default catchAsync(handler);
