import { getBookBySlug } from "@/lib/actions/book.actions";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import VapiControls from "@/components/VapiControls";
interface BookPageProps {
    params: Promise<{
        slug: string;
    }>;
}

const page = async ({ params }: BookPageProps) => {

    const { userId } = await auth();

    if (!userId) {
        redirect("/sign-in");
    }

    const { slug } = await params;

    const result = await getBookBySlug(slug);

    if (!result.success || !result.data) {
        redirect('/');
    }

    const book = result.data;

    return (
        <main className="book-page-container">
            <Link href="/" className="back-btn-floating" aria-label="Go back">
                <ArrowLeft className="size-5 text-[#212a3b]" />
            </Link>

            <div className="mx-auto max-w-6xl flex flex-col gap-6">
                {/* VAPI Controls area */}
                <VapiControls book={book}/>
            </div>
        </main>
    )
}

export default page;