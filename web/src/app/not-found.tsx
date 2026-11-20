import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { Mascot } from "@/components/mascot";

export default function NotFound() {
  return (
    <main className="relative flex flex-1 flex-col overflow-hidden bg-background">
      <header className="relative flex items-center justify-between px-6 py-5">
        <Link href="/" aria-label="Jain OOA Portal home">
          <Image src="/brand/jain-logo.png" alt="JAIN (Deemed-to-be University)" width={900} height={223} className="h-11 w-auto" />
        </Link>
        <Link href="/login" className="rounded-full bg-primary px-4 py-2 text-[13px] font-bold text-white shadow-[0_6px_16px_-8px_rgba(35,38,63,.5)] hover:bg-primary/90">
          Log in
        </Link>
      </header>

      <div className="relative flex flex-1 flex-col items-center justify-center px-4 pb-12">
        <div className="relative flex w-full max-w-[860px] items-center justify-center">
          <span aria-hidden className="select-none text-[clamp(160px,34vw,380px)] font-extrabold leading-none tracking-tight text-border">
            404
          </span>
          <Mascot mood="confused" followPointer className="absolute left-1/2 top-1/2 w-[clamp(180px,30vw,300px)] -translate-x-1/2 -translate-y-[46%] drop-shadow-[0_20px_26px_rgba(35,38,63,.22)]" />
        </div>
        <h1 className="mt-2 text-center text-[clamp(28px,4.4vw,44px)] font-bold tracking-tight text-foreground">Oops, I think we&apos;re lost</h1>
        <p className="mt-2 text-center text-[15px] text-muted-foreground">Let&apos;s get you back somewhere familiar…</p>
        <Link
          href="/"
          className="mt-8 inline-flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-2.5 text-[14px] font-bold text-foreground shadow-[0_8px_18px_-10px_rgba(35,38,63,.45)] hover:bg-muted"
        >
          <ArrowLeft className="size-4" />
          Back to home
        </Link>
      </div>
    </main>
  );
}
