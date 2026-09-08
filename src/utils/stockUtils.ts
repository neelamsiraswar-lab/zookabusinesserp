import { Product, LowStockSettings, LowStockBehavior } from '../types';

export const DEFAULT_LOW_STOCK_SETTINGS: LowStockSettings = {
  enabled: true,
  defaultThreshold: 5,
  criticalStockThreshold: 2,
  allowNegativeStock: true,
  negativeStockBehavior: 'WARN',
  blockBillingOnOutOfStock: false,
  warnOnLowStockBilling: true,
  showLowStockBadge: true,
  showDashboardBanner: true,
  autoReorderSuggestions: true,
  defaultReorderMultiplier: 20,
  notifyOnBilling: true,
  emailAlertDigest: false,
};

export const normalizeLowStockSettings = (settings?: Partial<LowStockSettings> | null): LowStockSettings => {
  if (!settings) return { ...DEFAULT_LOW_STOCK_SETTINGS };

  const behavior = (['WARN', 'BLOCK', 'ALLOW'].includes(settings.negativeStockBehavior as string)
    ? settings.negativeStockBehavior
    : DEFAULT_LOW_STOCK_SETTINGS.negativeStockBehavior) as LowStockBehavior;

  const allowNegative = typeof settings.allowNegativeStock === 'boolean' 
    ? settings.allowNegativeStock 
    : behavior !== 'BLOCK';

  const isBlocked = behavior === 'BLOCK' || !allowNegative || settings.blockBillingOnOutOfStock === true;
  const isWarn = typeof settings.warnOnLowStockBilling === 'boolean' 
    ? settings.warnOnLowStockBilling 
    : (behavior === 'WARN' || settings.notifyOnBilling !== false);

  return {
    enabled: typeof settings.enabled === 'boolean' ? settings.enabled : DEFAULT_LOW_STOCK_SETTINGS.enabled,
    defaultThreshold: typeof settings.defaultThreshold === 'number' && settings.defaultThreshold >= 0
      ? settings.defaultThreshold 
      : DEFAULT_LOW_STOCK_SETTINGS.defaultThreshold,
    criticalStockThreshold: typeof settings.criticalStockThreshold === 'number' && settings.criticalStockThreshold >= 0
      ? settings.criticalStockThreshold 
      : DEFAULT_LOW_STOCK_SETTINGS.criticalStockThreshold,
    allowNegativeStock: allowNegative,
    negativeStockBehavior: behavior,
    blockBillingOnOutOfStock: isBlocked,
    warnOnLowStockBilling: isWarn,
    showLowStockBadge: typeof settings.showLowStockBadge === 'boolean' 
      ? settings.showLowStockBadge 
      : DEFAULT_LOW_STOCK_SETTINGS.showLowStockBadge,
    showDashboardBanner: typeof settings.showDashboardBanner === 'boolean' 
      ? settings.showDashboardBanner 
      : DEFAULT_LOW_STOCK_SETTINGS.showDashboardBanner,
    autoReorderSuggestions: typeof settings.autoReorderSuggestions === 'boolean' 
      ? settings.autoReorderSuggestions 
      : DEFAULT_LOW_STOCK_SETTINGS.autoReorderSuggestions,
    defaultReorderMultiplier: typeof settings.defaultReorderMultiplier === 'number' && settings.defaultReorderMultiplier > 0
      ? settings.defaultReorderMultiplier 
      : DEFAULT_LOW_STOCK_SETTINGS.defaultReorderMultiplier,
    notifyOnBilling: typeof settings.notifyOnBilling === 'boolean' 
      ? settings.notifyOnBilling 
      : DEFAULT_LOW_STOCK_SETTINGS.notifyOnBilling,
    emailAlertDigest: typeof settings.emailAlertDigest === 'boolean' 
      ? settings.emailAlertDigest 
      : DEFAULT_LOW_STOCK_SETTINGS.emailAlertDigest,
  };
};

/**
 * Returns the effective threshold for an individual product, using individual threshold if set (>0),
 * or falling back to company default threshold.
 */
export const getProductStockThreshold = (prod: Product, settings?: LowStockSettings): number => {
  const norm = normalizeLowStockSettings(settings);
  if (typeof prod.minStockAlert === 'number' && prod.minStockAlert > 0) {
    return prod.minStockAlert;
  }
  return norm.defaultThreshold;
};

/**
 * Evaluates whether a product is in low stock condition.
 */
export const isProductLowStock = (prod: Product, settings?: LowStockSettings): boolean => {
  const norm = normalizeLowStockSettings(settings);
  if (!norm.enabled || prod.isService) return false;
  const threshold = getProductStockThreshold(prod, norm);
  return prod.currentStock <= threshold;
};

/**
 * Evaluates whether a product is critically low (below emergency critical threshold).
 */
export const isProductCriticalStock = (prod: Product, settings?: LowStockSettings): boolean => {
  const norm = normalizeLowStockSettings(settings);
  if (!norm.enabled || prod.isService) return false;
  return prod.currentStock > 0 && prod.currentStock <= norm.criticalStockThreshold;
};

/**
 * Checks if a physical product is completely out of stock (<= 0).
 */
export const isProductOutOfStock = (prod: Product): boolean => {
  if (prod.isService) return false;
  return prod.currentStock <= 0;
};

/**
 * Computes full inventory health summary metrics for a catalog.
 */
export interface InventoryStockHealthSummary {
  totalItems: number;
  physicalItems: number;
  serviceItems: number;
  healthyItems: number;
  lowStockItems: number;
  criticalItems: number;
  outOfStockItems: number;
  totalStockQuantity: number;
  totalValuation: number;
  estimatedReorderCost: number;
}

export const computeInventoryHealth = (
  products: Product[],
  settings?: LowStockSettings
): InventoryStockHealthSummary => {
  const norm = normalizeLowStockSettings(settings);
  let totalItems = products.length;
  let physicalItems = 0;
  let serviceItems = 0;
  let healthyItems = 0;
  let lowStockItems = 0;
  let criticalItems = 0;
  let outOfStockItems = 0;
  let totalStockQuantity = 0;
  let totalValuation = 0;
  let estimatedReorderCost = 0;

  for (const p of products) {
    if (p.isService) {
      serviceItems++;
      continue;
    }
    physicalItems++;
    totalStockQuantity += p.currentStock;
    totalValuation += p.currentStock * (p.purchasePrice || 0);

    const threshold = getProductStockThreshold(p, norm);
    if (p.currentStock <= 0) {
      outOfStockItems++;
      lowStockItems++;
      const suggestedReorder = norm.defaultReorderMultiplier;
      estimatedReorderCost += suggestedReorder * (p.purchasePrice || 0);
    } else if (p.currentStock <= norm.criticalStockThreshold) {
      criticalItems++;
      lowStockItems++;
      const suggestedReorder = Math.max(1, (threshold * 2) - p.currentStock);
      estimatedReorderCost += suggestedReorder * (p.purchasePrice || 0);
    } else if (p.currentStock <= threshold) {
      lowStockItems++;
      const suggestedReorder = Math.max(1, (threshold * 2) - p.currentStock);
      estimatedReorderCost += suggestedReorder * (p.purchasePrice || 0);
    } else {
      healthyItems++;
    }
  }

  return {
    totalItems,
    physicalItems,
    serviceItems,
    healthyItems,
    lowStockItems,
    criticalItems,
    outOfStockItems,
    totalStockQuantity,
    totalValuation,
    estimatedReorderCost,
  };
};
