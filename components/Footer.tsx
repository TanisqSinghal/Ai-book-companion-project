import Link from "next/link";
import Image from "next/image";

const FOOTER_COLUMNS = [
  {
    title: "Explore",
    links: [
      { label: "Library", href: "/" },
      { label: "My Books", href: "/?shelf=mine" },
      { label: "Add a Book", href: "/books/new" },
      { label: "History", href: "/history" },
    ],
  },
  {
    title: "Lumora",
    links: [
      { label: "Pricing", href: "/subscriptions" },
      { label: "About Us", href: "/about" },
    ],
  },
];

const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="wrapper site-footer-inner">
        <div className="site-footer-brand">
          <Link href="/" className="flex gap-2 items-center w-fit">
            <Image src="/assets/lumora-mark.png" alt="" width={32} height={32} />
            <span className="logo-text">Lumora</span>
          </Link>
          <p className="site-footer-tagline">
            Turn your books into voice conversations. Upload a PDF, then ask questions, get summaries and discuss ideas out loud.
          </p>
        </div>

        <nav className="site-footer-columns" aria-label="Footer">
          {FOOTER_COLUMNS.map((column) => (
            <div key={column.title}>
              <h2 className="site-footer-heading">{column.title}</h2>
              <ul className="site-footer-links">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="site-footer-link">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>

      <div className="wrapper site-footer-bottom">
        <p>&copy; {year} Lumora. All rights reserved.</p>
        <p>
          Made by{" "}
          <Link href="/about" className="site-footer-link">
            Tanishak &amp; Rahul
          </Link>
        </p>
      </div>
    </footer>
  );
};

export default Footer;
