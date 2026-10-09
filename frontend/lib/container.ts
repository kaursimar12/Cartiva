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
 * Swap a repository here (e.g. JSON → database) without touching services or views.
 */
export const productRepository = new JsonProductRepository();
const categoryRepository = new JsonCategoryRepository();
const offerRepository = new JsonOfferRepository();
const deliveryPolicyRepository = new JsonDeliveryPolicyRepository();

validateCatalog(productRepository, categoryRepository, offerRepository, deliveryPolicyRepository);

export const catalogService = new CatalogService(productRepository, categoryRepository, offerRepository);

export const pricingService = new PricingService(
  productRepository,
  offerRepository,
  defaultDiscountStrategies,
  deliveryPolicyRepository.get(),
);
