import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { Globe, Lock } from "lucide-react";
import HeroSection from "@/components/HeroSection";
import Bookshelf from "@/components/shelf/Bookshelf";
import BooksSearchBar from "@/components/BooksSearchBar";
import { BookShelf, getAllBooks } from "@/lib/actions/book.actions";

export const dynamic = 'force-dynamic';

interface HomePageProps {
  searchParams: Promise<{
    query?: string;
    shelf?: string;
  }>;
}

const SHELF_TABS: { value: BookShelf; label: string; Icon: typeof Globe }[] = [
  { value: 'public', label: 'Public Library', Icon: Globe },
  { value: 'mine', label: 'My Books', Icon: Lock },
];

const page = async ({ searchParams }: HomePageProps) => {
    const { query, shelf } = await searchParams;
    const searchQuery = query?.trim() ?? "";
    const activeShelf: BookShelf = shelf === 'mine' ? 'mine' : 'public';
    const { userId } = await auth();

    const bookResults = await getAllBooks(searchQuery, activeShelf);

    const books = bookResults.success ? bookResults.data ?? [] : [];

    // Keep the search text when switching shelves
    const tabHref = (value: BookShelf) => {
      const params = new URLSearchParams();
      if (value === 'mine') params.set('shelf', 'mine');
      if (searchQuery) params.set('query', searchQuery);
      return params.toString() ? `/?${params.toString()}` : '/';
    };

  return (
    <main className="wrapper container">
      <HeroSection />

      <section className="mt-10 mb-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <nav className="shelf-tabs" aria-label="Book shelves">
          {SHELF_TABS.map(({ value, label, Icon }) => (
            <Link
              key={value}
              href={tabHref(value)}
              scroll={false}
              aria-current={activeShelf === value ? 'page' : undefined}
              className={`shelf-tab ${activeShelf === value ? 'shelf-tab-active' : ''}`}
            >
              <Icon className="size-4" aria-hidden="true" />
              {label}
            </Link>
          ))}
        </nav>
        <BooksSearchBar initialQuery={searchQuery} />
      </section>

      {activeShelf === 'mine' && !userId ? (
        <div className="shelf-empty">
          <p>Sign in to see the books you have uploaded, including your private ones.</p>
          <Link href="/sign-in" className="history-empty-cta inline-block">Sign in</Link>
        </div>
      ) : (
        <Bookshelf
          books={books.map((book) => ({
            id: String(book._id),
            title: book.title,
            author: book.author,
            coverURL: book.coverURL,
            fileURL: book.fileURL,
            slug: book.slug,
            isPublic: book.isPublic !== false,
          }))}
        />
      )}
    </main>
  );
};

export default page;
