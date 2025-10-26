export const prerender = false;

import { supabase } from '../../../lib/supabase.js';

export async function POST({ request }) {
  try {
    const { productIds } = await request.json();
    
    if (!Array.isArray(productIds) || productIds.length === 0) {
      return new Response(JSON.stringify({ error: 'Product IDs array is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verificar estado de productos
    const { data, error } = await supabase
      .from('products')
      .select('id, status, stock_quantity, stock_status')
      .in('id', productIds)
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching product status:', error);
      return new Response(JSON.stringify({ error: 'Database error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Crear mapa de estados
    const statusMap = {};
    data.forEach(product => {
      statusMap[product.id] = {
        status: product.status,
        stock_quantity: product.stock_quantity,
        stock_status: product.stock_status,
        available: product.status === 'active' && product.stock_quantity > 0
      };
    });

    return new Response(JSON.stringify({ products: statusMap }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('API Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}