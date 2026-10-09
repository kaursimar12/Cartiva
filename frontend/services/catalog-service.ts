import type { Offer } from "@/models/entities/offer";
import type { Category, Product } from "@/models/entities/product";
import type { CategoryRepository, OfferRepository, ProductRepository } from "@/models/repositories/interfaces";

export interface ProductFilters {
  query?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  brand?: string;
  available?: boolean;
}

export type ProductSort = "relevance" | "price-asc" | "price-desc" | "name";

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s-]/g, " ").replace(/\s+/g, " ").trim();
}

/** Simple plural handling so "tomatoes" matches "tomato" and "liquids" matches "liquid". */
function termVariants(term: string): string[] {
  const variants = [term];
  if (term.length > 4 && term.endsWith("es")) variants.push(term.slice(0, -2));
  if (term.length > 3 && term.endsWith("s")) variants.push(term.slice(0, -1));
  return variants;
}

/** Catalog queries: lookup, search (FR-04), filtering (FR-05) and sorting. */
export class CatalogService {
  constructor(
    private readonly products: ProductRepository,
    private readonly categories: CategoryRepository,
    private readonly offers: OfferRepository,
  ) {}

  getAllProducts(): Product[] {
    return this.products.findAll();
  }

  getProduct(id: string): Product | undefined {
    return this.products.findById(id);
  }

  getProductsByCategory(categoryId: string): Product[] {
    return this.products.findAll().filter((p) => p.category === categoryId);
  }

  getFeaturedProducts(): Product[] {
    return this.products.findAll().filter((p) => p.featured);
  }

  getCategories(): Category[] {
    return this.categories.findAll();
  }

  getCategory(id: string): Category | undefined {
    return this.categories.findById(id);
  }

  getActiveOffers(): Offer[] {
    return this.offers.findActive();
  }

  /** Partial-match search over name, brand, category and tags. Every query term must match. */
  search(query: string, source: Product[] = this.products.findAll()): Product[] {
    const fullQuery = normalize(query);
    if (!fullQuery) return [];
    const terms = fullQuery.split(" ");

    return source
      .map((product) => ({ product, score: this.score(product, terms, fullQuery) }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score || a.product.price - b.product.price)
      .map((r) => r.product);
  }

  filter(filters: ProductFilters, source: Product[] = this.products.findAll()): Product[] {
    let result = filters.query ? this.search(filters.query, source) : source;

    if (filters.category) result = result.filter((p) => p.category === filters.category);
    if (filters.minPrice !== undefined) result = result.filter((p) => p.price >= filters.minPrice!);
    if (filters.maxPrice !== undefined) result = result.filter((p) => p.price <= filters.maxPrice!);
    if (filters.brand) {
      const brand = filters.brand.toLowerCase();
      result = result.filter((p) => p.brand?.toLowerCase() === brand);
    }
    if (filters.available) result = result.filter((p) => p.stock);

    return result;
  }

  sort(products: Product[], sort: ProductSort): Product[] {
    if (sort === "relevance") return products;
    const sorted = [...products];
    if (sort === "price-asc") sorted.sort((a, b) => a.price - b.price);
    if (sort === "price-desc") sorted.sort((a, b) => b.price - a.price);
    if (sort === "name") sorted.sort((a, b) => a.name.localeCompare(b.name));
    return sorted;
  }

  getBrands(products: Product[]): string[] {
    return [...new Set(products.map((p) => p.brand).filter((b): b is string => Boolean(b)))].sort();
  }

  private searchableText(product: Product): string {
    const categoryName = this.categories.findById(product.category)?.name ?? product.category;
    return normalize([product.name, product.brand ?? "", categoryName, ...product.tags].join(" "));
  }

  /** Higher is better; 0 means no match. */
  private score(product: Product, terms: string[], fullQuery: string): number {
    const haystack = this.searchableText(product);
    const name = normalize(product.name);
    let score = 0;

    for (const term of terms) {
      const variants = termVariants(term);
      if (!variants.some((v) => haystack.includes(v))) return 0;
      score += variants.some((v) => name.includes(v)) ? 2 : 1;
    }
    if (name.startsWith(fullQuery)) score += 3;
    return score;
  }
}
