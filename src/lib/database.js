import { supabase } from './supabase.js';
import { getAllProducts as getJSONProducts, getProductById as getJSONProductById, getFeaturedProducts as getJSONFeaturedProducts, getAllCategories as getJSONCategories, getCategoryBySlug as getJSONCategoryBySlug, getCategoryById as getJSONCategoryById, getSiteConfig as getJSONSiteConfig, getProductStats as getJSONProductStats, formatPrice, generateWhatsAppURL, generateSlug, filterProducts, searchProducts as searchJSONProducts, sortProducts, paginateProducts, getRelatedProducts as getJSONRelatedProducts } from '../utils/data.ts'

// Función para verificar si Supabase está configurado
function isSupabaseConfigured() {
  return supabase && process.env.PUBLIC_SUPABASE_URL && process.env.PUBLIC_SUPABASE_ANON_KEY;
}

// Obtener todos los productos
export async function getAllProducts() {
  if (!isSupabaseConfigured()) {
    return getJSONProducts();
  }

  try {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        product_images (
          id,
          image_url,
          alt_text,
          is_primary,
          sort_order
        ),
        product_variants (
          id,
          size,
          stock_quantity,
          is_available
        ),
        categories (
          id,
          name,
          slug
        )
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.warn('Error fetching products from Supabase, falling back to JSON:', error);
    return getJSONProducts();
  }
}

// Obtener productos destacados
export async function getFeaturedProducts() {
  if (!isSupabaseConfigured()) {
    return getJSONFeaturedProducts();
  }

  try {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        product_images (
          id,
          image_url,
          alt_text,
          is_primary,
          sort_order
        ),
        product_variants (
          id,
          size,
          stock_quantity,
          is_available
        ),
        categories (
          id,
          name,
          slug
        )
      `)
      .eq('is_active', true)
      .eq('featured', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.warn('Error fetching featured products from Supabase, falling back to JSON:', error);
    return getJSONFeaturedProducts();
  }
}

// Obtener producto por ID
export async function getProductById(id) {
  if (!isSupabaseConfigured()) {
    return getJSONProductById(id);
  }

  try {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        product_images (
          id,
          image_url,
          alt_text,
          is_primary,
          sort_order
        ),
        product_variants (
          id,
          size,
          stock_quantity,
          is_available
        ),
        categories (
          id,
          name,
          slug
        )
      `)
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.warn('Error fetching product from Supabase, falling back to JSON:', error);
    return getJSONProductById(id);
  }
}

// Crear nuevo producto
export async function createProduct(productData) {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase no está configurado. No se pueden crear productos.');
  }

  try {
    const productToInsert = {
      name: productData.name,
      description: productData.description,
      price: productData.price,
      category_id: productData.category_id,
      condition: productData.condition,
      featured: productData.featured || false,
      tags: productData.tags || [],
      is_active: productData.is_active !== undefined ? productData.is_active : true,
      slug: generateSlug(productData.name),
      // Control de stock
      stock_quantity: productData.stock_quantity || 1,
      stock_status: productData.stock_status || 'available',
      min_stock_level: productData.min_stock_level || 1,
      max_stock_level: productData.max_stock_level || 100,
      // Metadatos
      sku: productData.sku,
      weight: productData.weight,
      dimensions: productData.dimensions
    };

    const { data, error } = await supabase
      .from('products')
      .insert([productToInsert])
      .select()
      .single();

    if (error) throw error;

    // Registrar en historial
    await logProductHistory(data.id, 'created', null, null, JSON.stringify(productToInsert), 'admin');

    // Registrar movimiento de stock inicial si hay cantidad
    if (productToInsert.stock_quantity > 0) {
      await logStockMovement(data.id, 'in', productToInsert.stock_quantity, 0, productToInsert.stock_quantity, 'initial_stock', null, 'admin');
    }

    return data;
  } catch (error) {
    console.error('Error creating product:', error);
    throw new Error('No se pudo crear el producto: ' + error.message);
  }
}

// Actualizar producto
export async function updateProduct(id, productData) {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase no está configurado. No se pueden actualizar productos.');
  }

  try {
    const updateData = {
      name: productData.name,
      description: productData.description,
      price: productData.price,
      category_id: productData.category_id,
      condition: productData.condition,
      featured: productData.featured || false,
      tags: productData.tags || [],
      updated_at: new Date().toISOString()
    };

    // Solo actualizar slug si cambió el nombre
    if (productData.name) {
      updateData.slug = generateSlug(productData.name);
    }

    const { data, error } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating product:', error);
    throw new Error('No se pudo actualizar el producto: ' + error.message);
  }
}

// Funciones para historial y stock
export async function logProductHistory(productId, action, fieldName, oldValue, newValue, changedBy, notes = null) {
  if (supabase) {
    try {
      const { error } = await supabase
        .from('product_history')
        .insert([{
          product_id: productId,
          action,
          field_name: fieldName,
          old_value: oldValue,
          new_value: newValue,
          changed_by: changedBy,
          notes
        }]);

      if (error) throw error;
    } catch (error) {
      console.error('Error logging product history:', error);
    }
  }
}

export async function logStockMovement(productId, movementType, quantity, previousStock, newStock, reason, referenceId = null, createdBy = 'admin', notes = null) {
  if (supabase) {
    try {
      const { error } = await supabase
        .from('stock_movements')
        .insert([{
          product_id: productId,
          movement_type: movementType,
          quantity,
          previous_stock: previousStock,
          new_stock: newStock,
          reason,
          reference_id: referenceId,
          created_by: createdBy,
          notes
        }]);

      if (error) throw error;
    } catch (error) {
      console.error('Error logging stock movement:', error);
    }
  }
}

// Función para actualizar stock
export async function updateStock(productId, newQuantity, reason = 'adjustment', referenceId = null, notes = null) {
  if (supabase) {
    try {
      // Obtener stock actual
      const { data: product, error: fetchError } = await supabase
        .from('products')
        .select('stock_quantity, min_stock_level')
        .eq('id', productId)
        .single();

      if (fetchError) throw fetchError;

      const previousStock = product.stock_quantity;
      const quantity = newQuantity - previousStock;

      // Determinar nuevo estado de stock
      let stockStatus = 'available';
      if (newQuantity === 0) {
        stockStatus = 'out_of_stock';
      } else if (newQuantity <= product.min_stock_level) {
        stockStatus = 'low_stock';
      }

      // Actualizar producto
      const { data, error } = await supabase
        .from('products')
        .update({ 
          stock_quantity: newQuantity,
          stock_status: stockStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', productId)
        .select()
        .single();

      if (error) throw error;

      // Registrar movimiento
      const movementType = quantity > 0 ? 'in' : quantity < 0 ? 'out' : 'adjustment';
      await logStockMovement(productId, movementType, Math.abs(quantity), previousStock, newQuantity, reason, referenceId, 'admin', notes);

      // Registrar en historial
      await logProductHistory(productId, 'stock_changed', 'stock_quantity', previousStock.toString(), newQuantity.toString(), 'admin', notes);

      return data;
    } catch (error) {
      console.error('Error updating stock:', error);
      throw new Error('No se pudo actualizar el stock: ' + error.message);
    }
  }
  
  throw new Error('La actualización de stock requiere una base de datos configurada');
}

// Eliminar producto (soft delete)
export async function deleteProduct(productId) {
  if (supabase) {
    try {
      // Soft delete: marcar como inactivo en lugar de eliminar
      const { data, error } = await supabase
        .from('products')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', productId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error deleting product:', error);
      throw new Error('No se pudo eliminar el producto: ' + error.message);
    }
  }
  
  // Fallback: no se puede eliminar en JSON estático
  throw new Error('La eliminación de productos requiere una base de datos configurada');
}

// Obtener productos por categoría
export async function getProductsByCategory(categorySlug) {
  if (!isSupabaseConfigured()) {
    const allProducts = getJSONProducts();
    return allProducts.filter(product => product.category === categorySlug);
  }

  try {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        product_images (
          id,
          image_url,
          alt_text,
          is_primary,
          sort_order
        ),
        product_variants (
          id,
          size,
          stock_quantity,
          is_available
        ),
        categories!inner (
          id,
          name,
          slug
        )
      `)
      .eq('is_active', true)
      .eq('categories.slug', categorySlug)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.warn('Error fetching products by category from Supabase, falling back to JSON:', error);
    const allProducts = getJSONProducts();
    return allProducts.filter(product => product.category === categorySlug);
  }
}

// Buscar productos
export async function searchProducts(query) {
  if (!isSupabaseConfigured()) {
    const allProducts = getJSONProducts();
    return searchJSONProducts(allProducts, query);
  }

  try {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        product_images (
          id,
          image_url,
          alt_text,
          is_primary,
          sort_order
        ),
        product_variants (
          id,
          size,
          stock_quantity,
          is_available
        ),
        categories (
          id,
          name,
          slug
        )
      `)
      .eq('is_active', true)
      .or(`name.ilike.%${query}%,description.ilike.%${query}%,tags.cs.{${query}}`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.warn('Error searching products in Supabase, falling back to JSON:', error);
    const allProducts = getJSONProducts();
    return searchJSONProducts(allProducts, query);
  }
}

// Obtener todas las categorías
export async function getAllCategories() {
  if (!isSupabaseConfigured()) {
    return getJSONCategories();
  }

  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.warn('Error fetching categories from Supabase, falling back to JSON:', error);
    return getJSONCategories();
  }
}

// Obtener categoría por slug
export async function getCategoryBySlug(slug) {
  if (!isSupabaseConfigured()) {
    return getJSONCategoryBySlug(slug);
  }

  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.warn('Error fetching category by slug from Supabase, falling back to JSON:', error);
    return getJSONCategoryBySlug(slug);
  }
}

// Obtener categoría por ID
export async function getCategoryById(id) {
  if (!isSupabaseConfigured()) {
    return getJSONCategoryById(id);
  }

  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.warn('Error fetching category by ID from Supabase, falling back to JSON:', error);
    return getJSONCategoryById(id);
  }
}

// Obtener configuración del sitio
export function getSiteConfig() {
  // La configuración del sitio sigue siendo estática por ahora
  return getJSONSiteConfig();
}

// Obtener estadísticas de productos
export async function getProductStats() {
  if (!isSupabaseConfigured()) {
    return getJSONProductStats();
  }

  try {
    const products = await getAllProducts();
    
    const byCategory = {};
    const conditions = new Set();
    const sizes = new Set();
    let minPrice = Infinity;
    let maxPrice = -Infinity;

    products.forEach(product => {
      // Contar por categoría
      const categoryName = product.categories?.name || product.category;
      byCategory[categoryName] = (byCategory[categoryName] || 0) + 1;
      
      // Recopilar condiciones
      conditions.add(product.condition);
      
      // Recopilar tallas de las variantes
      if (product.product_variants) {
        product.product_variants.forEach(variant => sizes.add(variant.size));
      } else if (product.sizes) {
        product.sizes.forEach(size => sizes.add(size));
      }
      
      // Calcular rango de precios
      minPrice = Math.min(minPrice, product.price);
      maxPrice = Math.max(maxPrice, product.price);
    });

    return {
      total: products.length,
      byCategory,
      priceRange: { min: minPrice, max: maxPrice },
      conditions: Array.from(conditions),
      sizes: Array.from(sizes).sort()
    };
  } catch (error) {
    console.warn('Error getting product stats from Supabase, falling back to JSON:', error);
    return getJSONProductStats();
  }
}

// Obtener productos relacionados
export async function getRelatedProducts(product, limit = 4) {
  if (!isSupabaseConfigured()) {
    return getJSONRelatedProducts(product, limit);
  }

  try {
    const categoryId = product.category_id || product.categories?.id;
    
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        product_images (
          id,
          image_url,
          alt_text,
          is_primary,
          sort_order
        ),
        categories (
          id,
          name,
          slug
        )
      `)
      .eq('is_active', true)
      .eq('category_id', categoryId)
      .neq('id', product.id)
      .limit(limit);

    if (error) throw error;
    
    let relatedProducts = data || [];
    
    // Si no hay suficientes productos de la misma categoría, agregar otros
    if (relatedProducts.length < limit) {
      const { data: otherProducts, error: otherError } = await supabase
        .from('products')
        .select(`
          *,
          product_images (
            id,
            image_url,
            alt_text,
            is_primary,
            sort_order
          ),
          categories (
            id,
            name,
            slug
          )
        `)
        .eq('is_active', true)
        .neq('id', product.id)
        .neq('category_id', categoryId)
        .limit(limit - relatedProducts.length);

      if (!otherError && otherProducts) {
        relatedProducts = [...relatedProducts, ...otherProducts];
      }
    }

    return relatedProducts.slice(0, limit);
  } catch (error) {
    console.warn('Error fetching related products from Supabase, falling back to JSON:', error);
    return getJSONRelatedProducts(product, limit);
  }
}

// Re-exportar funciones utilitarias que no necesitan base de datos
export { formatPrice, generateWhatsAppURL, generateSlug, filterProducts, sortProducts, paginateProducts };