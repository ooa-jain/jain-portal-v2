"use client";

import { RotateCcw } from "lucide-react";
import { Clouds, Mascot } from "@/components/mascot";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-4 py-12 text-center">
      <Clouds />
      <Mascot mood="worried" className="relative w-48 drop-shadow-[0_18px_24px_rgba(35,38,63,.2)]" />
      <h1 className="relative mt-4 text-[32px] font-bold tracking-tight text-[#23263f]">Something went wrong</h1>
      <p className="relative mt-2 max-w-md text-[15px] text-[#66708a]">
        The portal could not complete this request. Your saved work is not affected. Try again in a moment.
      </p>
      <button
        type="button"
        onClick={reset}
        className="relative mt-8 inline-flex items-center gap-2 rounded-xl bg-[#23263f] px-5 py-2.5 text-[14px] font-bold text-white hover:bg-[#353a63]"
      >
        <RotateCcw className="size-4" />
        Try again
      </button>
    </main>
  );
}
