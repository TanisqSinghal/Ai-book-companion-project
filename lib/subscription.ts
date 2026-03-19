import {
    PlanType,
    SUBSCRIPTION_LIMITS,
    SUBSCRIPTION_PLAN_SLUGS,
    SubscriptionPlanLimits,
} from '@/lib/subscriptions-constants';

type HasAuthorization = (params: { plan: string }) => boolean;

const toClerkUserPlan = (planSlug: string) => `user:${planSlug}`;

export const getPlanFromHas = (has?: HasAuthorization): PlanType => {
    if (!has) return 'free';

    if (has({ plan: toClerkUserPlan(SUBSCRIPTION_PLAN_SLUGS.pro) })) {
        return 'pro';
    }

    if (has({ plan: toClerkUserPlan(SUBSCRIPTION_PLAN_SLUGS.standard) })) {
        return 'standard';
    }

    return 'free';
};

export const getPlanLimits = (plan: PlanType): SubscriptionPlanLimits => {
    return SUBSCRIPTION_LIMITS[plan];
};
