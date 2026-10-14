import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { ArrowLeft, Mic } from "lucide-react";
import { getSessionById } from "@/lib/actions/session.actions";
import { formatDuration } from "@/lib/utils";

interface SessionPageProps {
    params: Promise<{
        sessionId: string;
    }>;
}

const dateFormatter = new Intl.DateTimeFormat("en", {
    dateStyle: "full",
    timeStyle: "short",
});

const page = async ({ params }: SessionPageProps) => {
    const { userId } = await auth();

    if (!userId) {
        redirect("/sign-in");
    }

    const { sessionId } = await params;
    const result = await getSessionById(sessionId);

    // The history list explains the paid-plan requirement
    if (result.requiresUpgrade) {
        redirect("/history");
    }

    if (!result.success || !result.data) {
        notFound();
    }

    const { book, messages, startedAt, durationSeconds } = result.data;

    return (
        <main className="wrapper container">
            <Link href="/history" className="back-btn-floating" aria-label="Back to history">
                <ArrowLeft className="size-5 text-(--text-primary)" />
            </Link>

            <section className="mx-auto max-w-4xl flex flex-col gap-6">
                <header className="history-detail-header">
                    <Image
                        src={book?.coverURL || '/assets/book-cover.svg'}
                        alt=""
                        width={64}
                        height={96}
                        className="history-card-cover"
                    />
                    <div className="min-w-0 flex-1">
                        <h1 className="book-title-lg">{book?.title ?? "Deleted book"}</h1>
                        {book?.author && <p className="history-card-author">{book.author}</p>}
                        <p className="history-detail-meta">
                            <time dateTime={startedAt}>{dateFormatter.format(new Date(startedAt))}</time>
                            {" · "}
                            {formatDuration(durationSeconds)}
                        </p>
                    </div>
                    {book?.slug && (
                        <Link href={`/books/${book.slug}`} className="history-continue-btn">
                            <Mic className="size-4" />
                            Talk again
                        </Link>
                    )}
                </header>

                <div className="transcript-container">
                    <div className="transcript-messages">
                        {messages.map((message, index) => {
                            const isUser = message.role === "user";

                            return (
                                <div
                                    key={`${message.role}-${index}`}
                                    className={`transcript-message ${isUser ? "transcript-message-user" : "transcript-message-assistant"}`}
                                >
                                    <div
                                        className={`transcript-bubble ${
                                            isUser ? "transcript-bubble-user" : "transcript-bubble-assistant"
                                        }`}
                                    >
                                        {message.content}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>
        </main>
    );
};

export default page;
