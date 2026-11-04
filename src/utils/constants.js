/**
 * App-wide constants
 */
export const DEFAULT_PRODUCT_IMAGE = "/images/default-product.svg";

/**
 * Static Customer Categories in required priority order:
 * 1. Super Stockist (SS)
 * 2. Dealer (D)
 * 3. Retailer (R)
 * 4. Customer (C)
 */
export const STATIC_CUSTOMER_CATEGORIES = [
  { id: "SS", code: "SS", name: "Super Stockist (SS)", shortName: "Super Stockist", tierKey: "superStockistPrice", color: "#7C3AED" },
  { id: "D", code: "D", name: "Dealer (D)", shortName: "Dealer", tierKey: "dealerPrice", color: "#059669" },
  { id: "R", code: "R", name: "Retailer (R)", shortName: "Retailer", tierKey: "retailerPrice", color: "#2563EB" },
  { id: "C", code: "C", name: "Customer (C)", shortName: "Customer", tierKey: "customerPrice", color: "#DC2626" }
];
