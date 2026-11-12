import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { getCommerceSettings, type CommerceSettings } from "@/lib/commerce";
import { pageMetadata } from "@/lib/page-metadata";
import { SUPPORT_EMAIL, SUPPORT_PHONE_DISPLAY } from "@/lib/contact";
import { formatBdt } from "@/lib/utils";

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
  const freeOver = c.freeShippingThresholdBdt > 0 ? formatBdt(c.freeShippingThresholdBdt, locale) : null;
  const days = c.returnWindowDays;

  if (locale === "bn") {
    const daysBn = days.toLocaleString("bn-BD");
    return [
      {
        heading: "ফুল অর্ডার",
        items: [
          { q: "তোড়া কীভাবে অর্ডার করব?", a: "পছন্দের তোড়াটি খুলে প্রি-অর্ডার বোতামে চাপুন। আপনার নাম, ফোন নম্বর আর কোন দিন চান তা জানান। আমরা হোয়াটসঅ্যাপে দাম জানাই। আপনি রাজি হলে বিকাশে অল্প অগ্রিম দিয়ে অর্ডার নিশ্চিত করুন, এরপর আমরা তাজা ফুলে তোড়া তৈরি করি।" },
          { q: "পেজে দাম নেই কেন?", a: "প্রতিটি তোড়া অর্ডার পাওয়ার পর তৈরি হয়, তাই আগে আপনার সঙ্গে দাম নিশ্চিত করি। টাকা দেওয়ার আগেই হোয়াটসঅ্যাপে সঠিক দাম জানতে পারবেন।" },
          { q: "অগ্রিম কত?", a: "দামের অল্প একটি অংশ, বিকাশে। দাম জানানোর সময়ই সঠিক অঙ্ক বলে দিই। বাকিটা ডেলিভারির সময় নগদে।" },
          { q: "সঙ্গে কি বার্তা দেওয়া যায়?", a: "যায়। অর্ডারের ফর্মে আপনার বার্তা লিখে দিন, তোড়ার সঙ্গে পৌঁছে দেব।" },
        ],
      },
      {
        heading: "ডেলিভারি",
        items: [
          { q: "ফুল কোথায় ডেলিভারি হয়?", a: "আপাতত শুধু ঢাকায়। তোড়া তাজা ফুলে তৈরি, কুরিয়ারে দূরে পাঠালে ভালো থাকে না।" },
          { q: "কত সময় লাগে?", a: "অর্ডার নিশ্চিত হওয়ার ৪৮ ঘণ্টার মধ্যে। চাইলে ফর্মে পরের কোনো দিনও বেছে নিতে পারেন।" },
          { q: "ডেলিভারি চার্জ কত?", a: `ঢাকায় ${delivery}।${freeOver ? ` ${freeOver}-এর বেশি অর্ডারে ফ্রি।` : ""}` },
        ],
      },
      {
        heading: "পেমেন্ট",
        items: [
          { q: "টাকা কীভাবে দেব?", a: "অর্ডার নিশ্চিত করার সময় বিকাশে অল্প অগ্রিম, বাকিটা হাতে পেয়ে নগদে।" },
        ],
      },
      {
        heading: "কোনো সমস্যা হলে",
        items: [
          { q: "তোড়া পছন্দ না হলে?", a: "হাতে পাওয়ার সময়ই জানান, সম্ভব হলে ডেলিভারি দিতে আসা ব্যক্তি থাকতেই। আমরা সঙ্গে সঙ্গে আপনার অগ্রিম ফেরত দিই। প্রয়োজন হলে শুধু ডেলিভারি চার্জটুকু রাখি।" },
          { q: "অন্য জিনিস কি ফেরত দেওয়া যায়?", a: `ফুল ছাড়া অন্য জিনিস ডেলিভারির ${daysBn} দিনের মধ্যে ফেরত দেওয়া যায়, অব্যবহৃত ও প্যাকেটসহ। বিস্তারিত রিটার্ন পেজে।` },
          { q: "যোগাযোগ করব কীভাবে?", a: `হোয়াটসঅ্যাপে সবচেয়ে দ্রুত উত্তর পাবেন। ফোন করতে পারেন ${SUPPORT_PHONE_DISPLAY} নম্বরে, অথবা লিখুন ${SUPPORT_EMAIL}-এ।` },
        ],
      },
    ];
  }

  return [
    {
      heading: "Ordering flowers",
      items: [
        { q: "How do I order a bouquet?", a: "Open the bouquet you like and press the preorder button. Tell us your name, your phone number and the day you want it. We reply on WhatsApp with the price. Once you agree, a small bKash deposit confirms the order and we make the bouquet fresh." },
        { q: "Why is there no price on the page?", a: "Every bouquet is made to order, so we confirm the price with you first. You see the exact price on WhatsApp before you pay anything." },
        { q: "How much is the deposit?", a: "A small part of the price, paid by bKash. We tell you the exact amount with the price. The rest is paid in cash on delivery." },
        { q: "Can I add a message?", a: "Yes. Write your message in the request form and we send it with the bouquet." },
      ],
    },
    {
      heading: "Delivery",
      items: [
        { q: "Where do you deliver flowers?", a: "In Dhaka only, for now. Bouquets are made fresh and do not travel well by courier." },
        { q: "How long does it take?", a: "Within 48 hours of your order being confirmed. You can also choose a later day in the request form." },
        { q: "How much is delivery?", a: `${delivery} in Dhaka.${freeOver ? ` Free on orders over ${freeOver}.` : ""}` },
      ],
    },
    {
      heading: "Payment",
      items: [
        { q: "How do I pay?", a: "A small bKash deposit when you confirm, and the rest in cash when it arrives." },
      ],
    },
    {
      heading: "If something is wrong",
      items: [
        { q: "What if I do not like the bouquet?", a: "Tell us when it arrives, before the delivery person leaves if you can. We refund your deposit straight away. We only keep the delivery charge if we need to." },
        { q: "Can I return other items?", a: `Items other than flowers can be returned within ${days} ${days === 1 ? "day" : "days"} of delivery, unused and in their packaging. The returns page has the details.` },
        { q: "How do I reach you?", a: `WhatsApp is the fastest. You can also call ${SUPPORT_PHONE_DISPLAY} or write to ${SUPPORT_EMAIL}.` },
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
    <article className="legal-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <div className="legal-kicker">{isBn ? "সাধারণ প্রশ্ন" : "QUESTIONS"}</div>
      <h1>{isBn ? "যা সবাই জানতে চান।" : "What people ask us."}</h1>
      <p className="legal-lede">
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
    </article>
  );
}
