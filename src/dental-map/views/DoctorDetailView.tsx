import { Building2, CalendarDays, ChevronLeft, ChevronRight, Clock, Heart, MapPin, Phone, Star } from "lucide-react";
import { useRef, useState } from "react";
import { DoctorAvatar } from "../components/common";
import { isSafeMapUrl, openExternal } from "../lib/url";
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

  function showReview(index: number) {
    const next = Math.max(0, Math.min(index, reviews.length - 1));
    const scroller = scrollerRef.current;
    const card = scroller?.children[next] as HTMLElement | undefined;
    if (scroller && card) {
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      scroller.scrollTo({
        left: card.offsetLeft - scroller.offsetLeft,
        behavior: reducedMotion ? "auto" : "smooth"
      });
    }
    setActiveReview(next);
  }
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

      {isSafeMapUrl(doctor.locationUrl) && (
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
              role="region"
              aria-roledescription="karusel"
              aria-label="Tasdiqlangan sharhlar"
              onScroll={(event) => {
                const scroller = event.currentTarget;
                const cards = Array.from(scroller.children) as HTMLElement[];
                const nearest = cards.reduce(
                  (best, card, index) =>
                    Math.abs(card.offsetLeft - scroller.scrollLeft) < best.distance
                      ? { index, distance: Math.abs(card.offsetLeft - scroller.scrollLeft) }
                      : best,
                  { index: 0, distance: Number.POSITIVE_INFINITY }
                );
                setActiveReview(nearest.index);
              }}
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
                  {(review.clinic || review.clinicDistrict) && (
                    <span className="mt-1 inline-flex max-w-full items-center gap-1 text-xs font-medium text-ink-500">
                      <Building2 size={13} className="shrink-0 text-brand-500" />
                      <span className="truncate">
                        {[review.clinic, review.clinicDistrict].filter(Boolean).join(", ")}
                      </span>
                    </span>
                  )}
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
              <div className="flex items-center justify-center gap-2" aria-label="Sharh navigatsiyasi">
                <button
                  type="button"
                  aria-label="Oldingi sharh"
                  disabled={activeReview === 0}
                  onClick={() => showReview(activeReview - 1)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-surface-100 text-ink-600 disabled:opacity-40"
                >
                  <ChevronLeft size={16} />
                </button>
                {reviews.map((review, index) => (
                  <button
                    type="button"
                    key={review.id}
                    aria-label={`${index + 1}-sharhni ko'rsatish`}
                    aria-current={index === activeReview ? "true" : undefined}
                    onClick={() => showReview(index)}
                    className={cn(
                      "h-2 rounded-pill transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400",
                      index === activeReview ? "w-4 bg-brand-500" : "w-1.5 bg-surface-200"
                    )}
                  />
                ))}
                <button
                  type="button"
                  aria-label="Keyingi sharh"
                  disabled={activeReview === reviews.length - 1}
                  onClick={() => showReview(activeReview + 1)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-surface-100 text-ink-600 disabled:opacity-40"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
