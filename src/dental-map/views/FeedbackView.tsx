import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import { feedbackTopics } from "../catalog";
import { Button, Chip, TextareaField } from "../ui";

export function FeedbackView({
  onSubmit
}: {
  onSubmit: (payload: { topic: string; message: string; idempotencyKey: string }) => Promise<string>;
}) {
  const [sent, setSent] = useState(false);
  const [topic, setTopic] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const idempotencyKeyRef = useRef(crypto.randomUUID());

  function resetSubmissionIdentity() {
    idempotencyKeyRef.current = crypto.randomUUID();
  }

  async function submitFeedback(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!topic || message.trim().length < 5) {
      setError("Mavzu va kamida 5 belgili xabar kiriting.");
      return;
    }
    setSubmitting(true);
    setError("");
    const result = await onSubmit({ topic, message, idempotencyKey: idempotencyKeyRef.current });
    setSubmitting(false);
    if (result) {
      setError(result);
      return;
    }
    setSent(true);
    setMessage("");
    resetSubmissionIdentity();
  }

  return (
    <div className="flex flex-col gap-3">
      <form
        className="flex flex-col gap-4 rounded-card border border-surface-100 bg-surface-0 p-4 shadow-card"
        onSubmit={submitFeedback}
      >
        <fieldset className="min-w-0 border-0 p-0">
          <legend className="mb-1.5 block text-sm font-medium text-ink-700">Mavzu</legend>
          <input type="hidden" name="topic" value={topic} />
          <div className="flex flex-wrap gap-2">
            {feedbackTopics.map((option) => (
              <Chip
                key={option}
                active={topic === option}
                onClick={() => {
                  setTopic(option);
                  setError("");
                  setSent(false);
                  resetSubmissionIdentity();
                }}
              >
                {topic === option && <CheckCircle2 size={14} />}
                {option}
              </Chip>
            ))}
          </div>
        </fieldset>

        <TextareaField
          label="Xabar"
          name="message"
          minLength={5}
          maxLength={5000}
          required
          value={message}
          onChange={(event) => {
            setMessage(event.target.value);
            setError("");
            setSent(false);
            resetSubmissionIdentity();
          }}
          placeholder="Xabaringizni yozing"
          hint="Xabar hisobingizga bog'lanadi; F.I.O. va telefonni qayta kiritish shart emas."
        />

        {error && (
          <div role="alert" className="flex items-center gap-2 rounded-2xl bg-danger/10 px-3 py-2.5 text-danger">
            <AlertTriangle size={16} className="shrink-0" />
            <small>{error}</small>
          </div>
        )}

        <Button type="submit" size="lg" disabled={submitting}>
          {submitting ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
          {submitting ? "Yuborilmoqda…" : "Administratorga yuborish"}
        </Button>
      </form>

      {sent && (
        <div className="flex items-center gap-3 rounded-card bg-success/10 p-4 text-success shadow-card">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success/15">
            <CheckCircle2 size={18} />
          </span>
          <span className="flex flex-col">
            <strong className="text-[0.95rem] font-semibold">Xabar yuborildi</strong>
            <small className="text-xs text-success">Administrator xabaringizni ko&apos;rib chiqadi.</small>
          </span>
        </div>
      )}
    </div>
  );
}
