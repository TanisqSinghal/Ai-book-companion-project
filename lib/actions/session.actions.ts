'use server'

import VoiceSession from "@/database/models/voice-session.model";
import { connectToDatabase } from "@/database/mongoose";
import { EndSessionResult, StartSessionResult } from "@/types";
import { getCurrentBillingPeriodStart } from "@/lib/subscriptions-constants";
import { getCurrentUserSubscription } from "@/lib/subscription.server";


export const startVoiceSession = async (clerkId: string, bookId: string): Promise<StartSessionResult> => {
    try {
        await connectToDatabase();

        const { userId, limits, plan } = await getCurrentUserSubscription();

        if (!userId) {
            return {
                success: false,
                error: 'Please sign in to start a voice session.',
            }
        }

        if (clerkId !== userId) {
            return {
                success: false,
                error: 'Unauthorized session request.',
            }
        }

        const billingPeriodStart = getCurrentBillingPeriodStart();

        if (limits.maxSessionsPerMonth !== null) {
            const sessionsThisMonth = await VoiceSession.countDocuments({
                clerkId: userId,
                billingPeriodStart,
            });

            if (sessionsThisMonth >= limits.maxSessionsPerMonth) {
                return {
                    success: false,
                    error: `You have reached your ${plan} plan limit (${limits.maxSessionsPerMonth} sessions this month). Upgrade to continue.`,
                    isBillingError: true,
                }
            }
        }

        const session = await VoiceSession.create({
            clerkId: userId,
            bookId, 
            startedAt: new Date(),
            billingPeriodStart,
            durationSeconds: 0,
        });

        return {
            success: true,
            sessionId: session._id.toString(),
            maxDurationMinutes: limits.maxSessionMinutes,

        }
    } catch (e) {
        console.error("Error starting voice session:", e);
        return {
            success: false,
            error: 'Failed to start voice session. Please try again later.',
        }
    }
}

export const endVoiceSession = async (sessionId: string, durationSeconds: number): Promise<EndSessionResult> => {
    try {
        await connectToDatabase();

        const endedSession = await VoiceSession.findByIdAndUpdate(
            sessionId,
            {
                endedAt: new Date(),
                durationSeconds,
            },
            { new: true }
        );

        if (!endedSession) {
            return {
                success: false,
                error: "Voice session not found.",
            };
        }

        return {
            success: true,
        };
    } catch (e) {
        console.error("Error ending voice session:", e);
        return {
            success: false,
            error: "Failed to end voice session. Please try again later.",
        };
    }
}

