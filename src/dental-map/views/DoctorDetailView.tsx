import { Building2, CalendarDays, Clock, Heart, LockKeyhole, MapPin, Phone, Send, Star } from "lucide-react";
import { useState, type FormEvent } from "react";
import { DoctorAvatar } from "../components/common";
import { isSafeHttpUrl, openExternal } from "../lib/url";
import type { Doctor, DoctorReview } from "../types";

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
    <div className="view-stack">
      <section className="doctor-detail">
        <DoctorAvatar doctor={doctor} size="lg" />
        <div>
          <h1>{doctor.name}</h1>
          <p>{doctor.specialty}</p>
          <span className="rating-line">
            <Star size={15} /> {doctor.rating || "0.0"}
            <em>{doctor.reviews} sharh</em>
          </span>
        </div>
        <button
          className={isSaved ? "detail-save active" : "detail-save"}
          type="button"
          aria-pressed={isSaved}
          onClick={onToggleSaved}
        >
          <Heart size={18} />
          <span>{isSaved ? "Saqlangan" : "Saqlash"}</span>
        </button>
      </section>
      <section className="detail-list">
        <span>
          <Building2 size={17} />
          <strong>{doctor.clinic}</strong>
        </span>
        <span>
          <MapPin size={17} />
          <strong>{doctor.district}</strong>
          <small>{doctor.address || "Manzil kiritilmagan"}</small>
        </span>
        <span>
          <Phone size={17} />
          <strong>{doctor.phone || "Telefon kiritilmagan"}</strong>
        </span>
        <span>
          <Clock size={17} />
          <strong>{doctor.experience || "Tajriba kiritilmagan"}</strong>
        </span>
      </section>
      {isSafeHttpUrl(doctor.locationUrl) && (
        <button
          className="secondary-btn"
          type="button"
          onClick={() => openExternal(doctor.locationUrl)}
        >
          <MapPin size={17} />
          Lokatsiyani ochish
        </button>
      )}
      <button className="primary-btn submit" type="button" onClick={() => onAppointment(doctor)}>
        <CalendarDays size={18} />
        Qabulga yozilish
      </button>
      <section className="reviews-panel">
        <div className="reviews-head">
          <strong>Sharhlar</strong>
          <small>{reviews.length ? `${reviews.length} ta tasdiqlangan sharh` : "Hali tasdiqlangan sharh yo'q"}</small>
        </div>

        <div className="review-list">
          {reviews.map((review) => (
            <article key={review.id} className="review-card">
              <div>
                <strong>{review.author}</strong>
                <small>{review.date}</small>
              </div>
              <span className="review-stars" aria-label={`${review.rating} yulduz`}>
                {Array.from({ length: 5 }, (_, index) => (
                  <Star key={index} size={14} className={index < review.rating ? "filled" : ""} />
                ))}
              </span>
              <p>{review.text}</p>
            </article>
          ))}
        </div>

        {canWriteReview ? (
          <form className="review-form" onSubmit={submitReview}>
            <div className="rating-picker" aria-label="Reyting tanlash">
              {Array.from({ length: 5 }, (_, index) => {
                const value = index + 1;

                return (
                  <button
                    key={value}
                    type="button"
                    className={value <= rating ? "active" : ""}
                    aria-pressed={value <= rating}
                    onClick={() => {
                      setRating(value);
                      setReviewError("");
                    }}
                  >
                    <Star size={18} />
                  </button>
                );
              })}
            </div>
            <textarea
              value={text}
              onChange={(event) => {
                setText(event.target.value);
                setReviewError("");
                setReviewSent(false);
              }}
              placeholder="Ko'rikdan keyingi fikringiz"
            />
            {reviewError && <small className="review-error">{reviewError}</small>}
            {reviewSent && <small className="review-success">Sharh moderatsiyaga yuborildi.</small>}
            <button className="primary-btn submit" type="submit" disabled={reviewSubmitting}>
              <Send size={17} />
              {reviewSubmitting ? "Yuborilmoqda" : "Sharh yuborish"}
            </button>
          </form>
        ) : (
          <div className="review-locked">
            <LockKeyhole size={17} />
            <span>Sharh yozish faqat qabuldan keyin ochiladi. Hozircha faqat o&apos;qish mumkin.</span>
          </div>
        )}
      </section>
    </div>
  );
}
