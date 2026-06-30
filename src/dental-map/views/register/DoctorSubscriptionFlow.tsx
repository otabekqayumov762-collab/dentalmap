import { CheckCircle2, Clock, CreditCard, type LucideIcon } from "lucide-react";
import type { FormEvent } from "react";
import { paymentMethods } from "../../catalog";
import { SectionTitle } from "../../components/common";
import { Button, Card, Field, cn } from "../../ui";

type TimelineState = "done" | "active" | "pending";

function TimelineRow({
  state,
  Icon,
  title,
  text
}: {
  state: TimelineState;
  Icon: LucideIcon;
  title: string;
  text: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          state === "done" && "bg-brand-500 text-white",
          state === "active" && "bg-brand-50 text-brand-500 ring-2 ring-brand-100",
          state === "pending" && "bg-surface-100 text-ink-400"
        )}
      >
        <Icon size={16} />
      </span>
      <span>
        <strong
          className={cn(
            "block text-sm font-semibold",
            state === "pending" ? "text-ink-400" : "text-ink-900"
          )}
        >
          {title}
        </strong>
        <small className="block text-xs leading-snug text-ink-500">{text}</small>
      </span>
    </div>
  );
}

export function DoctorSubscriptionFlow({
  method,
  doctorSubscriptionPaid,
  paymentSubmitting,
  paymentError,
  onMethodChange,
  onDoctorPay
}: {
  method: (typeof paymentMethods)[number][0];
  doctorSubscriptionPaid: boolean;
  paymentSubmitting: boolean;
  paymentError: string;
  onMethodChange: (method: (typeof paymentMethods)[number][0]) => void;
  onDoctorPay: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const locked = paymentSubmitting || doctorSubscriptionPaid;

  return (
    <>
      <div className="flex items-center gap-3 rounded-2xl bg-brand-50 px-4 py-3.5">
        <CheckCircle2 size={18} className="shrink-0 text-brand-500" />
        <span>
          <strong className="block text-sm font-semibold text-ink-900">
            Shifokor ma&apos;lumotlari yuborildi
          </strong>
          <small className="block text-xs text-ink-500">Endi 1 oylik obuna to&apos;lovini qiling.</small>
        </span>
      </div>

      <Card className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-500">
            <CreditCard size={18} />
          </span>
          <span>
            <strong className="block text-sm font-bold text-ink-900">Shifokor obunasi</strong>
            <small className="block text-xs text-ink-500">Profil 1 oy davomida faol bo&apos;ladi.</small>
          </span>
        </div>
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-ink-600">1 oylik obuna</span>
          <b className="font-semibold text-ink-900">50 000 so&apos;m</b>
        </div>
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-ink-600">Administrator sozlamasi</span>
          <b className="text-right font-semibold text-ink-900">
            Narx administrator panelidan o&apos;zgaradi
          </b>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-surface-100 pt-3">
          <span className="font-medium text-ink-700">Jami</span>
          <strong className="text-base font-bold text-brand-600">50 000 so&apos;m</strong>
        </div>
      </Card>

      <SectionTitle title="To'lov usuli" />
      <div className="flex flex-col gap-2">
        {paymentMethods.map(([id, name, text]) => {
          const active = method === id;

          return (
            <button
              key={id}
              type="button"
              aria-pressed={active}
              disabled={locked}
              onClick={() => onMethodChange(id)}
              className={cn(
                "flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 active:scale-[0.99]",
                "disabled:pointer-events-none disabled:opacity-55",
                active
                  ? "border-brand-400 bg-brand-50 shadow-card"
                  : "border-surface-100 bg-surface-0 hover:bg-surface-50"
              )}
            >
              <span
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                  active ? "bg-brand-500 text-white" : "bg-surface-100 text-ink-500"
                )}
              >
                <CreditCard size={18} />
              </span>
              <span>
                <strong
                  className={cn(
                    "block text-sm font-semibold",
                    active ? "text-brand-700" : "text-ink-900"
                  )}
                >
                  {name}
                </strong>
                <small className="block text-xs text-ink-500">{text}</small>
              </span>
            </button>
          );
        })}
      </div>

      <form id="doctor-payment-form" className="flex flex-col gap-4" onSubmit={onDoctorPay}>
        <input type="hidden" name="method" value={method} />
        <Field
          label="To'lov telefon raqami"
          name="payment_phone"
          placeholder="+998 ..."
          disabled={locked}
        />
        <Field
          label="Chek raqami"
          name="receipt_number"
          placeholder="Chek raqami"
          disabled={locked}
        />
        {paymentError && (
          <div
            role="alert"
            className="flex items-center gap-3 rounded-2xl bg-rose-50 px-4 py-3 text-danger"
          >
            <Clock size={18} className="shrink-0" />
            <span>
              <strong className="block text-sm font-semibold">To&apos;lov yuborilmadi</strong>
              <small className="block text-xs opacity-90">{paymentError}</small>
            </span>
          </div>
        )}
        <Button type="submit" size="lg" disabled={locked}>
          <CheckCircle2 size={18} />
          {doctorSubscriptionPaid
            ? "To'lov yuborilgan"
            : paymentSubmitting
              ? "Yuborilmoqda"
              : "50 000 so'm to'lash"}
        </Button>
      </form>

      <section className="flex flex-col gap-3" aria-label="Shifokor obuna jarayoni">
        <TimelineRow
          state="done"
          Icon={CheckCircle2}
          title="Anketa to'ldirildi"
          text="Shifokor ma'lumotlari administrator tekshiruviga tayyor."
        />
        <TimelineRow
          state={doctorSubscriptionPaid ? "done" : "active"}
          Icon={CreditCard}
          title={doctorSubscriptionPaid ? "To'lov yuborildi" : "To'lov kutilmoqda"}
          text="1 oy uchun 50 000 so'm obuna to'lovi."
        />
        <TimelineRow
          state={doctorSubscriptionPaid ? "active" : "pending"}
          Icon={Clock}
          title="Administrator tasdig'i"
          text={
            doctorSubscriptionPaid
              ? "Administrator shifokor profilini va to'lov chekini tasdiqlaydi."
              : "To'lov yuborilgandan keyin administrator tekshiruvi boshlanadi."
          }
        />
      </section>
    </>
  );
}
