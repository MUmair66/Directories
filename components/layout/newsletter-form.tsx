"use client";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { subscribeNewsletter } from "@/app/actions/public-forms";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [pending, start] = useTransition();
  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await subscribeNewsletter({ email });
          if (res.ok) {
            toast.success(res.message ?? "Subscribed");
            setEmail("");
          } else toast.error(res.message);
        });
      }}
    >
      <label htmlFor="newsletter-email" className="sr-only">
        Email address
      </label>
      <input
        id="newsletter-email"
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@company.com"
        className="h-10 min-w-0 flex-1 rounded-md border border-slate-700 bg-slate-800 px-3 text-sm text-white placeholder:text-slate-500 focus-visible:outline-2 focus-visible:outline-primary"
      />
      <button type="submit" disabled={pending} className="h-10 rounded-md bg-primary px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
        {pending ? "…" : "Subscribe"}
      </button>
    </form>
  );
}
