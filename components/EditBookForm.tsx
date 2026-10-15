'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ImageIcon, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { upload } from '@vercel/blob/client';

import { EditBookSchema } from '@/lib/zod';
import { ACCEPTED_IMAGE_TYPES, DEFAULT_VOICE } from '@/lib/constants';
import { checkBookExists, updateBook } from '@/lib/actions/book.actions';
import { generateSlug } from '@/lib/utils';
import { BookEditFormValues } from '@/types';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import FileUploader from './FileUploader';
import VoiceSelector from './VoiceSelector';
import VisibilitySelector from './VisibilitySelector';
import DeleteBookDialog from './DeleteBookDialog';

export interface EditableBook {
    id: string;
    title: string;
    author: string;
    persona?: string;
    isPublic: boolean;
    coverURL?: string;
}

const MY_BOOKS_HREF = '/?shelf=mine';

const EditBookForm = ({ book }: { book: EditableBook }) => {
    const router = useRouter();
    const [isSaving, setIsSaving] = useState(false);

    const form = useForm<BookEditFormValues>({
        resolver: zodResolver(EditBookSchema),
        defaultValues: {
            title: book.title,
            author: book.author,
            persona: book.persona || DEFAULT_VOICE,
            isPublic: book.isPublic,
            coverImage: undefined,
        },
    });

    // Preview the newly picked cover next to the current one
    const newCover = useWatch({ control: form.control, name: 'coverImage' });
    const [newCoverPreview, setNewCoverPreview] = useState<string | null>(null);
    useEffect(() => {
        if (!newCover) {
            setNewCoverPreview(null);
            return;
        }
        const url = URL.createObjectURL(newCover);
        setNewCoverPreview(url);
        return () => URL.revokeObjectURL(url);
    }, [newCover]);

    const onSubmit = async (data: BookEditFormValues) => {
        setIsSaving(true);

        try {
            // Check the title before uploading anything, so a rejected edit leaves no stray cover file
            if (generateSlug(data.title) !== generateSlug(book.title)) {
                const existing = await checkBookExists(data.title);
                if (existing.exists && existing.book && String(existing.book._id) !== book.id) {
                    form.setError('title', { message: 'You already have a book with this title.' });
                    return;
                }
            }

            let coverURL: string | undefined;
            if (data.coverImage) {
                const fileTitle = data.title.replace(/\s+/g, '-').toLowerCase();
                const uploadedCover = await upload(`${fileTitle}_cover.png`, data.coverImage, {
                    access: 'public',
                    handleUploadUrl: '/api/upload',
                    contentType: data.coverImage.type,
                });
                coverURL = uploadedCover.url;
            }

            const result = await updateBook(book.id, {
                title: data.title,
                author: data.author,
                persona: data.persona,
                isPublic: data.isPublic,
                coverURL,
            });

            if (!result.success) {
                toast.error(result.error ?? 'Failed to update book.');
                return;
            }

            toast.success('Book updated.');
            router.push(MY_BOOKS_HREF);
        } catch (error) {
            console.error(error);
            toast.error('Failed to update book. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="new-book-wrapper">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    <div className="edit-cover-row">
                        <div className="edit-cover-preview">
                            <Image
                                src={newCoverPreview || book.coverURL || '/assets/book-cover.svg'}
                                alt=""
                                width={96}
                                height={144}
                                unoptimized={Boolean(newCoverPreview)}
                                className="edit-cover-image"
                            />
                            <span className="edit-cover-caption">{newCoverPreview ? 'New cover' : 'Current cover'}</span>
                        </div>
                        <FileUploader
                            control={form.control}
                            name="coverImage"
                            label="Replace Cover (Optional)"
                            acceptTypes={ACCEPTED_IMAGE_TYPES}
                            icon={ImageIcon}
                            placeholder="Click to choose a new cover"
                            hint="Leave empty to keep the current cover"
                            disabled={isSaving}
                        />
                    </div>

                    <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="form-label">Title</FormLabel>
                                <FormControl>
                                    <Input className="form-input" {...field} disabled={isSaving} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="author"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="form-label">Author Name</FormLabel>
                                <FormControl>
                                    <Input className="form-input" {...field} disabled={isSaving} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="persona"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="form-label">Assistant Voice</FormLabel>
                                <FormControl>
                                    <VoiceSelector value={field.value} onChange={field.onChange} disabled={isSaving} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="isPublic"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="form-label">Who can see this book?</FormLabel>
                                <FormControl>
                                    <VisibilitySelector value={field.value} onChange={field.onChange} disabled={isSaving} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <div className="edit-actions">
                        <Link href={MY_BOOKS_HREF} className="shelf-btn-secondary" aria-disabled={isSaving}>
                            Cancel
                        </Link>
                        <Button type="submit" className="form-btn" disabled={isSaving || !form.formState.isDirty}>
                            {isSaving && <Loader2 className="size-5 animate-spin" aria-hidden="true" />}
                            {isSaving ? 'Saving…' : 'Save changes'}
                        </Button>
                    </div>
                </form>
            </Form>

            <section className="danger-zone" aria-labelledby="danger-zone-title">
                <div>
                    <h2 id="danger-zone-title" className="danger-zone-title">Delete this book</h2>
                    <p className="danger-zone-text">
                        Removes the book and its PDF for good. Your past conversations stay in your history.
                    </p>
                </div>
                <DeleteBookDialog bookId={book.id} title={book.title} onDeleted={() => router.push(MY_BOOKS_HREF)}>
                    <button type="button" className="btn-danger" disabled={isSaving}>
                        <Trash2 className="size-4" aria-hidden="true" />
                        Delete book
                    </button>
                </DeleteBookDialog>
            </section>
        </div>
    );
};

export default EditBookForm;
