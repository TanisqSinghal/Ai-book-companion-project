'use client';

import { useAuth } from '@clerk/nextjs';

import { getPlanFromHas, getPlanLimits } from '@/lib/subscription';

export const useSubscriptionPlan = () => {
    const { has, isLoaded, userId } = useAuth();

    const plan = userId ? getPlanFromHas(has) : 'free';
    const limits = getPlanLimits(plan);

    return {
        isLoaded,
        isSignedIn: !!userId,
        plan,
        limits,
    };
};
