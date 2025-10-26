// Script para limpiar datos erróneos de la base de datos
import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function cleanDatabase() {
  console.log('🧹 Limpiando base de datos...')
  
  try {
    // Limpiar imágenes de productos
    const { error: imagesError } = await supabase
      .from('product_images')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Eliminar todos
    
    if (imagesError) console.error('Error limpiando imágenes:', imagesError)
    else console.log('✅ Imágenes limpiadas')

    // Limpiar variantes de productos
    const { error: variantsError } = await supabase
      .from('product_variants')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Eliminar todos
    
    if (variantsError) console.error('Error limpiando variantes:', variantsError)
    else console.log('✅ Variantes limpiadas')

    // Limpiar productos
    const { error: productsError } = await supabase
      .from('products')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Eliminar todos
    
    if (productsError) console.error('Error limpiando productos:', productsError)
    else console.log('✅ Productos limpiados')

    console.log('🎉 Base de datos limpiada exitosamente')
  } catch (error) {
    console.error('❌ Error limpiando base de datos:', error)
  }
}

cleanDatabase()