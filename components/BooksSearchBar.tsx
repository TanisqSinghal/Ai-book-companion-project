'use client'

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

interface BooksSearchBarProps {
  initialQuery?: string;
}

const DEBOUNCE_MS = 400;

const BooksSearchBar = ({ initialQuery = "" }: BooksSearchBarProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState(initialQuery);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const trimmedQuery = query.trim();
      const params = new URLSearchParams(window.location.search);

      if (trimmedQuery) {
        params.set("query", trimmedQuery);
      } else {
        params.delete("query");
      }

      const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
      const currentUrl = `${window.location.pathname}${window.location.search}`;

      if (nextUrl !== currentUrl) {
        router.replace(nextUrl, { scroll: false });
      }
    }, DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [pathname, query, router]);

  return (
    <div className="library-search-wrapper" role="search">
      <input
        type="search"
        name="query"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search by title or author"
        className="library-search-input"
        aria-label="Search books by title or author"
      />
    </div>
  );
};

export default BooksSearchBar;