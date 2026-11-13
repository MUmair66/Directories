"use client";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/primitives";

export type FaqItem = { question: string; answer: string };

/** Editable list of question/answer pairs (Top Pros pages and other FAQ blocks). */
export function FaqEditor({ id, value, onChange, error }: { id: string; value: FaqItem[]; onChange: (v: FaqItem[]) => void; error?: string }) {
  const update = (i: number, patch: Partial<FaqItem>) => onChange(value.map((f, j) => (j === i ? { ...f, ...patch } : f)));
  const move = (i: number, d: -1 | 1) => {
    const next = [...value];
    const [item] = next.splice(i, 1);
    next.splice(i + d, 0, item!);
    onChange(next);
  };
  return (
    <div className="grid gap-3" id={id}>
      {value.length === 0 && <p className="text-sm text-muted-foreground">No questions yet.</p>}
      {value.map((f, i) => (
        <div key={i} className="grid gap-2 rounded-md border border-border bg-surface p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-muted-foreground">Question {i + 1}</span>
            <div className="flex gap-0.5">
              <Button type="button" size="icon-sm" variant="ghost" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up">
                <ArrowUp aria-hidden />
              </Button>
              <Button type="button" size="icon-sm" variant="ghost" disabled={i === value.length - 1} onClick={() => move(i, 1)} aria-label="Move down">
                <ArrowDown aria-hidden />
              </Button>
              <Button type="button" size="icon-sm" variant="ghost" onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label={`Remove question ${i + 1}`}>
                <Trash2 className="text-danger" aria-hidden />
              </Button>
            </div>
          </div>
          <Label htmlFor={`${id}-q-${i}`} className="sr-only">
            Question {i + 1}
          </Label>
          <Input id={`${id}-q-${i}`} value={f.question} placeholder="Question" onChange={(e) => update(i, { question: e.target.value })} />
          <Label htmlFor={`${id}-a-${i}`} className="sr-only">
            Answer {i + 1}
          </Label>
          <Textarea id={`${id}-a-${i}`} value={f.answer} placeholder="Answer" rows={3} onChange={(e) => update(i, { answer: e.target.value })} />
        </div>
      ))}
      {error && <p className="text-sm text-danger" role="alert">{error}</p>}
      <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => onChange([...value, { question: "", answer: "" }])}>
        <Plus aria-hidden /> Add question
      </Button>
    </div>
  );
}
