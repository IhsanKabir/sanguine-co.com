import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { getCommerceSettings, type CommerceSettings } from "@/lib/commerce";
import { pageMetadata } from "@/lib/page-metadata";
import { REPLY_HOURS, SUPPORT_EMAIL, SUPPORT_PHONE_DISPLAY } from "@/lib/contact";
import { formatBdt } from "@/lib/utils";
import { expressCutoffLabel } from "@/lib/delivery";
import { depositPctFor, effectiveDepositPct } from "@/lib/pricing";

type Props = { params: Promise<{ locale: string }> };
type Locale = "en" | "bn";
type FaqGroup = { heading: string; items: { q: string; a: string }[] };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  return pageMetadata("/faq", locale, {
    en: { title: "Questions", description: "How ordering a bouquet works at Sanguine: the price, the deposit, delivery in Dhaka, and what happens if you do not like it." },
    bn: { title: "সাধারণ প্রশ্ন", description: "সাঙ্গুইনে তোড়া অর্ডার কীভাবে হয়: দাম, অগ্রিম, ঢাকায় ডেলিভারি, আর পছন্দ না হলে কী হবে।" },
  });
}

// Every figure comes from Admin → Settings, so the answers can never
// disagree with what checkout charges or the returns page says.
function faqGroups(locale: Locale, c: CommerceSettings): FaqGroup[] {
  const delivery = formatBdt(c.shippingDhakaBdt, locale);
  const express = formatBdt(c.expressFeeBdt, locale), cutoff = expressCutoffLabel(locale, c.expressCutoffMin);
  const freeOver = c.freeShippingThresholdBdt > 0 ? formatBdt(c.freeShippingThresholdBdt, locale) : null;
  const days = c.returnWindowDays;
  // Today or tomorrow, and a later date (capped at 10%, clause 3.2.10).
  const soonPct = effectiveDepositPct(null, c.preorderDepositPct), laterPct = depositPctFor(soonPct, false);

  if (locale === "bn") {
    const daysBn = days.toLocaleString("bn-BD");
    return [
      {
        heading: "ফুল অর্ডার",
        items: [
          { q: "তোড়া কীভাবে অর্ডার করব?", a: "পছন্দের তোড়াটি খুলে প্রি-অর্ডার বোতামে চাপুন। আপনার নাম, ফোন নম্বর আর কোন দিন চান তা জানান। আমরা হোয়াটসঅ্যাপে দাম জানাই। আপনি রাজি হলে বিকাশে অগ্রিম দিয়ে অর্ডার নিশ্চিত করুন, এরপর আমরা তাজা ফুলে তোড়া তৈরি করি।" },
          { q: "দাম একটা সীমার মধ্যে দেখানো কেন?", a: "প্রতিটি তোড়া অর্ডার পাওয়ার পর তৈরি হয়, আর দাম নির্ভর করে আপনি কোন সাইজ ও কোন ফুল চান তার ওপর। পেজে শুরু থেকে শেষ পর্যন্ত দাম দেখানো থাকে। টাকা দেওয়ার আগেই হোয়াটসঅ্যাপে সঠিক দাম জানিয়ে দিই।" },
          { q: "অগ্রিম কত?", a: `আজ বা আগামীকাল ডেলিভারি হলে দামের ${soonPct.toLocaleString("bn-BD")}%, পরের কোনো তারিখে ${laterPct.toLocaleString("bn-BD")}%, বিকাশে, দাম নিশ্চিত করার পর। অর্ডার পাঠানোর আগেই ফর্মে আপনার অগ্রিমের হার দেখতে পাবেন, আর দাম জানানোর সময় সঠিক অঙ্ক বলে দিই। অগ্রিম দামেরই অংশ, আলাদা কোনো চার্জ নয়। বাকিটা ডেলিভারির সময় নগদে।` },
          { q: "সঙ্গে কি বার্তা দেওয়া যায়?", a: "যায়। অর্ডারের ফর্মে আপনার বার্তা লিখে দিন, তোড়ার সঙ্গে পৌঁছে দেব।" },
        ],
      },
      {
        heading: "ডেলিভারি",
        items: [
          { q: "ফুল কোথায় ডেলিভারি হয়?", a: "আপাতত শুধু ঢাকায়। তোড়া তাজা ফুলে তৈরি, কুরিয়ারে দূরে পাঠালে ভালো থাকে না।" },
          { q: "কত সময় লাগে?", a: "অগ্রিম দেওয়ার ২ দিনের মধ্যে, সাধারণত একই দিনে। চাইলে ফর্মে পরের কোনো দিনও বেছে নিতে পারেন।" },
          { q: "আজই পাওয়া যাবে?", a: `যাবে। ${cutoff}-এর মধ্যে অর্ডার করে ফর্মে একই দিনের এক্সপ্রেস বেছে নিন। ফি ${express}, অগ্রিমের সঙ্গে আগেই দিতে হয়।` },
          { q: "ডেলিভারি চার্জ কত?", a: `ঢাকায় ${delivery}।${freeOver ? ` ${freeOver}-এর বেশি অর্ডারে ফ্রি।` : ""}` },
        ],
      },
      {
        heading: "পেমেন্ট",
        items: [
          { q: "টাকা কীভাবে দেব?", a: "অর্ডার নিশ্চিত করার সময় বিকাশে অগ্রিম, বাকিটা হাতে পেয়ে নগদে।" },
        ],
      },
      {
        heading: "কোনো সমস্যা হলে",
        items: [
          { q: "তোড়া ভুল, ক্ষতিগ্রস্ত বা তাজা না হলে?", a: "ডেলিভারি দিতে আসা ব্যক্তি থাকতেই জানান, অথবা ডেলিভারির ৩ ঘণ্টার মধ্যে ছবি পাঠান। আমরা নতুন করে বানিয়ে দিই, অথবা পুরো টাকা ফেরত দিই: আপনি যেটা চান।" },
          { q: "তোড়া ঠিক আছে, কিন্তু পছন্দ হয়নি?", a: "প্রথম অর্ডারে, ডেলিভারি দিতে আসা ব্যক্তি থাকতেই জানান। বাকি টাকা দিতে হবে না, আর আপনার অগ্রিম ৭২ ঘণ্টার মধ্যে ফেরত দিই।" },
          { q: "অর্ডার বাতিল করা যায়?", a: "যায়। ডেলিভারির আগের দিন রাত ৮টার মধ্যে জানালে পুরো অগ্রিম ফেরত দিই। এর পরে, এবং একই দিনের অর্ডারে, আমরা আপনার জন্য ফুল কিনে ফেলি, তাই অগ্রিমটুকু ফুলের দামেই যায়।" },
          { q: "আপনারা ডেলিভারি দিতে না পারলে?", a: "আপনার দেওয়া সব টাকা ৭২ ঘণ্টার মধ্যে একই বিকাশ নম্বরে ফেরত দিই, খরচ আমাদের। চাইলে নতুন তারিখও বেছে নিতে পারেন।" },
          { q: "অন্য জিনিস কি ফেরত দেওয়া যায়?", a: `ফুল ছাড়া অন্য জিনিস ডেলিভারির ${daysBn} দিনের মধ্যে ফেরত দেওয়া যায়, অব্যবহৃত ও প্যাকেটসহ। বিস্তারিত রিটার্ন পেজে।` },
          { q: "যোগাযোগ করব কীভাবে?", a: `হোয়াটসঅ্যাপে সবচেয়ে দ্রুত উত্তর পাবেন। আমরা উত্তর দিই ${REPLY_HOURS.bn} মধ্যে। ফোন করতে পারেন ${SUPPORT_PHONE_DISPLAY} নম্বরে, অথবা লিখুন ${SUPPORT_EMAIL}-এ।` },
        ],
      },
    ];
  }

  return [
    {
      heading: "Ordering flowers",
      items: [
        { q: "How do I order a bouquet?", a: "Open the bouquet you like and press the preorder button. Tell us your name, your phone number and the day you want it. We reply on WhatsApp with the price. Once you agree, a bKash deposit confirms the order and we make the bouquet fresh." },
        { q: "Why does the page show a price range?", a: "Every bouquet is made to order, and the price depends on the size and the flowers you choose. The page shows the range, and we confirm the exact price on WhatsApp before you pay anything." },
        { q: "How much is the deposit?", a: `${soonPct}% of the price for delivery today or tomorrow, and ${laterPct}% for a later date, paid by bKash once we confirm the price. The order form shows your share before you send it, and we tell you the exact amount with the price. The deposit is part of the price, not an extra charge. The rest is paid in cash on delivery.` },
        { q: "Can I add a message?", a: "Yes. Write your message in the request form and we send it with the bouquet." },
      ],
    },
    {
      heading: "Delivery",
      items: [
        { q: "Where do you deliver flowers?", a: "In Dhaka only, for now. Bouquets are made fresh and do not travel well by courier." },
        { q: "How long does it take?", a: "Within 2 days of your deposit, usually the same day. You can also choose a later day in the request form." },
        { q: "Can I get it today?", a: `Yes. Order by ${cutoff} and choose same-day express in the request form. The fee is ${express}, paid in advance with the deposit.` },
        { q: "How much is delivery?", a: `${delivery} in Dhaka.${freeOver ? ` Free on orders over ${freeOver}.` : ""}` },
      ],
    },
    {
      heading: "Payment",
      items: [
        { q: "How do I pay?", a: "A bKash deposit when you confirm, and the rest in cash when it arrives." },
      ],
    },
    {
      heading: "If something is wrong",
      items: [
        { q: "What if the bouquet is wrong, damaged or not fresh?", a: "Tell us before the delivery person leaves, or send us a photo within 3 hours of delivery. We remake it, or refund you in full: your choice." },
        { q: "What if it is right, but I do not like it?", a: "On your first order, tell us before the delivery person leaves. You pay nothing more, and we return your deposit within 72 hours." },
        { q: "Can I cancel?", a: "Yes. Tell us by 8 PM the day before delivery and we refund your deposit in full. After that, and for same-day orders, we have already bought your flowers, so the deposit covers them." },
        { q: "What if you cannot deliver?", a: "We refund everything you paid within 72 hours, to the same bKash number, and we pay any bKash charge. Or choose a new date." },
        { q: "Can I return other items?", a: `Items other than flowers can be returned within ${days} ${days === 1 ? "day" : "days"} of delivery, unused and in their packaging. The returns page has the details.` },
        { q: "How do I reach you?", a: `WhatsApp is the fastest. We reply between ${REPLY_HOURS.en}. You can also call ${SUPPORT_PHONE_DISPLAY} or write to ${SUPPORT_EMAIL}.` },
      ],
    },
  ];
}

export default async function FaqPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const isBn = locale === "bn";
  const groups = faqGroups(isBn ? "bn" : "en", await getCommerceSettings());

  // Lets search engines show the questions directly under the result.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: groups.flatMap((g) => g.items).map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  return (
    <div className="legal-shell"><article className="legal-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <div className="legal-kicker">{isBn ? "সাধারণ প্রশ্ন" : "QUESTIONS"}</div>
      <h1>{isBn ? "যা সবাই জানতে চান।" : "What people ask us."}</h1>
      <p className="page-intro">
        {isBn ? "অর্ডার, ডেলিভারি আর পেমেন্ট নিয়ে ছোট ছোট উত্তর।" : "Short answers about ordering, delivery and payment."}
      </p>

      {groups.map((group) => (
        <section key={group.heading}>
          <h2>{group.heading}</h2>
          {group.items.map((item) => (
            <div key={item.q}>
              <h3 className="faq-q">{item.q}</h3>
              <p>{item.a}</p>
            </div>
          ))}
        </section>
      ))}

      <h2>{isBn ? "উত্তর পাননি?" : "Not answered here?"}</h2>
      <p>
        {isBn ? (
          <>আমাদের <Link href="/contact">যোগাযোগ</Link> পেজে হোয়াটসঅ্যাপ, ফোন ও ইমেইল আছে। আরও দেখুন: <Link href="/legal/shipping">ডেলিভারি</Link> ও <Link href="/legal/returns">রিটার্ন</Link>।</>
        ) : (
          <>Our <Link href="/contact">contact page</Link> has WhatsApp, phone and email. See also <Link href="/legal/shipping">delivery</Link> and <Link href="/legal/returns">returns</Link>.</>
        )}
      </p>
    </article></div>
  );
}
