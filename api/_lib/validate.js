export function validateProduct(body) {
  const { name_ar, sku, price, inventory } = body;
  if (!name_ar?.trim()) return { valid: false, error: 'اسم المنتج بالعربية مطلوب' };
  if (name_ar.trim().length > 200) return { valid: false, error: 'الاسم طويل جداً' };
  if (!sku?.trim()) return { valid: false, error: 'رمز المنتج (SKU) مطلوب' };
  if (!/^[A-Za-z0-9\-_]{1,50}$/.test(sku.trim()))
    return { valid: false, error: 'SKU: حروف وأرقام وشرطات فقط (50 حرف كحد)' };
  const priceNum = Number(price);
  if (!price || isNaN(priceNum) || priceNum <= 0 || !Number.isInteger(priceNum))
    return { valid: false, error: 'السعر يجب أن يكون رقماً صحيحاً موجباً' };
  const invNum = Number(inventory);
  if (inventory === undefined || inventory === null || isNaN(invNum) || invNum < 0 || !Number.isInteger(invNum))
    return { valid: false, error: 'المخزون يجب أن يكون رقماً صحيحاً غير سالب' };

  return {
    valid: true,
    data: {
      name_ar:       name_ar.trim().substring(0, 200),
      name_en:       typeof body.name_en === 'string' ? body.name_en.trim().substring(0, 200) : null,
      sku:           sku.trim().toUpperCase(),
      description_ar:typeof body.description_ar === 'string' ? body.description_ar.trim().substring(0, 2000) : null,
      price:         priceNum,
      inventory:     invNum,
      category_id:   body.category_id || null,
      sizes:         Array.isArray(body.sizes) ? body.sizes.filter(s => typeof s === 'string').map(s => s.trim()).filter(Boolean) : [],
      images:        Array.isArray(body.images) ? body.images.filter(u => typeof u === 'string' && u.startsWith('https')).slice(0, 10) : [],
      tags:          Array.isArray(body.tags)   ? body.tags.filter(t => typeof t === 'string').map(t => t.trim().toLowerCase()).filter(Boolean).slice(0, 20) : [],
      is_active:     body.is_active !== false,
      is_featured:   body.is_featured === true,
      sort_order:    Number(body.sort_order) || 0
    }
  };
}

const SLUG_REGEX = /^[a-z0-9-]{1,60}$/;

/**
 * Validates category body: name_ar (required, max 100), slug (required, /^[a-z0-9-]{1,60}$/),
 * name_en (optional, max 100), sort_order (optional integer >= 0).
 * @param {Record<string, unknown>} body
 * @returns {{ valid: true, data: object } | { valid: false, error: string }}
 */
export function validateCategory(body) {
  const { name_ar, slug, name_en, sort_order } = body || {};
  if (!name_ar?.trim()) return { valid: false, error: 'اسم التصنيف مطلوب' };
  if (name_ar.trim().length > 100) return { valid: false, error: 'الاسم طويل جداً' };
  if (!slug || typeof slug !== 'string') return { valid: false, error: 'الرمز مطلوب' };
  if (!SLUG_REGEX.test(slug.trim())) return { valid: false, error: 'الرمز: حروف إنجليزية صغيرة وأرقام وشرطة فقط (60 حرف كحد)' };
  const sortNum = Number(sort_order);
  if (sort_order !== undefined && sort_order !== null && (isNaN(sortNum) || sortNum < 0 || !Number.isInteger(sortNum)))
    return { valid: false, error: 'ترتيب العرض يجب أن يكون رقماً صحيحاً غير سالب' };

  return {
    valid: true,
    data: {
      name_ar: name_ar.trim().substring(0, 100),
      slug: slug.trim(),
      name_en: typeof name_en === 'string' ? name_en.trim().substring(0, 100) || null : null,
      sort_order: Number.isInteger(sortNum) && sortNum >= 0 ? sortNum : 0
    }
  };
}
