import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { Logo } from "./Logo";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="max-w-6xl mx-auto flex items-center justify-between h-16 px-6">
        <Link href="/projetos" className="hover:opacity-80 transition-opacity">
          <Logo />
        </Link>
        <UserButton
          appearance={{
            elements: {
              userButtonAvatarBox: "h-9 w-9",
            },
          }}
        />
      </div>
    </header>
  );
}
