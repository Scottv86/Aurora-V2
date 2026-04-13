/**
 * Aurora Platform Billing & License Quotas
 */

export interface PlanQuota {
  developerSeats: number;
  standardSeats: number;
  price: number;
}

export const PLAN_QUOTAS: Record<string, PlanQuota> = {
  starter: {
    developerSeats: 2,
    standardSeats: 10,
    price: 49
  },
  growth: {
    developerSeats: 5,
    standardSeats: 50,
    price: 199
  },
  enterprise: {
    developerSeats: 25,
    standardSeats: 500,
    price: 999
  }
};

export const DEFAULT_PLAN = 'starter';
