// Script para migrar datos de JSON a Supabase
// Ejecutar con: node migrate-to-supabase.js

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

// Configuración de Supabase (reemplazar con tus credenciales)
const SUPABASE_URL = 'TU_SUPABASE_URL'
const SUPABASE_SERVICE_KEY = 'TU_SUPABASE_SERVICE_KEY' // Service key, no anon key

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// Leer datos JSON
const productsData = JSON.parse(fs.readFileSync('./src/data/products.json', 'utf8'))
const categoriesData = JSON.parse(fs.readFileSync('./src/data/categories.json', 'utf8'))

async function migrateCategories() {
  console.log('🔄 Migrando categorías...')
  
  try {
    // Obtener categorías existentes
    const { data: existingCategories } = await supabase
      .from('categories')
      .select('slug')
    
    const existingSlugs = existingCategories?.map(cat => cat.slug) || []
    
    // Filtrar categorías que no existen
    const newCategories = categoriesData.categories.filter(
      cat => !existingSlugs.includes(cat.slug)
    )
    
    if (newCategories.length > 0) {
      const { data, error } = await supabase
        .from('categories')
        .insert(newCategories.map(cat => ({
          name: cat.name,
          slug: cat.slug,
          description: cat.description,
          sort_order: cat.sort_order
        })))
      
      if (error) throw error
      console.log(`✅ ${newCategories.length} categorías migradas`)
    } else {
      console.log('✅ Todas las categorías ya existen')
    }
  } catch (error) {
    console.error('❌ Error migrando categorías:', error)
  }
}

async function migrateProducts() {
  console.log('🔄 Migrando productos...')
  
  try {
    // Obtener categorías para mapear IDs
    const { data: categories } = await supabase
      .from('categories')
      .select('id, slug')
    
    const categoryMap = {}
    categories?.forEach(cat => {
      categoryMap[cat.slug] = cat.id
    })
    
    // Obtener productos existentes
    const { data: existingProducts } = await supabase
      .from('products')
      .select('id')
    
    const existingIds = existingProducts?.map(prod => prod.id) || []
    
    for (const product of productsData.products) {
      if (existingIds.includes(product.id)) {
        console.log(`⏭️ Producto ${product.id} ya existe, saltando...`)
        continue
      }
      
      // Insertar producto
      const { data: newProduct, error: productError } = await supabase
        .from('products')
        .insert({
          id: product.id,
          name: product.name,
          description: product.description,
          price: product.price,
          category_id: categoryMap[product.category],
          condition: product.condition,
          stock_quantity: 1, // Asumimos stock de 1 por defecto
          featured: product.featured,
          status: 'active',
          tags: product.tags || [],
          created_at: product.created_at,
          updated_at: product.updated_at
        })
        .select()
        .single()
      
      if (productError) {
        console.error(`❌ Error insertando producto ${product.id}:`, productError)
        continue
      }
      
      // Insertar imágenes
      if (product.images && product.images.length > 0) {
        const images = product.images.map((img, index) => ({
          product_id: product.id,
          url: img.url,
          alt_text: img.alt,
          is_primary: img.primary || index === 0,
          sort_order: index
        }))
        
        const { error: imagesError } = await supabase
          .from('product_images')
          .insert(images)
        
        if (imagesError) {
          console.error(`❌ Error insertando imágenes para ${product.id}:`, imagesError)
        }
      }
      
      // Insertar variantes/tallas
      if (product.sizes && product.sizes.length > 0) {
        const variants = product.sizes.map(size => ({
          product_id: product.id,
          size: size,
          stock_quantity: 1 // Stock por defecto
        }))
        
        const { error: variantsError } = await supabase
          .from('product_variants')
          .insert(variants)
        
        if (variantsError) {
          console.error(`❌ Error insertando variantes para ${product.id}:`, variantsError)
        }
      }
      
      console.log(`✅ Producto ${product.name} migrado exitosamente`)
    }
    
    console.log('✅ Migración de productos completada')
  } catch (error) {
    console.error('❌ Error migrando productos:', error)
  }
}

async function main() {
  console.log('🚀 Iniciando migración a Supabase...')
  
  if (SUPABASE_URL === 'TU_SUPABASE_URL' || SUPABASE_SERVICE_KEY === 'TU_SUPABASE_SERVICE_KEY') {
    console.error('❌ Por favor configura tus credenciales de Supabase en el script')
    process.exit(1)
  }
  
  await migrateCategories()
  await migrateProducts()
  
  console.log('🎉 Migración completada!')
}

main().catch(console.error)