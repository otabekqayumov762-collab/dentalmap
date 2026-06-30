import { CheckCircle2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { feedbackTopics } from "../catalog";
import { Button, Chip, Field, PhoneField, TextareaField } from "../ui";

export function FeedbackView() {
  const [sent, setSent] = useState(false);
  const [topic, setTopic] = useState("");

  function submitFeedback(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSent(true);
  }

  return (
    <div className="flex flex-col gap-3">
      <form
        className="flex flex-col gap-4 rounded-card border border-surface-100 bg-surface-0 p-4 shadow-card"
        onSubmit={submitFeedback}
      >
        <Field label="F.I.O." placeholder="F.I.O." />
        <PhoneField label="Telefon raqam" />

        <fieldset className="min-w-0 border-0 p-0">
          <legend className="mb-1.5 block text-sm font-medium text-ink-700">Mavzu</legend>
          <input type="hidden" name="topic" value={topic} />
          <div className="flex flex-wrap gap-2">
            {feedbackTopics.map((option) => (
              <Chip key={option} active={topic === option} onClick={() => setTopic(option)}>
                {topic === option && <CheckCircle2 size={14} />}
                {option}
              </Chip>
            ))}
          </div>
        </fieldset>

        <TextareaField label="Xabar" placeholder="Xabaringizni yozing" />

        <Button type="submit" size="lg">
          <CheckCircle2 size={18} />
          Administratorga yuborish
        </Button>
      </form>

      {sent && (
        <div className="flex items-center gap-3 rounded-card bg-emerald-50 p-4 text-emerald-700 shadow-card">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 size={18} />
          </span>
          <span className="flex flex-col">
            <strong className="text-[0.95rem] font-semibold">Xabar yuborildi</strong>
            <small className="text-xs text-emerald-600">Administrator xabaringizni ko&apos;rib chiqadi.</small>
          </span>
        </div>
      )}
    </div>
  );
}
