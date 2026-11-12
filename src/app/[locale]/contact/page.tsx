import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { pageMetadata } from "@/lib/page-metadata";
import { SUPPORT_EMAIL, SUPPORT_PHONE_DISPLAY, SUPPORT_PHONE_TEL, messengerUrl, whatsAppUrl } from "@/lib/contact";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  return pageMetadata("/contact", locale, {
    en: { title: "Contact", description: "Reach Sanguine in Dhaka by WhatsApp, phone, Messenger or email." },
    bn: { title: "যোগাযোগ", description: "হোয়াটসঅ্যাপ, ফোন, মেসেঞ্জার বা ইমেইলে ঢাকার সাঙ্গুইনের সঙ্গে যোগাযোগ করুন।" },
  });
}

export default async function ContactPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const isBn = locale === "bn";
  const whatsApp = whatsAppUrl();
  const messenger = messengerUrl();

  return (
    <article className="legal-page">
      <div className="legal-kicker">{isBn ? "যোগাযোগ" : "CONTACT"}</div>
      <h1>{isBn ? "আমাদের সঙ্গে কথা বলুন।" : "Talk to us."}</h1>
      <p className="legal-lede">
        {isBn
          ? "অর্ডার, তোড়া বা ডেলিভারি নিয়ে যেকোনো প্রশ্নে নিচের যেকোনো উপায়ে লিখুন বা ফোন করুন।"
          : "For a question about an order, a bouquet or a delivery, use any of these."}
      </p>

      <ul className="contact-list">
        {whatsApp && (
          <li>
            <span className="contact-label">WhatsApp</span>
            <a href={whatsApp} target="_blank" rel="noopener noreferrer">
              {isBn ? "হোয়াটসঅ্যাপে লিখুন" : "Message us on WhatsApp"}
            </a>
            <span className="contact-note">{isBn ? "দাম আমরা এখানেই জানাই।" : "This is where we send prices."}</span>
          </li>
        )}
        <li>
          <span className="contact-label">{isBn ? "ফোন" : "Phone"}</span>
          <a href={`tel:${SUPPORT_PHONE_TEL}`}>{SUPPORT_PHONE_DISPLAY}</a>
        </li>
        {messenger && (
          <li>
            <span className="contact-label">Messenger</span>
            <a href={messenger} target="_blank" rel="noopener noreferrer">
              {isBn ? "মেসেঞ্জারে লিখুন" : "Message us on Messenger"}
            </a>
          </li>
        )}
        <li>
          <span className="contact-label">{isBn ? "ইমেইল" : "Email"}</span>
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
        </li>
      </ul>

      <h2>{isBn ? "অর্ডার নিয়ে লিখলে" : "About an order"}</h2>
      <p>
        {isBn
          ? "অর্ডার নম্বর (SSG দিয়ে শুরু) অথবা যে ফোন নম্বর দিয়ে অর্ডার করেছেন সেটি জানান, তাহলে দ্রুত খুঁজে পাব।"
          : "Tell us your order number (it starts with SSG) or the phone number you ordered with, so we can find it quickly."}
      </p>

      <h2>{isBn ? "আমরা কোথায়" : "Where we are"}</h2>
      <p>{isBn ? "সাঙ্গুইন ঢাকাভিত্তিক, বাংলাদেশ।" : "Sanguine is based in Dhaka, Bangladesh."}</p>

      <h2>{isBn ? "আগে দেখে নিতে পারেন" : "You may find it here first"}</h2>
      <p>
        {isBn ? (
          <><Link href="/faq">সাধারণ প্রশ্ন</Link>, <Link href="/legal/shipping">ডেলিভারি</Link> ও <Link href="/legal/returns">রিটার্ন</Link>।</>
        ) : (
          <><Link href="/faq">Questions</Link>, <Link href="/legal/shipping">delivery</Link> and <Link href="/legal/returns">returns</Link>.</>
        )}
      </p>
    </article>
  );
}
