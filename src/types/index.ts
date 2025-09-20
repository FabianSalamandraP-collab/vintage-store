// Tipos principales para el proyecto Sur Occidente

export interface ProductImage {
  url: string;
  alt: string;
  primary: boolean;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  condition: string;
  featured: boolean;
  images: ProductImage[];
  sizes: string[];
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  sort_order: number;
}

export interface ContactInfo {
  whatsapp: string;
  email: string;
  phone: string;
  address: string;
  hours: string;
}

export interface SocialMedia {
  instagram: string;
  facebook: string;
  instagram_url: string;
  facebook_url: string;
}

export interface SEOConfig {
  keywords: string;
  author: string;
  og_image: string;
}

export interface BusinessInfo {
  founded: string;
  mission: string;
  vision: string;
  values: string[];
}

export interface SiteConfig {
  name: string;
  description: string;
  url: string;
  logo: string;
  tagline: string;
  contact: ContactInfo;
  social: SocialMedia;
  seo: SEOConfig;
  business: BusinessInfo;
}

export interface SiteData {
  site: SiteConfig;
}

// Tipos para filtros y búsqueda
export interface ProductFilter {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  condition?: string;
  sizes?: string[];
  tags?: string[];
}

export interface SearchParams {
  query?: string;
  filter?: ProductFilter;
  sortBy?: 'name' | 'price' | 'created_at';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// Tipos para WhatsApp integration
export interface WhatsAppMessage {
  product_id?: string;
  product_name?: string;
  message?: string;
  phone: string;
}

// Tipos para formularios
export interface ContactFormData {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  inquiry_type: 'general' | 'product' | 'support' | 'wholesale';
}

// Tipos para componentes
export interface ProductCardProps {
  product: Product;
  showQuickView?: boolean;
  className?: string;
}

export interface ProductFilterProps {
  categories: Category[];
  onFilterChange: (filter: ProductFilter) => void;
  currentFilter: ProductFilter;
}

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

// Tipos para utilidades
export interface PriceRange {
  min: number;
  max: number;
}

export interface ProductStats {
  total: number;
  byCategory: Record<string, number>;
  priceRange: PriceRange;
  conditions: string[];
  sizes: string[];
}