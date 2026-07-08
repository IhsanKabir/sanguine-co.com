import { setRequestLocale } from "next-intl/server";
import { legalMetadata } from "../_metadata";

type Props = { params: Promise<{ locale: string }> };

export const generateMetadata = ({ params }: Props) => legalMetadata("privacy", params);

export default async function PrivacyPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return locale === "bn" ? <BangleSection /> : <EnglishSection />;
}

function EnglishSection() {
  return (
    <>
      <div className="legal-kicker">PRIVACY POLICY</div>
      <h1>What we keep, and why we keep it.</h1>
      <p className="legal-lede">Last updated: 2 May 2026.</p>

      <h2>What we collect</h2>
      <p>When you place an order with the maison, we collect your name, delivery address, phone number, and email so we can send your parcel and tell you where it is. When you create an account, we additionally store an encrypted password (or a record of your Google sign-in) and a record of your past orders.</p>
      <p>When you submit a bespoke pre-order request, we additionally store the description, references (images or films you upload), budget hint, and any other detail you choose to share. These are visible only to the maison; they are not shown to anyone else.</p>
      <p>When you browse, we set a session cookie so your bag is remembered between pages, and a small analytics cookie so we can understand which pieces are most-loved. We do not run advertising trackers and we do not sell our visitor lists.</p>

      <h2>What we do with it</h2>
      <p>We use your details to fulfil your order, to answer your questions if you write to us, and — only if you opt in — to send you the seasonal Letter from the Maison. We never share your information with anyone except:</p>
      <ul>
        <li>the courier delivering your parcel (Pathao, Steadfast)</li>
        <li>the payment provider processing your payment, if any (none at present — we collect cash on delivery)</li>
        <li>the email and SMS providers that send you transactional messages (Brevo, SSL Wireless)</li>
        <li>the hosting and database services that operate the website (Vercel, Supabase)</li>
      </ul>

      <h2>Where your data lives</h2>
      <p>Your data is stored in Singapore (Supabase, AWS ap-southeast-1). It is not stored in Bangladesh, but it is governed by Bangladesh&rsquo;s Personal Data Protection Ordinance, 2025, which we comply with.</p>

      <h2>How long we keep it</h2>
      <p>Order records are kept for seven years to comply with Bangladeshi tax law (NBR retention requirements). Marketing email subscriptions are kept until you unsubscribe. Browsing analytics are aggregated after thirty days; we cannot identify individual visitors past that point. Bespoke pre-order references and descriptions are kept for two years after the request is closed, then deleted.</p>

      <h2>Your rights</h2>
      <p>You may at any time email <a href="mailto:concierge@sanguine-co.com">concierge@sanguine-co.com</a> to ask for a copy of the information we hold on you, to correct it, or to delete it (other than the seven-year tax-record retention required by law). You may unsubscribe from the Letter from the Maison via the link at the foot of every newsletter. See our <a href="/data-deletion.html">Data Deletion</a> page for a full account of how to remove your data.</p>

      <h2>Cookies</h2>
      <ul>
        <li><b>ssg-cart-v1</b> &mdash; your bag, kept in your browser only.</li>
        <li><b>ssg-wish-v1</b> &mdash; your wishlist, same.</li>
        <li><b>ssg-coupon-v1</b> &mdash; a coupon you have applied, kept in your browser.</li>
        <li><b>ssg-route</b> &mdash; last-visited route, for back-button etiquette.</li>
        <li><b>ssg_sid</b> &mdash; anonymous session identifier so we can count visits, not visitors. Expires in 30 days.</li>
        <li><b>ssg-cookie-consent-v1</b> &mdash; your preference about whether we use the analytics cookie above.</li>
        <li><b>sb-*</b> &mdash; Supabase Auth session cookies if you are signed in.</li>
      </ul>

      <h2>Contact</h2>
      <p>Sanguine, Dhaka, Bangladesh. <a href="mailto:concierge@sanguine-co.com">concierge@sanguine-co.com</a></p>
    </>
  );
}

function BangleSection() {
  return (
    <>
      <div className="legal-kicker">গোপনীয়তা নীতি</div>
      <h1>আমরা কী রাখি, এবং কেন রাখি।</h1>
      <p className="legal-lede">সর্বশেষ আপডেট: ২ মে ২০২৬।</p>

      <h2>আমরা যা সংগ্রহ করি</h2>
      <p>আপনি যখন মেইসনে অর্ডার দেন, তখন আপনার পার্সেল পাঠাতে এবং তার অবস্থান জানাতে আমরা আপনার নাম, ডেলিভারি ঠিকানা, ফোন নম্বর ও ইমেইল সংগ্রহ করি। আপনি যখন একটি অ্যাকাউন্ট খোলেন, তখন এর সঙ্গে এনক্রিপ্টেড পাসওয়ার্ড (বা গুগল সাইন-ইনের একটি রেকর্ড) এবং আপনার পূর্ববর্তী অর্ডারের তালিকাও সংরক্ষণ করি।</p>
      <p>আপনি যখন কোনো বেসপোক প্রি-অর্ডারের অনুরোধ পাঠান, তখন তার বর্ণনা, রেফারেন্স (আপনি আপলোড করা ছবি বা ভিডিও), সম্ভাব্য বাজেট এবং আপনি যা অন্যান্য তথ্য জানাতে চান, সবই সংরক্ষণ করা হয়। এগুলো কেবল মেইসনের কাছেই দৃশ্যমান; অন্য কারও সঙ্গে দেখানো হয় না।</p>
      <p>আপনি যখন সাইটটি ব্রাউজ করেন, পাতায় পাতায় আপনার ব্যাগ মনে রাখার জন্য একটি সেশন কুকি এবং কোন পিসগুলো সবচেয়ে পছন্দ হচ্ছে তা বুঝতে একটি ছোট অ্যানালিটিক্স কুকি স্থাপন করা হয়। আমরা কোনো বিজ্ঞাপন ট্র্যাকার চালাই না এবং আমাদের দর্শকতালিকা কারো কাছে বিক্রি করি না।</p>

      <h2>আমরা যা করি এই তথ্য দিয়ে</h2>
      <p>আপনার তথ্য আমরা ব্যবহার করি আপনার অর্ডার পূরণ করতে, আপনি লিখলে আপনার প্রশ্নের উত্তর দিতে, এবং&nbsp;&mdash; কেবল আপনি অনুমতি দিলে&nbsp;&mdash; ঋতুর Letter from the Maison পাঠাতে। আমরা আপনার তথ্য কখনও কারও সঙ্গে শেয়ার করি না, কেবল নিম্নলিখিত পরিষেবাদাতাদের ব্যতিরেকে:</p>
      <ul>
        <li>আপনার পার্সেল পৌঁছে দেয়া কুরিয়ার (Pathao, Steadfast)</li>
        <li>পেমেন্ট প্রসেসর, যদি থাকে (বর্তমানে নেই &mdash; আমরা ক্যাশ অন ডেলিভারিতে নিই)</li>
        <li>ট্রানজ্যাকশনাল ইমেইল ও SMS পাঠানো প্রদানকারী (Brevo, SSL Wireless)</li>
        <li>হোস্টিং ও ডাটাবেস পরিষেবা যা ওয়েবসাইটটি চালায় (Vercel, Supabase)</li>
      </ul>

      <h2>আপনার তথ্য কোথায় থাকে</h2>
      <p>আপনার তথ্য সিঙ্গাপুরে সংরক্ষিত (Supabase, AWS ap-southeast-1)। এটি বাংলাদেশে সংরক্ষিত নয়, কিন্তু বাংলাদেশের পার্সোনাল ডেটা প্রটেকশন অর্ডিন্যান্স, ২০২৫-এর আওতাধীন, যা আমরা মেনে চলি।</p>

      <h2>আমরা কতদিন রাখি</h2>
      <p>NBR-এর কর-সংরক্ষণ বিধি মেনে অর্ডার রেকর্ড সাত বছর সংরক্ষণ করা হয়। মার্কেটিং ইমেইল সাবস্ক্রিপশন আপনি সাবস্ক্রাইব ছেড়ে দেয়া পর্যন্ত রাখা হয়। ব্রাউজিং অ্যানালিটিক্স ত্রিশ দিন পর সমষ্টিগত করা হয়; এর পর আমরা আর কোনো নির্দিষ্ট দর্শক চিহ্নিত করতে পারি না। বেসপোক প্রি-অর্ডার অনুরোধ বন্ধ হওয়ার দুই বছর পর সংশ্লিষ্ট রেফারেন্স ও বিবরণ মুছে ফেলা হয়।</p>

      <h2>আপনার অধিকার</h2>
      <p>আপনি যখন ইচ্ছা <a href="mailto:concierge@sanguine-co.com">concierge@sanguine-co.com</a> ঠিকানায় ইমেইল করে আপনার সম্পর্কিত তথ্যের একটি কপি চাইতে, সংশোধন করাতে, কিংবা মুছিয়ে দিতে পারেন (আইনত আবশ্যক সাত-বছরের কর-রেকর্ড ব্যতীত)। প্রতিটি নিউজলেটারের পাদদেশে থাকা লিঙ্কের মাধ্যমে Letter from the Maison সাবস্ক্রিপশন বাতিল করতে পারেন। তথ্য সরাতে চাইলে বিস্তারিতের জন্য আমাদের <a href="/data-deletion.html">Data Deletion</a> পৃষ্ঠাটি দেখুন।</p>

      <h2>কুকিজ</h2>
      <ul>
        <li><b>ssg-cart-v1</b> &mdash; আপনার ব্যাগ, কেবল আপনার ব্রাউজারে।</li>
        <li><b>ssg-wish-v1</b> &mdash; আপনার উইশলিস্ট, একইভাবে।</li>
        <li><b>ssg-coupon-v1</b> &mdash; প্রয়োগ করা কুপন, ব্রাউজারে।</li>
        <li><b>ssg-route</b> &mdash; সর্বশেষ ভিজিট করা রুট, ব্যাক-বাটনের শিষ্টাচারের জন্য।</li>
        <li><b>ssg_sid</b> &mdash; বেনামি সেশন আইডেন্টিফায়ার যাতে আমরা ভিজিট গণনা করতে পারি, ভিজিটর নয়। ত্রিশ দিনে মেয়াদ উত্তীর্ণ।</li>
        <li><b>ssg-cookie-consent-v1</b> &mdash; উপরোক্ত অ্যানালিটিক্স কুকি ব্যবহারের ব্যাপারে আপনার সম্মতি।</li>
        <li><b>sb-*</b> &mdash; Supabase Auth সেশন কুকি, যদি আপনি সাইন-ইন থাকেন।</li>
      </ul>

      <h2>যোগাযোগ</h2>
      <p>সাঙ্গুইন, ঢাকা, বাংলাদেশ। <a href="mailto:concierge@sanguine-co.com">concierge@sanguine-co.com</a></p>
    </>
  );
}
