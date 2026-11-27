import { brandBundle } from "@/lib/brand";
import { validateCatalog } from "@/models/repositories/catalog-validator";
import {
  JsonCategoryRepository,
  JsonDeliveryPolicyRepository,
  JsonOfferRepository,
  JsonProductRepository,
} from "@/models/repositories/json-catalog-repository";
import { CatalogService } from "@/services/catalog-service";
import { defaultDiscountStrategies } from "@/services/pricing/discount-strategies";
import { PricingService } from "@/services/pricing/pricing-service";

/**
 * Composition root for server-safe services (catalog + pricing).
 * The catalog comes from the deployment's brand (NEXT_PUBLIC_BRAND, see lib/brand.ts).
 * Swap a repository here (e.g. JSON → database) without touching services or views.
 */
export const productRepository = new JsonProductRepository(brandBundle.products);
const categoryRepository = new JsonCategoryRepository(brandBundle.categories);
const offerRepository = new JsonOfferRepository(brandBundle.offers);
const deliveryPolicyRepository = new JsonDeliveryPolicyRepository(brandBundle.delivery);

validateCatalog(productRepository, categoryRepository, offerRepository, deliveryPolicyRepository);

export const catalogService = new CatalogService(productRepository, categoryRepository, offerRepository);

export const pricingService = new PricingService(
  productRepository,
  offerRepository,
  defaultDiscountStrategies,
  deliveryPolicyRepository.get(),
);
