export const DEMO_EMAIL = "demo@bastion.example";
export const DEMO_PASSWORD = "Bastion-Demo-2026";
export const DEMO_INGEST_KEY = "bsk_demo_northwind_public_sample";
export const DEMO_SITE_HOST = "shop.northwind.example";
export const DEMO_SITE_NAME = "Northwind storefront (DEMO)";
export const DEMO_ORG = "Northwind Labs";
export const DEMO_NAME = "Avery Chen";

export function demoIsReadOnly(user: { isDemo: boolean }): boolean {
  return user.isDemo;
}
