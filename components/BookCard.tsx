"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {BookCardProps} from "@/types";
import Image from "next/image";

const BookCard = ({ title, author, coverURL, slug }: BookCardProps) => {
    const { userId } = useAuth();
    const router = useRouter();

    const handleBookClick = (e: React.MouseEvent) => {
        e.preventDefault();
        
        if (!userId) {
            toast.error("Please sign in or sign up first to access this book");
            return;
        }
        
        router.push(`/books/${slug}`);
    };

    return  (
        <article className="book-card" onClick={handleBookClick} style={{ cursor: 'pointer' }}>
            <figure className="book-card-figure">
                <div className="book-card-cover-wrapper">
                    <Image src={coverURL} alt={title} width={133} height={200} className="book-card-cover" />
                </div>
                
                <figcaption className="book-card-meta">
                    <h3 className="book-card-title">{title}</h3>
                    <p className="book-card-author">{author}</p>
                </figcaption>
            </figure>
        </article>
    )
}

export default BookCard;