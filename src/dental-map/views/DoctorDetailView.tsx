import { Building2, CalendarDays, Clock, Heart, MapPin, Phone, Star } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { DoctorAvatar } from "../components/common";
import { isSafeHttpUrl, openExternal } from "../lib/url";
import type { Doctor, DoctorReview } from "../types";
import { Button, Card, cn } from "../ui";

export function DoctorDetailView({
  doctor,
  reviews,
  isSaved,
  onAppointment,
  onToggleSaved
}: {
  doctor: Doctor;
  reviews: DoctorReview[];
  isSaved: boolean;
  onAppointment: (doctor: Doctor) => void;
  onToggleSaved: () => void;
}) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [activeReview, setActiveReview] = useState(0);

  // Auto-advancing, looping reviews carousel.
  useEffect(() => {
    if (reviews.length <= 1) {
      return;
    }
    const timer = window.setInterval(() => {
      setActiveReview((current) => {
        const next = (current + 1) % reviews.length;
        const scroller = scrollerRef.current;
        const card = scroller?.children[next] as HTMLElement | undefined;
        if (scroller && card) {
          scroller.scrollTo({ left: card.offsetLeft - scroller.offsetLeft, behavior: "smooth" });
        }
        return next;
      });
    }, 3500);
    return () => window.clearInterval(timer);
  }, [reviews.length]);
  return (
    <div className="flex flex-col gap-4">
      <Card as="section" className="flex items-start gap-3">
        <DoctorAvatar doctor={doctor} size="lg" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-bold text-ink-900">{doctor.name}</h1>
          <p className="text-sm text-ink-500">{doctor.specialty}</p>
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
            isSaved ? "bg-danger/10 text-danger" : "bg-surface-100 text-ink-500 hover:bg-surface-200"
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
            {reviews.length ? `${reviews.length} ta tasdiqlangan sharh` : "Hali sharh yo'q"}
          </small>
        </div>

        {reviews.length === 0 ? (
          <p className="rounded-2xl bg-surface-50 px-3 py-6 text-center text-sm text-ink-500">
            Hozircha tasdiqlangan sharh yo&apos;q. Qabuldan keyin bemorlar shifokorni baholaydi.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            <div
              ref={scrollerRef}
              className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto no-scrollbar px-1"
            >
              {reviews.map((review) => (
                <article
                  key={review.id}
                  className={cn(
                    "shrink-0 snap-start rounded-2xl bg-surface-50 p-3.5",
                    reviews.length > 1 ? "min-w-[85%]" : "w-full"
                  )}
                >
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
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-500">{review.text}</p>
                </article>
              ))}
            </div>
            {reviews.length > 1 && (
              <div className="flex justify-center gap-1.5" aria-hidden="true">
                {reviews.map((review, index) => (
                  <span
                    key={review.id}
                    className={cn(
                      "h-1.5 rounded-pill transition-all",
                      index === activeReview ? "w-4 bg-brand-500" : "w-1.5 bg-surface-200"
                    )}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
