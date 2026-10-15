"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { SignInButton, SignUpButton, Show, UserButton, useUser } from "@clerk/nextjs";
const navItems = [
  { label: "Library", href: "/" },
  { label: "Add New", href: "/books/new" },
  { label: "History", href: "/history" },
  { label: "Pricing", href: "/subscriptions" },
  { label: "About", href: "/about" },
];

const Navbar = () => {
  const pathName = usePathname();
  const { user } = useUser();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (href: string) => pathName === href || (href !== "/" && pathName.startsWith(href));
  const closeMenu = () => setMenuOpen(false);

  // Escape closes the mobile menu
  useEffect(() => {
    if (!menuOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  return (
    <header className="w-full fixed z-50 bg-(--bg-primary)/85 backdrop-blur-md border-b border-(--border-subtle)">
      <div className="wrapper navbar-height py-4 flex justify-between items-center">
        <Link href="/" className="flex gap-2 items-center" onClick={closeMenu}>
          <Image src="/assets/lumora-mark.png" alt="Lumora" width={40} height={40} priority />
          <span className="logo-text">Lumora</span>
        </Link>

        {/* Desktop */}
        <nav className="hidden lg:flex w-fit gap-7.5 items-center">
          {navItems.map(({ label, href }) => (
            <Link
              href={href}
              key={label}
              className={cn(
                "nav-link-base",
                isActive(href) ? "nav-link-active" : "text-(--text-primary) hover:opacity-70",
              )}
            >
              {label}
            </Link>
          ))}

          <div className="flex gap-7.5 items-center">
            <Show when="signed-out">
              <SignInButton mode="modal">
                <button className="text-(--text-primary) hover:opacity-70">Sign In</button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="text-(--text-primary) hover:opacity-70">Sign Up</button>
              </SignUpButton>
            </Show>

            <Show when="signed-in">
                <div className="nav-user-link">
                    <UserButton />
                    {user?.firstName && (
                        <Link href="/subscriptions" className="nav-user-name">
                            {user.firstName}
                        </Link>
                    )}
                </div>
            </Show>
          </div>
        </nav>

        {/* Mobile and tablet: avatar stays visible, everything else lives in the menu */}
        <div className="flex lg:hidden items-center gap-3">
          <Show when="signed-in">
            <UserButton />
          </Show>
          <button
            type="button"
            className="nav-menu-toggle"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
          >
            {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav id="mobile-nav" className="nav-mobile-panel lg:hidden" aria-label="Main">
          {navItems.map(({ label, href }) => (
            <Link
              href={href}
              key={label}
              onClick={closeMenu}
              aria-current={isActive(href) ? "page" : undefined}
              className={cn("nav-mobile-link", isActive(href) && "nav-mobile-link-active")}
            >
              {label}
            </Link>
          ))}

          <Show when="signed-out">
            <div className="nav-mobile-auth">
              <SignInButton mode="modal">
                <button type="button" className="nav-mobile-auth-btn" onClick={closeMenu}>Sign In</button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button type="button" className="nav-mobile-auth-btn nav-mobile-auth-btn-primary" onClick={closeMenu}>Sign Up</button>
              </SignUpButton>
            </div>
          </Show>
        </nav>
      )}
    </header>
  );
};

export default Navbar;
