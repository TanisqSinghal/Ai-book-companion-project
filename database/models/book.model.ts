import {IBook} from "@/types";
import { Schema } from "mongoose";
import { registerModel } from "./registerModel";


const BookSchema = new Schema<IBook>({
    clerkId: {type: String, required: true},
    title: {type: String, required: true},
    slug: {type: String, required: true, unique: true, lowercase: true, trim: true},
    author: {type: String, required: true},
    persona: {type: String},
    // Books saved before visibility existed have no value and count as public
    isPublic: {type: Boolean},
    fileURL: {type: String, required: true},
    fileBlobKey: {type: String, required: true},
    coverURL: {type: String},
    coverBlobKey: {type: String},
    fileSize: {type: Number, required: true},
    // SHA-256 of the PDF, so the same file can't be uploaded twice under another title.
    // Books saved before this existed have none and are matched by title and author only
    fileHash: {type: String},
    totalSegments: {type: Number, default: 0},
}, {timestamps: true});

BookSchema.index({ clerkId: 1, fileHash: 1 });

const Book = registerModel<IBook>("Book", BookSchema);

export default Book;