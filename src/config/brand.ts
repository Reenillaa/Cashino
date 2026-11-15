/**
 * Provisional brand configuration. The product name is NOT final: change it here (and in app.config.ts).
 */
export const BRAND = {
  /** Internal codename shown where a name is unavoidable (splash, about). */
  codename: 'Titanium',
  /** Virtual currency: no monetary value, cannot be bought, sold, transferred or withdrawn. */
  currency: { id: 'coins', symbol: 'Ti', nameEs: 'Ti', nameEn: 'Ti' },
  bundleId: 'app.titanium.provisional',
  supportEmail: 'support@example.com',
} as const;
