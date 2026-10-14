"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
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

  return (
    <header className="w-full fixed z-50 bg-(--bg-primary)/85 backdrop-blur-md border-b border-(--border-subtle)">
      <div className="wrapper navbar-height py-4 flex justify-between items-center">
        <Link href="/" className="flex gap-2 items-center">
          <Image src="/assets/lumora-mark.png" alt="Lumora" width={40} height={40} priority />
          <span className="logo-text">Lumora</span>
        </Link>

        <nav className="w-fit flex gap-7.5 items-center">
          {navItems.map(({ label, href }) => {
            const isActive =
              pathName === href || (href !== "/" && pathName.startsWith(href));

            return (
              <Link
                href={href}
                key={label}
                className={cn(
                  "nav-link-base",
                  isActive ? "nav-link-active" : "text-(--text-primary) hover:opacity-70",
                )}
              >
                {label}
              </Link>
            );
          })}

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
      </div>
    </header>
  );
};

export default Navbar;
