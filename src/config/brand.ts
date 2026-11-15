/**
 * Brand configuration. Change the name here and in app.config.ts.
 */
export const BRAND = {
  /** Product name shown where a name is unavoidable (splash, about). */
  codename: 'Cashino',
  /** Virtual currency: no monetary value, cannot be bought, sold, transferred or withdrawn. */
  currency: { id: 'coins', symbol: 'fichas', nameEs: 'fichas', nameEn: 'chips' },
  bundleId: 'app.cashino.game',
  supportEmail: 'support@example.com',
} as const;
