import categoriesData from "@/data/categories.json";
import offersData from "@/data/offers.json";
import productsData from "@/data/products.json";
import type { Offer } from "@/models/entities/offer";
import type { Category, Product } from "@/models/entities/product";
import type { CategoryRepository, OfferRepository, ProductRepository } from "./interfaces";

export class JsonProductRepository implements ProductRepository {
  private readonly byId: Map<string, Product>;

  constructor(private readonly products: Product[] = productsData as Product[]) {
    this.byId = new Map(products.map((p) => [p.id, p]));
  }

  findAll(): Product[] {
    return this.products;
  }

  findById(id: string): Product | undefined {
    return this.byId.get(id);
  }
}

export class JsonCategoryRepository implements CategoryRepository {
  private readonly byId: Map<string, Category>;

  constructor(private readonly categories: Category[] = categoriesData as Category[]) {
    this.byId = new Map(categories.map((c) => [c.id, c]));
  }

  findAll(): Category[] {
    return this.categories;
  }

  findById(id: string): Category | undefined {
    return this.byId.get(id);
  }
}

export class JsonOfferRepository implements OfferRepository {
  constructor(private readonly offers: Offer[] = offersData as Offer[]) {}

  findActive(): Offer[] {
    return this.offers.filter((o) => o.active);
  }
}
