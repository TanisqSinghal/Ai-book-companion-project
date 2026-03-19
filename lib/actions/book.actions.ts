'use server'

import { connectToDatabase } from "@/database/mongoose";
import { CreateBook, CreateBookResult, TextSegment } from "@/types";
import { escapeRegex, generateSlug, serializeData } from "@/lib/utils";
import Book from "@/database/models/book.model";
import BookSegment from "@/database/models/book-segment.model";
import mongoose from "mongoose";
import { revalidatePath } from "next/cache";
import { getCurrentUserSubscription } from "@/lib/subscription.server";


export const getAllBooks = async (query?: string) => {
    try {
        await connectToDatabase();

        const trimmedQuery = query?.trim();

        const filter = trimmedQuery
            ? {
                $or: [
                    { title: { $regex: escapeRegex(trimmedQuery), $options: 'i' } },
                    { author: { $regex: escapeRegex(trimmedQuery), $options: 'i' } },
                ],
            }
            : {};

        const books = await Book.find(filter).sort({ createdAt: -1 }).lean();

        return {
            success: true,
            data: serializeData(books),
        }
    } catch (e) {
        console.error("Error connecting to database:", e);
        return {
            success: false,
            error: e,
        }
    }
}


export const checkBookExists = async (title: string) => {
    try {
        await connectToDatabase();

        const slug = generateSlug(title);

        const existingBook = await Book.findOne({slug}).lean();

        if(existingBook) {
            return {
                exists: true,
                book: serializeData(existingBook),
            }
        }
        return {
            exists: false,
        }
    } catch (e) {
        console.error("Error checking if book exists:", e);
        return {
            exists: false,
            error: e
        }
    }
}

export const createBook = async (data: CreateBook): Promise<CreateBookResult> => {
    try {
        await connectToDatabase();

        const { userId, plan, limits } = await getCurrentUserSubscription();

        if (!userId) {
            return {
                success: false,
                error: 'Please sign in to upload books.',
                isBillingError: false,
            }
        }

        const slug = generateSlug(data.title);

        const existingBook = await Book.findOne({slug}).lean();

        if(existingBook) {
            return {
                success: true,
                data: serializeData(existingBook),
                alreadyExists: true,
            }
        }

        const totalBooks = await Book.countDocuments({ clerkId: userId });

        if (totalBooks >= limits.maxBooks) {
            return {
                success: false,
                error: `You have reached the ${plan} plan limit (${limits.maxBooks} books). Upgrade your plan to upload more books.`,
                isBillingError: true,
            }
        }

        const book = await Book.create({
            ...data,
            clerkId: userId,
            slug,
            totalSegments: 0,
        })

        revalidatePath('/');

        return {
            success: true,
            data: serializeData(book),
        }

    } catch (e) {
        console.error("Error creating book:", e);
        return {
            success : false,
            error: e,
        }
    }
}

export const saveBookSegments = async (bookId: string, clerkId: string, segments: TextSegment[]) => {
    try {
        await connectToDatabase();

        console.log("saving book segments...");

        const segmentsToInsert = segments.map(({text, segmentIndex, pageNumber, wordCount}) => ({
            clerkId, bookId, content: text, segmentIndex, pageNumber, wordCount
        }))

        await BookSegment.insertMany(segmentsToInsert);

        await Book.findByIdAndUpdate(bookId, {totalSegments: segments.length});

        console.log("book segments saved successfully")

        return {
            success: true,
            data: {segmentsCreated: segments.length},
        }

    } catch (e) {
        console.error("Error saving book segments:", e);

        await BookSegment.deleteMany({bookId});
        await Book.findByIdAndDelete(bookId);
        console.log("deleted book segments and book due to failure of saving other segments")

        return {
            success : false,
            error: e,
        }
    }
}

export const getBookBySlug = async (slug: string) => {
    try {
        await connectToDatabase();

        const book = await Book.findOne({ slug }).lean();

        if (!book) {
            return {
                success: false,
                error: 'Book not found',
            }
        }

        return {
            success: true,
            data: serializeData(book),
        }
    } catch (e) {
        console.error("Error fetching book by slug:", e);
        return {
            success: false,
            error: e,
        }
    }
}

// Searches book segments using MongoDB text search with regex fallback
export const searchBookSegments = async (bookId: string, query: string, limit: number = 5) => {
    try {
        await connectToDatabase();

        console.log(`Searching for: "${query}" in book ${bookId}`);

        const bookObjectId = new mongoose.Types.ObjectId(bookId);

        // Try MongoDB text search first (requires text index)
        let segments: Record<string, unknown>[] = [];
        try {
            segments = await BookSegment.find({
                bookId: bookObjectId,
                $text: { $search: query },
            })
                .select('_id bookId content segmentIndex pageNumber wordCount')
                .sort({ score: { $meta: 'textScore' } })
                .limit(limit)
                .lean();
        } catch {
            // Text index may not exist — fall through to regex fallback
            segments = [];
        }

        // Fallback: regex search matching ANY keyword
        if (segments.length === 0) {
            const keywords = query.split(/\s+/).filter((k) => k.length > 2);
            const pattern = keywords.map(escapeRegex).join('|');

            if(keywords.length === 0) {
                return {
                    success: true,
                    data: [],
                }
            }

            segments = await BookSegment.find({
                bookId: bookObjectId,
                content: { $regex: pattern, $options: 'i' },
            })
                .select('_id bookId content segmentIndex pageNumber wordCount')
                .sort({ segmentIndex: 1 })
                .limit(limit)
                .lean();
        }

        console.log(`Search complete. Found ${segments.length} results`);

        return {
            success: true,
            data: serializeData(segments),
        };
    } catch (error) {
        console.error('Error searching segments:', error);
        return {
            success: false,
            error: (error as Error).message,
            data: [],
        };
    }
};

