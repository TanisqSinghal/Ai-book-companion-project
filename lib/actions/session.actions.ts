'use server'

import VoiceSession from "@/database/models/voice-session.model";
import { connectToDatabase } from "@/database/mongoose";
import { EndSessionResult, StartSessionResult } from "@/types";
import { getCurrentBillingPeriodStart } from "@/lib/subscriptions-constants";


export const startVoiceSession = async (clerkId: string, bookId: string): Promise<StartSessionResult> => {
    try {
        await connectToDatabase();

        //Limits/Plan to see whether a session is allowed 

        const session = await VoiceSession.create({
            clerkId, 
            bookId, 
            startAt: new Date(),
            billingPeriodStart: getCurrentBillingPeriodStart(),
            durationSeconds: 0,
        });

        return {
            success: true,
            sessionId: session._id.toString(),
            // maxDurationMinutes, // Example value, replace with actual plan limit

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

