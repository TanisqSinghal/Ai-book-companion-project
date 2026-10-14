import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { Clock, MessageSquare } from "lucide-react";
import { getSessionHistory } from "@/lib/actions/session.actions";
import { formatDuration } from "@/lib/utils";

export const dynamic = 'force-dynamic';

const dateFormatter = new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
});

const page = async () => {
    const { userId } = await auth();

    if (!userId) {
        redirect("/sign-in");
    }

    const result = await getSessionHistory();
    const sessions = result.data ?? [];

    return (
        <main className="wrapper container">
            <section className="mx-auto max-w-4xl">
                <h1 className="page-title-xl">Conversation History</h1>
                <p className="subtitle mt-3">Revisit what you talked about with your books.</p>

                {!result.success ? (
                    <div className="history-empty mt-10">
                        <p className="transcript-empty-text">Couldn&apos;t load your history</p>
                        <p className="transcript-empty-hint">{result.error}</p>
                    </div>
                ) : sessions.length === 0 ? (
                    <div className="history-empty mt-10">
                        <MessageSquare className="size-10 text-(--text-secondary)" />
                        <p className="transcript-empty-text mt-3">No conversations yet</p>
                        <p className="transcript-empty-hint">Open a book and start talking. Your conversations will show up here.</p>
                        <Link href="/" className="history-empty-cta">Go to Library</Link>
                    </div>
                ) : (
                    <ul className="history-list mt-10">
                        {sessions.map((session) => (
                            <li key={session._id}>
                                <Link href={`/history/${session._id}`} className="history-card">
                                    <Image
                                        src={session.book?.coverURL || '/assets/book-cover.svg'}
                                        alt=""
                                        width={48}
                                        height={72}
                                        className="history-card-cover"
                                    />
                                    <div className="min-w-0 flex-1">
                                        <h2 className="history-card-title">{session.book?.title ?? "Deleted book"}</h2>
                                        {session.book?.author && (
                                            <p className="history-card-author">{session.book.author}</p>
                                        )}
                                        {session.preview && (
                                            <p className="history-card-preview">&ldquo;{session.preview}&rdquo;</p>
                                        )}
                                    </div>
                                    <div className="history-card-meta">
                                        <time dateTime={session.startedAt}>{dateFormatter.format(new Date(session.startedAt))}</time>
                                        <span className="flex items-center gap-1.5">
                                            <Clock className="size-3.5" />
                                            {formatDuration(session.durationSeconds)}
                                        </span>
                                        <span className="flex items-center gap-1.5">
                                            <MessageSquare className="size-3.5" />
                                            {session.messageCount}
                                        </span>
                                    </div>
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </main>
    );
};

export default page;
