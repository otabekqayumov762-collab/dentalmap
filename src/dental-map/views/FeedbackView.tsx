import { CheckCircle2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { feedbackTopics } from "../catalog";
import { ChoiceField } from "../components/common";

export function FeedbackView() {
  const [sent, setSent] = useState(false);
  const [topic, setTopic] = useState("");

  function submitFeedback(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSent(true);
  }

  return (
    <div className="view-stack">
      <form className="consult-form" onSubmit={submitFeedback}>
        <label>
          <span>F.I.O.</span>
          <input placeholder="F.I.O." />
        </label>
        <label>
          <span>Telefon raqam</span>
          <input placeholder="+998 ..." />
        </label>
        <ChoiceField
          label="Mavzu"
          name="topic"
          value={topic}
          options={feedbackTopics}
          onChange={setTopic}
        />
        <label>
          <span>Xabar</span>
          <textarea placeholder="Xabaringizni yozing" />
        </label>
        <button className="primary-btn submit" type="submit">
          <CheckCircle2 size={18} />
          Administratorga yuborish
        </button>
      </form>
      {sent && (
        <div className="admin-status sent">
          <CheckCircle2 size={18} />
          <span>
            <strong>Xabar yuborildi</strong>
            <small>Administrator xabaringizni ko&apos;rib chiqadi.</small>
          </span>
        </div>
      )}
    </div>
  );
}
