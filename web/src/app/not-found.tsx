import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { Clouds, Mascot } from "@/components/mascot";

export default function NotFound() {
  return (
    <main className="relative flex flex-1 flex-col overflow-hidden bg-[linear-gradient(180deg,#7fb4e6_0%,#a9cdee_35%,#d9ebfb_70%,#eef5fc_100%)]">
      <Clouds />
      <header className="relative flex items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-2 text-[17px] font-bold text-white [text-shadow:0_1px_6px_rgba(35,38,63,.25)]">
          <Image src="/brand/jgi-icon-192.png" alt="" width={28} height={28} className="rounded-full" />
          Jain OOA Portal
        </Link>
        <Link href="/login" className="rounded-xl bg-white px-4 py-2 text-[13px] font-bold text-[#23263f] shadow-[0_6px_16px_-8px_rgba(35,38,63,.5)] hover:bg-[#f5f9fe]">
          Log in
        </Link>
      </header>

      <div className="relative flex flex-1 flex-col items-center justify-center px-4 pb-12">
        <div className="relative flex w-full max-w-[860px] items-center justify-center">
          <span aria-hidden className="select-none text-[clamp(160px,34vw,380px)] font-extrabold leading-none tracking-tight text-white/85">
            404
          </span>
          <Mascot mood="confused" followPointer className="absolute left-1/2 top-1/2 w-[clamp(180px,30vw,300px)] -translate-x-1/2 -translate-y-[46%] drop-shadow-[0_20px_26px_rgba(35,38,63,.22)]" />
        </div>
        <h1 className="mt-2 text-center text-[clamp(28px,4.4vw,44px)] font-bold tracking-tight text-[#23263f]">Oops, I think we&apos;re lost</h1>
        <p className="mt-2 text-center text-[15px] text-[#66708a]">Let&apos;s get you back somewhere familiar…</p>
        <Link
          href="/"
          className="mt-8 inline-flex items-center gap-2 rounded-xl border border-[#dbe6f2] bg-white px-5 py-2.5 text-[14px] font-bold text-[#23263f] shadow-[0_8px_18px_-10px_rgba(35,38,63,.45)] hover:bg-[#f5f9fe]"
        >
          <ArrowLeft className="size-4" />
          Back to home
        </Link>
      </div>
    </main>
  );
}
