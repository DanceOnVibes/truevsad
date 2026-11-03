"use client";

import Link from "next/link";
import { EMAILS } from "@/lib/company";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main>
      <h1>Something went wrong</h1>
      <p className="lead">
        This page hit an error on our side. Nothing you entered was saved. Please try again in a moment.
      </p>
      <div className="card">
        <button type="button" onClick={() => reset()}>
          Try again
        </button>
        <p className="hint">
          Still not working? Tell us at <a href={`mailto:${EMAILS.hello}`}>{EMAILS.hello}</a>, or go back{" "}
          <Link href="/">home</Link>.
        </p>
      </div>
    </main>
  );
}
