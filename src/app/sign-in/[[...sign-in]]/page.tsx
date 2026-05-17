import { SignIn } from "@clerk/nextjs";
import Link from "next/link";
import { Logo } from "@/components/brand/Logo";

export default function SignInPage() {
  return (
    <main className="min-h-screen bg-surface flex flex-col">
      <header className="px-8 py-6">
        <Link href="/">
          <Logo size={28} />
        </Link>
      </header>
      <div className="flex-1 flex items-center justify-center px-6 -mt-12">
        <SignIn />
      </div>
    </main>
  );
}
