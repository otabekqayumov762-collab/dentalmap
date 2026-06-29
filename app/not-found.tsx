import Link from "next/link";

export default function NotFound() {
  return (
    <main className="not-found-page">
      <section>
        <span>404</span>
        <h1>Sahifa topilmadi</h1>
        <p>Dental Map bosh sahifasiga qayting.</p>
        <Link href="/">Bosh sahifa</Link>
      </section>
    </main>
  );
}
