import HeroSection from "@/components/HeroSection";
import BookCard from "@/components/BookCard";
import BooksSearchBar from "@/components/BooksSearchBar";
import { getAllBooks } from "@/lib/actions/book.actions";

export const dynamic = 'force-dynamic';

interface HomePageProps {
  searchParams: Promise<{
    query?: string;
  }>;
}

const page = async ({ searchParams }: HomePageProps) => {
    const { query } = await searchParams;
    const searchQuery = query?.trim() ?? "";

    const bookResults = await getAllBooks(searchQuery);

    const books = bookResults.success ? bookResults.data ?? [] : [];

  return (
    <main className="wrapper container">
      <HeroSection />

      <section className="mt-10 mb-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="section-title">Recent Books</h2>
        <BooksSearchBar initialQuery={searchQuery} />
      </section>

      <div className="library-books-grid">
        {books.map((book) => (
          <BookCard key={book._id} title={book.title} author={book.author} coverURL={book.coverURL} slug={book.slug} />
        ))}
      </div>
    </main>
  );
};

export default page;
