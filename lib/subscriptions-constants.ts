import { INFINITE_CACHE } from "next/dist/lib/constants";

export const SUBSCRIPTION_PLAN_SLUGS = {
    standard: 'standard',
    pro: 'pro',
} as const;

export type PlanType = 'free' | (typeof SUBSCRIPTION_PLAN_SLUGS)[keyof typeof SUBSCRIPTION_PLAN_SLUGS];

export interface SubscriptionPlanLimits {
    maxBooks: number;
    maxSessionsPerMonth: number | null;
    maxSessionMinutes: number;
    hasSessionHistory: boolean;
}

export const SUBSCRIPTION_LIMITS: Record<PlanType, SubscriptionPlanLimits> = {
    free: {
        maxBooks: 1,
        maxSessionsPerMonth: 5,
        maxSessionMinutes: 5,
        hasSessionHistory: false,
    },
    standard: {
        maxBooks: 10,
        maxSessionsPerMonth: 100,
        maxSessionMinutes: 15,
        hasSessionHistory: true,
    },
    pro: {
        maxBooks: 100,
        maxSessionsPerMonth: null,
        maxSessionMinutes: 60,
        hasSessionHistory: true,
    },
};

export const getCurrentBillingPeriodStart = (): Date => {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
};