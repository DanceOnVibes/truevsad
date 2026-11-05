"use client";

import type { FormEvent, ReactNode } from "react";
import { useRouter } from "next/navigation";

/**
 * The homepage scanner. The pasted deal (which can contain names or a booking reference) is
 * handed to the X-ray page inside this browser tab, never in the page address, so it doesn't
 * end up in browser history or our host's request logs. Without JavaScript the form still
 * works the old way (?deal=…), and the X-ray page cleans the address straight away.
 */
export function DealScannerForm({ children }: { children: ReactNode }) {
  const router = useRouter();
  function onSubmit(e: FormEvent<HTMLFormElement>) {
    const deal = String(new FormData(e.currentTarget).get("deal") ?? "").trim();
    if (!deal) return;
    try {
      sessionStorage.setItem("truevsad-deal", deal.slice(0, 5000));
    } catch {
      return; // no storage (private mode etc.): fall back to the normal form submit
    }
    e.preventDefault();
    router.push("/xray");
  }
  return (
    <form className="scanner" action="/xray" method="get" onSubmit={onSubmit}>
      {children}
    </form>
  );
}
