import { CheckCircle2, Clock, CreditCard } from "lucide-react";
import { paymentMethods } from "../../catalog";
import { SectionTitle } from "../../components/common";

export function DoctorSubscriptionFlow({
  method,
  doctorSubscriptionPaid,
  onMethodChange,
  onDoctorPay
}: {
  method: (typeof paymentMethods)[number][0];
  doctorSubscriptionPaid: boolean;
  onMethodChange: (method: (typeof paymentMethods)[number][0]) => void;
  onDoctorPay: () => void;
}) {
  return (
    <>
      <div className="admin-status sent">
        <CheckCircle2 size={18} />
        <span>
          <strong>Shifokor ma&apos;lumotlari yuborildi</strong>
          <small>Endi 1 oylik obuna to&apos;lovini qiling.</small>
        </span>
      </div>

      <section className="bill-card">
        <div className="bill-top">
          <span className="soft-icon">
            <CreditCard size={18} />
          </span>
          <span>
            <strong>Shifokor obunasi</strong>
            <small>Profil 1 oy davomida faol bo&apos;ladi.</small>
          </span>
        </div>
        <div className="bill-row">
          <span>1 oylik obuna</span>
          <b>50 000 so&apos;m</b>
        </div>
        <div className="bill-row">
          <span>Administrator sozlamasi</span>
          <b>Narx administrator panelidan o&apos;zgaradi</b>
        </div>
        <div className="bill-total">
          <span>Jami</span>
          <strong>50 000 so&apos;m</strong>
        </div>
      </section>

      <SectionTitle title="To'lov usuli" />
      <div className="payment-methods">
        {paymentMethods.map(([id, name, text]) => (
          <button
            key={id}
            className={method === id ? "payment-method active" : "payment-method"}
            type="button"
            onClick={() => onMethodChange(id)}
          >
            <CreditCard size={18} />
            <span>
              <strong>{name}</strong>
              <small>{text}</small>
            </span>
          </button>
        ))}
      </div>

      <section className="consult-form">
        <label>
          <span>To&apos;lov telefon raqami</span>
          <input placeholder="+998 ..." />
        </label>
        <label>
          <span>Chek raqami</span>
          <input placeholder="Chek raqami" />
        </label>
        <button className="primary-btn submit" type="button" onClick={onDoctorPay}>
          <CheckCircle2 size={18} />
          {doctorSubscriptionPaid ? "To'lov yuborilgan" : "50 000 so'm to'lash"}
        </button>
      </section>

      <section className="payment-timeline" aria-label="Shifokor obuna jarayoni">
        <div className="timeline-row done">
          <CheckCircle2 size={17} />
          <span>
            <strong>Anketa to&apos;ldirildi</strong>
            <small>Shifokor ma&apos;lumotlari administrator tekshiruviga tayyor.</small>
          </span>
        </div>
        <div className={doctorSubscriptionPaid ? "timeline-row done" : "timeline-row active"}>
          <CreditCard size={17} />
          <span>
            <strong>{doctorSubscriptionPaid ? "To'lov yuborildi" : "To'lov kutilmoqda"}</strong>
            <small>1 oy uchun 50 000 so&apos;m obuna to&apos;lovi.</small>
          </span>
        </div>
        <div className={doctorSubscriptionPaid ? "timeline-row active" : "timeline-row"}>
          <Clock size={17} />
          <span>
            <strong>Administrator tasdig&apos;i</strong>
            <small>
              {doctorSubscriptionPaid
                ? "Administrator shifokor profilini va to'lov chekini tasdiqlaydi."
                : "To'lov yuborilgandan keyin administrator tekshiruvi boshlanadi."}
            </small>
          </span>
        </div>
      </section>
    </>
  );
}
