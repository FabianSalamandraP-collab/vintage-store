// Script para migrar datos de JSON a Supabase
// Ejecutar con: node migrate-to-supabase.js

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'

// Función para generar slug
function generateSlug(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remover acentos
    .replace(/[^a-z0-9\s-]/g, '') // Remover caracteres especiales
    .replace(/\s+/g, '-') // Reemplazar espacios con guiones
    .replace(/-+/g, '-') // Remover guiones múltiples
    .trim('-') // Remover guiones al inicio y final
}

// Credenciales desde .env
const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Faltan variables de entorno: PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY/SUPABASE_SERVICE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// Leer datos JSON
const productsPath = path.resolve('./src/data/products.json')
const categoriesPath = path.resolve('./src/data/categories.json')

if (!fs.existsSync(productsPath) || !fs.existsSync(categoriesPath)) {
  console.error('❌ No se encontraron los archivos JSON en src/data (products.json y categories.json)')
  process.exit(1)
}

const productsData = JSON.parse(fs.readFileSync(productsPath, 'utf8'))
const categoriesData = JSON.parse(fs.readFileSync(categoriesPath, 'utf8'))

async function migrateCategories() {
  console.log('🔄 Migrando categorías...')
  try {
    const { data: existingCategories, error: selectError } = await supabase
      .from('categories')
      .select('slug')
    if (selectError) throw selectError

    const existingSlugs = existingCategories?.map(cat => cat.slug) || []
    const newCategories = categoriesData.categories.filter(cat => !existingSlugs.includes(cat.slug))

    if (newCategories.length > 0) {
      const { error } = await supabase
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
    const { data: categories, error: catError } = await supabase
      .from('categories')
      .select('id, slug')
    if (catError) throw catError

    const categoryMap = {}
    categories?.forEach(cat => { categoryMap[cat.slug] = cat.id })

    const { data: existingProducts, error: prodError } = await supabase
      .from('products')
      .select('sku')
    if (prodError) throw prodError

    const existingSkus = existingProducts?.map(prod => prod.sku) || []

    for (const product of productsData.products) {
      if (existingSkus.includes(product.id)) {
        console.log(`⏭️ Producto ${product.id} ya existe, saltando...`)
        continue
      }

      const productId = randomUUID()
      const productSlug = generateSlug(product.name)
      const { error: insertProductError } = await supabase
        .from('products')
        .insert({
          id: productId,
          sku: product.id,
          name: product.name,
          slug: productSlug,
          description: product.description,
          price: product.price,
          category_id: categoryMap[product.category],
          condition: product.condition,
          stock_quantity: 1,
          featured: product.featured,
          status: 'active',
          tags: product.tags || [],
          created_at: product.created_at,
          updated_at: product.updated_at
        })
      if (insertProductError) {
        console.error(`❌ Error insertando producto ${product.id}:`, insertProductError)
        continue
      }

      if (product.images?.length) {
        const images = product.images.map((img, index) => ({
          product_id: productId,
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

      if (product.sizes?.length) {
        const variants = product.sizes.map((size, index) => ({
          product_id: productId,
          size,
          stock_quantity: 1
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
  await migrateCategories()
  await migrateProducts()
  console.log('🎉 Migración completada!')
}

main().catch(console.error)