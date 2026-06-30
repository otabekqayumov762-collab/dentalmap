import { Building2, CalendarDays, Clock, Heart, LockKeyhole, MapPin, Phone, Send, Star } from "lucide-react";
import { useState, type FormEvent } from "react";
import { DoctorAvatar } from "../components/common";
import { isSafeHttpUrl, openExternal } from "../lib/url";
import type { Doctor, DoctorReview } from "../types";
import { Button, Card, TextareaField, cn } from "../ui";

export function DoctorDetailView({
  doctor,
  reviews,
  canWriteReview,
  isSaved,
  onAppointment,
  onToggleSaved,
  onReviewSubmit
}: {
  doctor: Doctor;
  reviews: DoctorReview[];
  canWriteReview: boolean;
  isSaved: boolean;
  onAppointment: (doctor: Doctor) => void;
  onToggleSaved: () => void;
  onReviewSubmit: (rating: number, text: string) => Promise<string | void>;
}) {
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [reviewError, setReviewError] = useState("");
  const [reviewSent, setReviewSent] = useState(false);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  async function submitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanText = text.trim();

    if (!canWriteReview) {
      setReviewError("Sharh qoldirish qabuldan keyin ochiladi.");
      return;
    }
    if (!cleanText) {
      setReviewError("Izoh matnini yozing.");
      return;
    }

    setReviewSubmitting(true);
    const error = await onReviewSubmit(rating, cleanText);
    setReviewSubmitting(false);
    if (error) {
      setReviewError(error);
      return;
    }
    setText("");
    setReviewError("");
    setReviewSent(true);
  }

  return (
    <div className="flex flex-col gap-4">
      <Card as="section" className="flex items-start gap-3">
        <DoctorAvatar doctor={doctor} size="lg" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-bold text-ink-900">{doctor.name}</h1>
          <p className="text-sm text-ink-600">{doctor.specialty}</p>
          <span className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-ink-700">
            <Star size={15} className="fill-warning text-warning" /> {doctor.rating || "0.0"}
            <em className="ml-1 not-italic text-xs font-normal text-ink-400">{doctor.reviews} sharh</em>
          </span>
        </div>
        <button
          type="button"
          aria-pressed={isSaved}
          onClick={onToggleSaved}
          className={cn(
            "inline-flex shrink-0 flex-col items-center gap-1 rounded-2xl px-3 py-2 text-xs font-semibold transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 active:scale-95",
            isSaved ? "bg-rose-50 text-danger" : "bg-surface-100 text-ink-500 hover:bg-surface-200"
          )}
        >
          <Heart size={18} className={cn(isSaved && "fill-danger")} />
          <span>{isSaved ? "Saqlangan" : "Saqlash"}</span>
        </button>
      </Card>

      <Card as="section" className="flex flex-col gap-3">
        <span className="flex items-center gap-2.5 text-ink-700">
          <Building2 size={17} className="shrink-0 text-brand-500" />
          <strong className="font-medium">{doctor.clinic}</strong>
        </span>
        <span className="flex flex-col gap-0.5">
          <span className="flex items-center gap-2.5 text-ink-700">
            <MapPin size={17} className="shrink-0 text-brand-500" />
            <strong className="font-medium">{doctor.district}</strong>
          </span>
          <small className="pl-7 text-xs text-ink-400">{doctor.address || "Manzil kiritilmagan"}</small>
        </span>
        <span className="flex items-center gap-2.5 text-ink-700">
          <Phone size={17} className="shrink-0 text-brand-500" />
          <strong className="font-medium">{doctor.phone || "Telefon kiritilmagan"}</strong>
        </span>
        <span className="flex items-center gap-2.5 text-ink-700">
          <Clock size={17} className="shrink-0 text-brand-500" />
          <strong className="font-medium">{doctor.experience || "Tajriba kiritilmagan"}</strong>
        </span>
      </Card>

      {isSafeHttpUrl(doctor.locationUrl) && (
        <Button variant="secondary" size="lg" type="button" onClick={() => openExternal(doctor.locationUrl)}>
          <MapPin size={17} />
          Lokatsiyani ochish
        </Button>
      )}
      <Button size="lg" type="button" onClick={() => onAppointment(doctor)}>
        <CalendarDays size={18} />
        Qabulga yozilish
      </Button>

      <Card as="section" className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between gap-2">
          <strong className="text-ink-900">Sharhlar</strong>
          <small className="text-xs text-ink-400">
            {reviews.length ? `${reviews.length} ta tasdiqlangan sharh` : "Hali tasdiqlangan sharh yo'q"}
          </small>
        </div>

        <div className="flex flex-col gap-3">
          {reviews.map((review) => (
            <article key={review.id} className="rounded-2xl bg-surface-50 p-3">
              <div className="flex items-baseline justify-between gap-2">
                <strong className="text-sm text-ink-900">{review.author}</strong>
                <small className="text-xs text-ink-400">{review.date}</small>
              </div>
              <span className="mt-1 flex gap-0.5" aria-label={`${review.rating} yulduz`}>
                {Array.from({ length: 5 }, (_, index) => (
                  <Star
                    key={index}
                    size={14}
                    className={index < review.rating ? "fill-warning text-warning" : "text-surface-200"}
                  />
                ))}
              </span>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-600">{review.text}</p>
            </article>
          ))}
        </div>

        {canWriteReview ? (
          <form className="flex flex-col gap-3" onSubmit={submitReview}>
            <div className="flex gap-1.5" aria-label="Reyting tanlash">
              {Array.from({ length: 5 }, (_, index) => {
                const value = index + 1;

                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={value <= rating}
                    className={cn(
                      "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 active:scale-95",
                      value <= rating ? "text-warning" : "text-surface-200 hover:text-ink-400"
                    )}
                    onClick={() => {
                      setRating(value);
                      setReviewError("");
                    }}
                  >
                    <Star size={22} className={cn(value <= rating && "fill-warning")} />
                  </button>
                );
              })}
            </div>
            <TextareaField
              value={text}
              onChange={(event) => {
                setText(event.target.value);
                setReviewError("");
                setReviewSent(false);
              }}
              placeholder="Ko'rikdan keyingi fikringiz"
            />
            {reviewError && <small className="text-xs font-medium text-danger">{reviewError}</small>}
            {reviewSent && <small className="text-xs font-medium text-success">Sharh moderatsiyaga yuborildi.</small>}
            <Button type="submit" size="lg" disabled={reviewSubmitting}>
              <Send size={17} />
              {reviewSubmitting ? "Yuborilmoqda" : "Sharh yuborish"}
            </Button>
          </form>
        ) : (
          <div className="flex items-center gap-2.5 rounded-2xl bg-surface-50 px-3 py-3 text-sm text-ink-500">
            <LockKeyhole size={17} className="shrink-0 text-ink-400" />
            <span>Sharh yozish faqat qabuldan keyin ochiladi. Hozircha faqat o&apos;qish mumkin.</span>
          </div>
        )}
      </Card>
    </div>
  );
}
