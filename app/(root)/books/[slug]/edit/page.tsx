import { notFound, redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import EditBookForm from "@/components/EditBookForm";
import { getBookBySlug } from "@/lib/actions/book.actions";

interface EditBookPageProps {
    params: Promise<{
        slug: string;
    }>;
}

const page = async ({ params }: EditBookPageProps) => {
    const { userId } = await auth();

    if (!userId) {
        redirect("/sign-in");
    }

    const { slug } = await params;
    const result = await getBookBySlug(slug);

    // Only the uploader can edit; to everyone else the page doesn't exist
    if (!result.success || !result.data || result.data.clerkId !== userId) {
        notFound();
    }

    const book = result.data;

    return (
        <main className="wrapper container">
            <div className="mx-auto max-w-180 space-y-10">
                <section className="flex flex-col gap-5 text-center">
                    <h1 className="page-title-xl">Edit Book</h1>
                    <p className="subtitle">Update the details of &ldquo;{book.title}&rdquo;</p>
                </section>
                <EditBookForm
                    book={{
                        id: String(book._id),
                        title: book.title,
                        author: book.author,
                        persona: book.persona,
                        isPublic: book.isPublic !== false,
                        coverURL: book.coverURL,
                    }}
                />
            </div>
        </main>
    );
};

export default page;
