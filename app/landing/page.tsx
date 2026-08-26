import type { Metadata } from "next";
import { LandingPage } from "../../src/dental-map/landing/LandingPage";

export const metadata: Metadata = {
  title: "Dental Map — tish shifokoringizni bir daqiqada toping",
  description:
    "Yaqiningizdagi tekshirilgan tish shifokorlari, ochiq narxlar va qo'ng'iroqsiz qabul. Telegram ichida ishlaydi.",
  openGraph: {
    title: "Dental Map",
    description:
      "Yaqiningizdagi tekshirilgan tish shifokorlari, ochiq narxlar va qo'ng'iroqsiz qabul.",
    type: "website"
  }
};

export default function Page() {
  return <LandingPage />;
}
