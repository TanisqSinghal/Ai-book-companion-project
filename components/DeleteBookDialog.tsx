'use client';

import { useState, type ReactNode } from 'react';
import { AlertDialog } from 'radix-ui';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { deleteBook } from '@/lib/actions/book.actions';

interface DeleteBookDialogProps {
    bookId: string;
    title: string;
    // The button that opens the dialog
    children: ReactNode;
    onDeleted: () => void;
}

// Asks before deleting, since a deleted book and its files can't be brought back
const DeleteBookDialog = ({ bookId, title, children, onDeleted }: DeleteBookDialogProps) => {
    const [open, setOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        setIsDeleting(true);
        const result = await deleteBook(bookId);
        setIsDeleting(false);

        if (!result.success) {
            toast.error(result.error ?? 'Failed to delete book.');
            return;
        }

        setOpen(false);
        toast.success(`"${title}" was deleted.`);
        onDeleted();
    };

    return (
        <AlertDialog.Root open={open} onOpenChange={(next) => !isDeleting && setOpen(next)}>
            <AlertDialog.Trigger asChild>{children}</AlertDialog.Trigger>
            <AlertDialog.Portal>
                <AlertDialog.Overlay className="dialog-overlay" />
                <AlertDialog.Content className="dialog-content">
                    <AlertDialog.Title className="dialog-title">Delete this book?</AlertDialog.Title>
                    <AlertDialog.Description className="dialog-description">
                        &ldquo;{title}&rdquo; and its PDF will be permanently removed. Your past conversations about it stay in your history. This can&apos;t be undone.
                    </AlertDialog.Description>
                    <div className="dialog-actions">
                        <AlertDialog.Cancel className="shelf-btn-secondary" disabled={isDeleting}>
                            Cancel
                        </AlertDialog.Cancel>
                        {/* A plain button, so the dialog stays open until the delete finishes */}
                        <button type="button" className="btn-danger" onClick={handleDelete} disabled={isDeleting}>
                            {isDeleting && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                            {isDeleting ? 'Deleting…' : 'Delete book'}
                        </button>
                    </div>
                </AlertDialog.Content>
            </AlertDialog.Portal>
        </AlertDialog.Root>
    );
};

export default DeleteBookDialog;
