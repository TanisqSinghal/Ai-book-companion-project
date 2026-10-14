'use server'

import VoiceSession from "@/database/models/voice-session.model";
import Book from "@/database/models/book.model";
import { connectToDatabase } from "@/database/mongoose";
import { EndSessionResult, SessionDetail, SessionHistoryItem, SessionMessageRole, StartSessionResult } from "@/types";
import { getCurrentBillingPeriodStart } from "@/lib/subscriptions-constants";
import { getCurrentUserSubscription } from "@/lib/subscription.server";
import { serializeData } from "@/lib/utils";
import { auth } from "@clerk/nextjs/server";
import mongoose from "mongoose";

const MAX_MESSAGE_LENGTH = 5000;
const HISTORY_PAGE_SIZE = 50;


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

        const { userId } = await auth();
        if (!userId) {
            return { success: false, error: "Please sign in to end a voice session." };
        }

        // findOneAndUpdate, not findByIdAndUpdate: the latter casts this filter to just its _id and drops the clerkId check
        const endedSession = await VoiceSession.findOneAndUpdate(
            { _id: sessionId, clerkId: userId },
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


export const saveSessionMessage = async (
    sessionId: string,
    role: SessionMessageRole,
    content: string,
): Promise<EndSessionResult> => {
    try {
        const { userId } = await auth();
        if (!userId) {
            return { success: false, error: "Please sign in to save conversation history." };
        }

        const trimmedContent = content.trim().slice(0, MAX_MESSAGE_LENGTH);
        if (!trimmedContent || (role !== 'user' && role !== 'assistant') || !mongoose.isValidObjectId(sessionId)) {
            return { success: false, error: "Invalid message." };
        }

        await connectToDatabase();

        const result = await VoiceSession.updateOne(
            { _id: sessionId, clerkId: userId },
            { $push: { messages: { role, content: trimmedContent, createdAt: new Date() } } },
        );

        if (result.matchedCount === 0) {
            return { success: false, error: "Voice session not found." };
        }

        return { success: true };
    } catch (e) {
        console.error("Error saving session message:", e);
        return {
            success: false,
            error: "Failed to save conversation message.",
        };
    }
}

export const getSessionHistory = async (): Promise<{ success: boolean; data?: SessionHistoryItem[]; error?: string }> => {
    try {
        const { userId } = await auth();
        if (!userId) {
            return { success: false, error: "Please sign in to view your history." };
        }

        await connectToDatabase();

        // Sessions that never got a message (failed starts, instant hang-ups) are left out
        const sessions = await VoiceSession.aggregate([
            { $match: { clerkId: userId, 'messages.0': { $exists: true } } },
            { $sort: { startedAt: -1 } },
            { $limit: HISTORY_PAGE_SIZE },
            { $lookup: { from: Book.collection.name, localField: 'bookId', foreignField: '_id', as: 'book' } },
            { $unwind: { path: '$book', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    startedAt: 1,
                    durationSeconds: 1,
                    messageCount: { $size: '$messages' },
                    // The assistant always opens with the same greeting, so preview the user's first line instead
                    preview: {
                        $arrayElemAt: [
                            { $filter: { input: '$messages', as: 'm', cond: { $eq: ['$$m.role', 'user'] } } },
                            0,
                        ],
                    },
                    book: {
                        _id: '$book._id',
                        title: '$book.title',
                        author: '$book.author',
                        slug: '$book.slug',
                        coverURL: '$book.coverURL',
                    },
                },
            },
            { $addFields: { preview: '$preview.content' } },
        ]);

        return {
            success: true,
            data: serializeData(sessions.map((s) => (s.book?._id ? s : { ...s, book: undefined }))),
        };
    } catch (e) {
        console.error("Error fetching session history:", e);
        return {
            success: false,
            error: "Failed to load conversation history.",
        };
    }
}

export const getSessionById = async (sessionId: string): Promise<{ success: boolean; data?: SessionDetail; error?: string }> => {
    try {
        const { userId } = await auth();
        if (!userId) {
            return { success: false, error: "Please sign in to view your history." };
        }

        if (!mongoose.isValidObjectId(sessionId)) {
            return { success: false, error: "Conversation not found." };
        }

        await connectToDatabase();

        const session = await VoiceSession.findOne({ _id: sessionId, clerkId: userId })
            .select('startedAt durationSeconds messages bookId')
            .populate('bookId', 'title author slug coverURL')
            .lean<{ _id: unknown; startedAt: Date; durationSeconds: number; messages: unknown[]; bookId: SessionDetail['book'] | null }>();

        if (!session) {
            return { success: false, error: "Conversation not found." };
        }

        const { bookId, ...rest } = session;

        return {
            success: true,
            // serializeData turns Dates and ObjectIds into strings
            data: serializeData({ ...rest, book: bookId ?? undefined }) as unknown as SessionDetail,
        };
    } catch (e) {
        console.error("Error fetching session:", e);
        return {
            success: false,
            error: "Failed to load conversation.",
        };
    }
}
