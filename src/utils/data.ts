import type { Product, Category, ProductFilter, SiteConfig } from '../types';
import productsData from '../data/products.json';
import categoriesData from '../data/categories.json';
import siteConfigData from '../data/site-config.json';

// Obtener todos los productos
export function getAllProducts(): Product[] {
  return productsData.products;
}

// Obtener productos destacados
export function getFeaturedProducts(): Product[] {
  return productsData.products.filter(product => product.featured);
}

// Obtener producto por ID
export function getProductById(id: string): Product | undefined {
  return productsData.products.find(product => product.id === id);
}

// Obtener todas las categorías
export function getAllCategories(): Category[] {
  return categoriesData.categories.sort((a, b) => a.sort_order - b.sort_order);
}

// Obtener categoría por slug
export function getCategoryBySlug(slug: string): Category | undefined {
  return categoriesData.categories.find(category => category.slug === slug);
}

// Obtener configuración del sitio
export function getSiteConfig(): SiteConfig {
  return (siteConfigData as any).site as SiteConfig;
}

// Filtrar productos
export function filterProducts(products: Product[], filter: ProductFilter): Product[] {
  return products.filter(product => {
    // Filtro por categoría
    if (filter.category && product.category !== filter.category) {
      return false;
    }

    // Filtro por precio mínimo
    if (filter.minPrice && product.price < filter.minPrice) {
      return false;
    }

    // Filtro por precio máximo
    if (filter.maxPrice && product.price > filter.maxPrice) {
      return false;
    }

    // Filtro por condición
    if (filter.condition && product.condition !== filter.condition) {
      return false;
    }

    // Filtro por tallas
    if (filter.sizes && filter.sizes.length > 0) {
      const hasMatchingSize = filter.sizes.some(size => product.sizes.includes(size));
      if (!hasMatchingSize) {
        return false;
      }
    }

    // Filtro por tags
    if (filter.tags && filter.tags.length > 0) {
      const hasMatchingTag = filter.tags.some(tag => product.tags.includes(tag));
      if (!hasMatchingTag) {
        return false;
      }
    }

    // Filtro por género
    if (filter.gender && product.gender && product.gender !== filter.gender) {
      return false;
    }

    return true;
  });
}

// Buscar productos
export function searchProducts(products: Product[], query: string): Product[] {
  if (!query.trim()) {
    return products;
  }

  const searchTerm = query.toLowerCase().trim();
  
  return products.filter(product => {
    return (
      product.name.toLowerCase().includes(searchTerm) ||
      product.description.toLowerCase().includes(searchTerm) ||
      product.tags.some(tag => tag.toLowerCase().includes(searchTerm)) ||
      product.category.toLowerCase().includes(searchTerm)
    );
  });
}

// Ordenar productos
export function sortProducts(products: Product[], sortBy: string, sortOrder: 'asc' | 'desc' = 'asc'): Product[] {
  const sorted = [...products].sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'price':
        comparison = a.price - b.price;
        break;
      case 'created_at':
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        break;
      default:
        return 0;
    }

    return sortOrder === 'desc' ? -comparison : comparison;
  });

  return sorted;
}

// Paginar productos
export function paginateProducts(products: Product[], page: number = 1, limit: number = 12): {
  products: Product[];
  totalPages: number;
  currentPage: number;
  totalItems: number;
} {
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedProducts = products.slice(startIndex, endIndex);
  const totalPages = Math.ceil(products.length / limit);

  return {
    products: paginatedProducts,
    totalPages,
    currentPage: page,
    totalItems: products.length
  };
}

// Obtener productos relacionados
export function getRelatedProducts(product: Product, limit: number = 4): Product[] {
  const allProducts = getAllProducts();
  
  // Filtrar productos de la misma categoría, excluyendo el producto actual
  const relatedProducts = allProducts.filter(p => 
    p.id !== product.id && p.category === product.category
  );

  // Si no hay suficientes productos de la misma categoría, agregar otros productos
  if (relatedProducts.length < limit) {
    const otherProducts = allProducts.filter(p => 
      p.id !== product.id && p.category !== product.category
    );
    relatedProducts.push(...otherProducts);
  }

  return relatedProducts.slice(0, limit);
}

// Obtener estadísticas de productos
export function getProductStats(): {
  total: number;
  byCategory: Record<string, number>;
  priceRange: { min: number; max: number };
  conditions: string[];
  sizes: string[];
} {
  const products = getAllProducts();
  
  const byCategory: Record<string, number> = {};
  const conditions = new Set<string>();
  const sizes = new Set<string>();
  let minPrice = Infinity;
  let maxPrice = -Infinity;

  products.forEach(product => {
    // Contar por categoría
    byCategory[product.category] = (byCategory[product.category] || 0) + 1;
    
    // Recopilar condiciones
    conditions.add(product.condition);
    
    // Recopilar tallas
    product.sizes.forEach(size => sizes.add(size));
    
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
}

// Formatear precio
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(price);
}

export function generateWhatsAppURL(product: Product, message?: string): string {
  const phoneNumber = '573001234567'; // Número de WhatsApp de la tienda
  const baseMessage = message || `¡Hola! Me interesa este producto: ${product.name} - $${product.price.toLocaleString()}`;
  const encodedMessage = encodeURIComponent(baseMessage);
  return `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
}

// Obtener categoría por ID
export function getCategoryById(id: string): Category | undefined {
  return categoriesData.categories.find(cat => cat.id === id);
}

// Generar slug desde texto
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remover acentos
    .replace(/[^a-z0-9\s-]/g, '') // Remover caracteres especiales
    .trim()
    .replace(/\s+/g, '-') // Reemplazar espacios con guiones
    .replace(/-+/g, '-'); // Remover guiones múltiples
}