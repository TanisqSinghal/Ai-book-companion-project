import { auth } from '@clerk/nextjs/server';

import { PlanType, SubscriptionPlanLimits } from '@/lib/subscriptions-constants';
import { getPlanFromHas, getPlanLimits } from '@/lib/subscription';

type HasAuthorization = (params: { plan: string }) => boolean;

export const getCurrentUserSubscription = async (): Promise<{
    userId: string | null;
    plan: PlanType;
    limits: SubscriptionPlanLimits;
}> => {
    const { userId, has } = await auth();
    const plan = userId ? getPlanFromHas(has as HasAuthorization) : 'free';

    return {
        userId,
        plan,
        limits: getPlanLimits(plan),
    };
};
