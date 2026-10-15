import { z } from 'zod';
import {MAX_FILE_SIZE, ACCEPTED_PDF_TYPES, ACCEPTED_IMAGE_TYPES, MAX_IMAGE_SIZE} from './constants';

// The fields a book keeps after upload; the server validates edits against this too
export const BookDetailsSchema = z.object({
    title: z.string().trim().min(1, "Title is required").max(100, "Title is too long"),
    author: z.string().trim().min(1, "Author name is required").max(100, "Author name is too long"),
    persona: z.string().min(1, "Please select a voice"),
    isPublic: z.boolean(),
});

const coverImageField = z.instanceof(File).optional()
    .refine((file) => !file || file.size <= MAX_IMAGE_SIZE, "Image size must be less than 10MB")
    .refine((file) => !file || ACCEPTED_IMAGE_TYPES.includes(file.type), "Only .jpg, .jpeg, .png and .webp formats are supported");

export const UploadSchema = BookDetailsSchema.extend({
    pdfFile: z.instanceof(File, { message: "PDF file is required" })
        .refine((file) => file.size <= MAX_FILE_SIZE, "File size must be less than 50MB")
        .refine((file) => ACCEPTED_PDF_TYPES.includes(file.type), "Only PDF files are accepted"),
    coverImage: coverImageField,
});

// The PDF can't be swapped after upload (its text is already split into segments), only the details and cover
export const EditBookSchema = BookDetailsSchema.extend({
    coverImage: coverImageField,
});