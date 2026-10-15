'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { BookOpen, Lock, Mic, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import DeleteBookDialog from '@/components/DeleteBookDialog';
import { BOOK_HEIGHT } from '@/components/stage/bookSize';
import { LABEL_DROP, SPACING_X, columnsForWidth, layoutShelf } from '@/components/shelf/layout';
import type { ShelfBook } from '@/components/shelf/layout';
import { useInView } from '@/hooks/useInView';

// WebGL only exists in the browser, so the 3D shelf is never server-rendered
const ShelfScene = dynamic(() => import('@/components/shelf/ShelfScene'), {
    ssr: false,
    loading: () => <p className="stage-fallback">Stocking the shelves…</p>,
});

const DEFAULT_COLUMNS = 4;
// Long enough for the camera to reach the book and the screen to fade before the page changes
const FLY_IN_MS = 850;
const LABEL_GAP_PX = 16;

const Bookshelf = ({ books }: { books: ShelfBook[] }) => {
    const { userId } = useAuth();
    const router = useRouter();

    const [container, setContainer] = useState<HTMLDivElement | null>(null);
    const inView = useInView(container);
    const [containerWidth, setContainerWidth] = useState(0);
    const [hovered, setHovered] = useState<number | null>(null);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [launching, setLaunching] = useState<number | null>(null);

    useEffect(() => {
        if (!container) return;

        const observer = new ResizeObserver(([entry]) => setContainerWidth(entry.contentRect.width));
        observer.observe(container);
        return () => observer.disconnect();
    }, [container]);

    if (books.length === 0) {
        return <p className="shelf-empty">No books here yet. Add one to start a conversation.</p>;
    }

    const columns = containerWidth ? columnsForWidth(containerWidth) : DEFAULT_COLUMNS;
    const { width, height, slots } = layoutShelf(books, columns);
    const labelWidth = Math.max(80, (containerWidth / width) * SPACING_X - LABEL_GAP_PX);
    const selected = books.find((book) => book.id === selectedId) ?? books[0];

    const handleHover = (index: number, entered: boolean) => {
        if (entered) {
            setHovered(index);
            setSelectedId(books[index].id);
        } else {
            setHovered((current) => (current === index ? null : current));
        }
    };

    // Fly the camera into the book, then open its conversation
    const openConversation = (index: number) => {
        if (launching !== null) return;

        if (!userId) {
            toast.error("Please sign in or sign up first to access this book");
            return;
        }

        setLaunching(index);
        window.setTimeout(() => router.push(`/books/${books[index].slug}`), FLY_IN_MS);
    };

    return (
        <div className="shelf">
            <div ref={setContainer} className="shelf-card" style={{ aspectRatio: `${width} / ${height}` }}>
                {containerWidth > 0 && (
                    <ShelfScene
                        active={inView}
                        books={books}
                        columns={columns}
                        hovered={hovered}
                        launching={launching}
                        onHover={handleHover}
                        onSelect={openConversation}
                    />
                )}

                {/* Titles sit under each book; the camera frames the shelf exactly, so world units map to percentages */}
                {containerWidth > 0 && launching === null && slots.map((slot) => (
                    <div
                        key={slot.book.id}
                        className={`shelf-label ${hovered === slot.index ? 'shelf-label-active' : ''}`}
                        style={{
                            left: `${50 + (slot.x / width) * 100}%`,
                            top: `${50 - ((slot.y - BOOK_HEIGHT / 2 - LABEL_DROP) / height) * 100}%`,
                            width: labelWidth,
                        }}
                    >
                        <p className="shelf-label-title">{slot.book.title}</p>
                        <p className="shelf-label-author">{slot.book.author}</p>
                    </div>
                ))}
            </div>

            <div className="shelf-panel">
                <div className="min-w-0 sm:flex-1">
                    <p className="shelf-panel-title">
                        {selected.title}
                        {selected.isPublic === false && (
                            <span className="shelf-private-badge">
                                <Lock className="size-3" aria-hidden="true" />
                                Private
                            </span>
                        )}
                    </p>
                    <p className="shelf-panel-author">by {selected.author}</p>
                </div>
                <div className="shelf-panel-actions">
                    <button
                        type="button"
                        className="shelf-btn-primary"
                        onClick={() => openConversation(books.indexOf(selected))}
                    >
                        <Mic className="size-4" aria-hidden="true" />
                        Start talking
                    </button>
                    <button
                        type="button"
                        className="shelf-btn-secondary"
                        onClick={() => window.open(selected.fileURL, '_blank', 'noopener,noreferrer')}
                    >
                        <BookOpen className="size-4" aria-hidden="true" />
                        View Book
                    </button>
                </div>
                {/* Sits beside the title on phones and after the main actions on wider screens */}
                {selected.isOwner && (
                    <div className="shelf-panel-owner">
                        <Link
                            href={`/books/${selected.slug}/edit`}
                            className="shelf-btn-secondary shelf-btn-icon"
                            aria-label={`Edit ${selected.title}`}
                            title="Edit book"
                        >
                            <Pencil className="size-4" aria-hidden="true" />
                        </Link>
                        <DeleteBookDialog
                            bookId={selected.id}
                            title={selected.title}
                            onDeleted={() => {
                                setSelectedId(null);
                                router.refresh();
                            }}
                        >
                            <button
                                type="button"
                                className="shelf-btn-secondary shelf-btn-icon shelf-btn-danger"
                                aria-label={`Delete ${selected.title}`}
                                title="Delete book"
                            >
                                <Trash2 className="size-4" aria-hidden="true" />
                            </button>
                        </DeleteBookDialog>
                    </div>
                )}
            </div>

            {/* The canvas is not reachable by keyboard or screen reader, so list the books as plain buttons too */}
            <ul className="sr-only">
                {books.map((book, index) => (
                    <li key={book.id}>
                        <button
                            type="button"
                            onFocus={() => setSelectedId(book.id)}
                            onClick={() => openConversation(index)}
                        >
                            Talk about {book.title} by {book.author}
                        </button>
                    </li>
                ))}
            </ul>

            {launching !== null && <div className="shelf-flyout" aria-hidden="true" />}
        </div>
    );
};

export default Bookshelf;
