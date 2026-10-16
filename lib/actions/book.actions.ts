'use server'

import { connectToDatabase } from "@/database/mongoose";
import { BookMutationResult, CreateBook, CreateBookResult, DuplicateReason, IBook, TextSegment, UpdateBookInput } from "@/types";
import { escapeRegex, generateSlug, serializeData } from "@/lib/utils";
import { BookDetailsSchema } from "@/lib/zod";
import Book from "@/database/models/book.model";
import BookSegment from "@/database/models/book-segment.model";
import mongoose from "mongoose";
import { revalidatePath } from "next/cache";
import { getCurrentUserSubscription } from "@/lib/subscription.server";
import { auth } from "@clerk/nextjs/server";
import { del } from "@vercel/blob";
import { randomBytes } from "crypto";

export type BookShelf = 'public' | 'mine';

// Books saved before visibility existed have no isPublic value and stay public
const PUBLIC_FILTER = { isPublic: { $ne: false } };

// A user's own copy of a title: the plain slug, or the suffixed one used when another user had it first
const ownSlugFilter = (clerkId: string, title: string) => ({
    clerkId,
    slug: { $regex: `^${escapeRegex(generateSlug(title))}(-[a-f0-9]{6})?$` },
});

// Same author regardless of case, spacing or punctuation ("J.K. Rowling" and "j k rowling")
const normalizeAuthor = (author: string) => author.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');

const isFileHash = (value?: string): value is string => /^[a-f0-9]{64}$/.test(value ?? '');

// The user's copy of this book, if they already uploaded it: the same PDF file,
// or the same title by the same author (two different books may share a title)
const findOwnDuplicate = async (
    clerkId: string,
    title: string,
    author: string,
    fileHash?: string,
): Promise<{ book: IBook; reason: DuplicateReason } | null> => {
    if (isFileHash(fileHash)) {
        const sameFile = await Book.findOne({ clerkId, fileHash }).lean<IBook>();
        if (sameFile) return { book: sameFile, reason: 'file' };
    }

    const sameTitle = await Book.find(ownSlugFilter(clerkId, title)).lean<IBook[]>();
    const sameTitleAndAuthor = sameTitle.find((book) => normalizeAuthor(book.author) === normalizeAuthor(author));
    return sameTitleAndAuthor ? { book: sameTitleAndAuthor, reason: 'title' } : null;
};

// Slugs are unique site-wide, so a title another book already has gets a short suffix
const availableSlug = async (title: string, excludeId?: unknown) => {
    const baseSlug = generateSlug(title);
    const taken = await Book.exists(excludeId ? { slug: baseSlug, _id: { $ne: excludeId } } : { slug: baseSlug });
    return taken ? `${baseSlug}-${randomBytes(3).toString('hex')}` : baseSlug;
};

const isBlobUrl = (url?: string) => {
    if (!url) return false;
    try {
        return new URL(url).hostname.endsWith('.public.blob.vercel-storage.com');
    } catch {
        return false;
    }
};

// Removing the stored files is best effort: the book itself is already gone or updated
// A file another book still points to is never deleted: edits accept any blob URL as a cover,
// so without this check a user could point their cover at someone else's file and then remove it
const deleteBlobs = async (urls: (string | undefined)[], bookId: unknown) => {
    const candidates = urls.filter((url): url is string => isBlobUrl(url));
    if (candidates.length === 0) return;

    try {
        const booksUsingFiles = await Book.find({
            _id: { $ne: bookId },
            $or: [{ fileURL: { $in: candidates } }, { coverURL: { $in: candidates } }],
        }).select('fileURL coverURL').lean<{ fileURL?: string; coverURL?: string }[]>();
        const inUse = new Set(booksUsingFiles.flatMap(({ fileURL, coverURL }) => [fileURL, coverURL]));

        const blobUrls = candidates.filter((url) => !inUse.has(url));
        if (blobUrls.length === 0) return;

        await del(blobUrls, { token: process.env.VERCEL_BLOB_READ_WRITE_TOKEN });
    } catch (e) {
        console.error("Error deleting book files from blob storage:", e);
    }
};

// Loads a book only if the signed-in user uploaded it
const findOwnBook = async (bookId: string) => {
    const { userId } = await auth();
    if (!userId) return { userId: null, book: null };
    if (!mongoose.isValidObjectId(bookId)) return { userId, book: null };

    await connectToDatabase();
    const book = await Book.findOne({ _id: bookId, clerkId: userId });
    return { userId, book };
};


export const getAllBooks = async (query?: string, shelf: BookShelf = 'public') => {
    try {
        await connectToDatabase();

        let shelfFilter: Record<string, unknown> = PUBLIC_FILTER;
        if (shelf === 'mine') {
            const { userId } = await auth();
            if (!userId) {
                return { success: true, data: [] };
            }
            shelfFilter = { clerkId: userId };
        }

        const trimmedQuery = query?.trim();

        const filter = trimmedQuery
            ? {
                ...shelfFilter,
                $or: [
                    { title: { $regex: escapeRegex(trimmedQuery), $options: 'i' } },
                    { author: { $regex: escapeRegex(trimmedQuery), $options: 'i' } },
                ],
            }
            : shelfFilter;

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


// Only the current user's own books count: other users may upload the same title
export const checkBookExists = async (title: string) => {
    try {
        const { userId } = await auth();
        if (!userId) {
            return { exists: false };
        }

        await connectToDatabase();

        const existingBook = await Book.findOne(ownSlugFilter(userId, title)).lean();

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

// Run before uploading anything, so a duplicate leaves no stray files in storage
export const checkDuplicateBook = async (title: string, author: string, fileHash?: string) => {
    try {
        const { userId } = await auth();
        if (!userId) {
            return { exists: false };
        }

        await connectToDatabase();

        const duplicate = await findOwnDuplicate(userId, title, author, fileHash);

        if (duplicate) {
            return {
                exists: true,
                book: serializeData(duplicate.book),
                reason: duplicate.reason,
            }
        }
        return {
            exists: false,
        }
    } catch (e) {
        console.error("Error checking for a duplicate book:", e);
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

        const duplicate = await findOwnDuplicate(userId, data.title, data.author, data.fileHash);

        if(duplicate) {
            return {
                success: true,
                data: serializeData(duplicate.book),
                alreadyExists: true,
                duplicateReason: duplicate.reason,
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

        const slug = await availableSlug(data.title);

        const book = await Book.create({
            ...data,
            fileHash: isFileHash(data.fileHash) ? data.fileHash : undefined,
            isPublic: Boolean(data.isPublic),
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

        const { userId } = await auth();
        if (!userId || userId !== clerkId) {
            return { success: false, error: 'Unauthorized request.' };
        }

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

export const updateBook = async (bookId: string, input: UpdateBookInput): Promise<BookMutationResult> => {
    try {
        const parsed = BookDetailsSchema.safeParse(input);
        if (!parsed.success) {
            return { success: false, error: parsed.error.issues[0]?.message ?? 'Please check the book details.' };
        }
        if (input.coverURL !== undefined && !isBlobUrl(input.coverURL)) {
            return { success: false, error: 'Invalid cover image.' };
        }

        const { userId, book } = await findOwnBook(bookId);
        if (!userId) {
            return { success: false, error: 'Please sign in to edit books.' };
        }
        if (!book) {
            return { success: false, error: 'Book not found.' };
        }

        const { title, author, persona, isPublic } = parsed.data;
        const previousSlug: string = book.slug;
        const previousCover: string | undefined = book.coverURL;

        // Duplicate checks and the book's URL both follow the title, so a new title needs a new slug
        if (generateSlug(title) !== generateSlug(book.title)) {
            const duplicate = await Book.exists({ ...ownSlugFilter(userId, title), _id: { $ne: book._id } });
            if (duplicate) {
                return { success: false, error: 'You already have a book with this title.' };
            }
            book.slug = await availableSlug(title, book._id);
        }

        book.title = title;
        book.author = author;
        book.persona = persona;
        book.isPublic = isPublic;
        if (input.coverURL) {
            book.coverURL = input.coverURL;
        }
        await book.save();

        if (input.coverURL && previousCover !== input.coverURL) {
            await deleteBlobs([previousCover], book._id);
        }

        revalidatePath('/');
        revalidatePath(`/books/${previousSlug}`);

        return { success: true, slug: book.slug };
    } catch (e) {
        console.error("Error updating book:", e);
        return { success: false, error: 'Failed to update book. Please try again.' };
    }
}

// Past conversations about the book are kept; history shows them as "Deleted book"
export const deleteBook = async (bookId: string): Promise<BookMutationResult> => {
    try {
        const { userId, book } = await findOwnBook(bookId);
        if (!userId) {
            return { success: false, error: 'Please sign in to delete books.' };
        }
        if (!book) {
            return { success: false, error: 'Book not found.' };
        }

        await BookSegment.deleteMany({ bookId: book._id });
        await Book.deleteOne({ _id: book._id });
        await deleteBlobs([book.fileURL, book.coverURL], book._id);

        revalidatePath('/');
        revalidatePath('/history');

        return { success: true };
    } catch (e) {
        console.error("Error deleting book:", e);
        return { success: false, error: 'Failed to delete book. Please try again.' };
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

        // Private books are only visible to the user who uploaded them
        const { clerkId, isPublic } = book as { clerkId?: string; isPublic?: boolean };
        if (isPublic === false) {
            const { userId } = await auth();
            if (userId !== clerkId) {
                return {
                    success: false,
                    error: 'Book not found',
                }
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

