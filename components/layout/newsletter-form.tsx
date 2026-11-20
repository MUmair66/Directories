"use client";
import { useState, useTransition } from "react";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { subscribeNewsletter } from "@/app/actions/public-forms";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [pending, start] = useTransition();
  return (
    <form
      className="flex overflow-hidden rounded-lg bg-white ring-1 ring-white/20 focus-within:ring-2 focus-within:ring-[#DFA9F7]"
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
        placeholder="Enter your email"
        className="h-11 min-w-0 flex-1 bg-transparent px-3.5 text-sm text-ink placeholder:text-slate-500 focus:outline-none"
      />
      <button type="submit" disabled={pending} aria-label="Subscribe" className="flex h-11 w-12 shrink-0 items-center justify-center bg-primary text-white transition-colors hover:bg-primary-dark dark:hover:bg-purple-500 disabled:opacity-60">
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Send className="size-4" aria-hidden />}
      </button>
    </form>
  );
}
