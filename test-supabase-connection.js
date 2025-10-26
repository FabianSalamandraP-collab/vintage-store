// Test de conexión a Supabase
import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('🔍 Probando conexión a Supabase...')
console.log('URL:', SUPABASE_URL)
console.log('Service Key (primeros 20 chars):', SUPABASE_SERVICE_KEY?.substring(0, 20) + '...')

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function testConnection() {
  try {
    // Probar una consulta simple
    console.log('🔄 Probando consulta a la tabla categories...')
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .limit(1)
    
    if (error) {
      console.error('❌ Error en la consulta:', error)
      return false
    }
    
    console.log('✅ Conexión exitosa!')
    console.log('Datos obtenidos:', data)
    return true
  } catch (err) {
    console.error('❌ Error de conexión:', err)
    return false
  }
}

testConnection()