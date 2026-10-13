"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {BookCardProps} from "@/types";
import Image from "next/image";
import { BookOpen } from "lucide-react";
import { useRef } from "react";

const MAX_TURN_DEG = 28;
const MAX_PITCH_DEG = 8;

const BookCard = ({ title, author, coverURL, fileURL, slug }: BookCardProps) => {
    const { userId } = useAuth();
    const router = useRouter();
    const bookRef = useRef<HTMLDivElement>(null);

    const handleBookClick = (e: React.MouseEvent) => {
        e.preventDefault();
        
        if (!userId) {
            toast.error("Please sign in or sign up first to access this book");
            return;
        }
        
        router.push(`/books/${slug}`);
    };

    // Turn the 3D book toward the pointer
    const handleTilt = (e: React.PointerEvent<HTMLDivElement>) => {
        const bounds = e.currentTarget.getBoundingClientRect();
        const x = (e.clientX - bounds.left) / bounds.width - 0.5;
        const y = (e.clientY - bounds.top) / bounds.height - 0.5;

        bookRef.current?.style.setProperty('--book-ry', `${x * MAX_TURN_DEG * 2}deg`);
        bookRef.current?.style.setProperty('--book-rx', `${-y * MAX_PITCH_DEG * 2}deg`);
    };

    const resetTilt = () => {
        bookRef.current?.style.removeProperty('--book-ry');
        bookRef.current?.style.removeProperty('--book-rx');
    };

    return  (
        <article className="book-card" onClick={handleBookClick} style={{ cursor: 'pointer' }}>
            <figure className="book-card-figure">
                <div className="book-card-cover-wrapper" onPointerMove={handleTilt} onPointerLeave={resetTilt}>
                    <div ref={bookRef} className="book-3d">
                        <span className="book-3d-spine" aria-hidden="true" />
                        <span className="book-3d-pages" aria-hidden="true" />
                        <Image src={coverURL} alt={title} width={133} height={200} className="book-card-cover" />
                    </div>
                </div>
                
                <figcaption className="book-card-meta">
                    <h3 className="book-card-title">{title}</h3>
                    <p className="book-card-author">{author}</p>
                </figcaption>
            </figure>

            <button
                type="button"
                className="mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-[#d9bd8a] bg-[#fff6e5] px-4 py-2 text-sm font-semibold text-[#663820] shadow-[0_2px_8px_rgba(102,56,32,0.08)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#663820] hover:bg-[#f3e4c7] hover:shadow-[0_4px_12px_rgba(102,56,32,0.14)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#663820]"
                onClick={(event) => {
                    event.stopPropagation();
                    window.open(fileURL, '_blank', 'noopener,noreferrer');
                }}
            >
                <BookOpen className="size-4" strokeWidth={2} aria-hidden="true" />
                View Book
            </button>
        </article>
    )
}

export default BookCard;