import { createClient } from '@supabase/supabase-js'

// Configuración de Supabase
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not found. Using fallback to JSON files.')
}

export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

// Función para verificar conexión
export async function testConnection() {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' }
  }
  
  try {
    const { data, error } = await supabase.from('products').select('count', { count: 'exact', head: true })
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}