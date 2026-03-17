'use server'

import { connectToDatabase } from "@/database/mongoose";
import { CreateBook, TextSegment } from "@/types";
import { generateSlug, serializeData } from "@/lib/utils";
import Book from "@/database/models/book.model";
import { totalmem } from "os";
import BookSegment from "@/database/models/book-segment.model";
import { connect } from "http2";
import { exists } from "fs";

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

export const createBook = async (data: CreateBook) => {
    try {
        await connectToDatabase();

        const slug = generateSlug(data.title);

        const existingBook = await Book.findOne({slug}).lean();

        if(existingBook) {
            return {
                success: true,
                data: serializeData(existingBook),
                alreadyExists: true,
            }
        }

        //Todo: Check subscription limits before creating a book

        const book = await Book.create({
            ...data,
            slug,
            totalSegments: 0,
        })

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

