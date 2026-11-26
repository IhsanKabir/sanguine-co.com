import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { legalMetadata } from "../_metadata";
import { getCommerceSettings } from "@/lib/commerce";
import { depositPctFor, effectiveDepositPct } from "@/lib/pricing";
import { SUPPORT_EMAIL, SUPPORT_PHONE_DISPLAY } from "@/lib/contact";

type Props = { params: Promise<{ locale: string }> };

export const generateMetadata = ({ params }: Props) => legalMetadata("terms", params);

export default async function TermsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const c = await getCommerceSettings();
  const days = c.returnWindowDays;
  // The advance for today or tomorrow, and for a later date (capped at 10%, clause 3.2.10).
  const soon = effectiveDepositPct(null, c.preorderDepositPct);
  const deposit = { soon, later: depositPctFor(soon, false) };
  return locale === "bn" ? <BangleSection days={days} deposit={deposit} /> : <EnglishSection days={days} deposit={deposit} />;
}

interface DepositShares {
  soon: number;
  later: number;
}

function EnglishSection({ days, deposit }: { days: number; deposit: DepositShares }) {
  return (
    <>
      <div className="legal-kicker">TERMS OF SERVICE</div>
      <h1>The terms that apply when you buy from Sanguine.</h1>
      <p className="legal-lede">Last updated: 26 November 2026.</p>

      <h2>About these terms</h2>
      <p>Welcome to Sanguine. By placing an order or creating an account, you agree to the following. They are written plainly and we mean every line. Where the terms are silent, the laws of Bangladesh apply.</p>

      <h2>About us</h2>
      <p>Sanguine is a small business based in Dhaka, Bangladesh. We make pieces to order, source others, and deliver them to your door. Our contact email is <a href="mailto:concierge@sanguine-co.com">concierge@sanguine-co.com</a>.</p>

      <h2>Orders</h2>
      <p>When you place an order, you make an offer to buy. Sanguine accepts the offer when we send you an order confirmation by email. Until that moment we may decline the order, for instance if a piece is unexpectedly unavailable or the delivery address is outside our courier network.</p>
      <p>For bespoke pre-order requests, you submit a request and we return a quote. The quote is an offer from Sanguine; you accept it by reply, and only at that point is an order created.</p>

      <h2>Pricing and payment</h2>
      <p>All prices are in Bangladeshi Taka (৳ / BDT). At present, in-stock orders are paid for in cash on delivery: no deposit, no online payment, no card on file. The courier collects the full amount on arrival. Made-to-order pieces, including bouquets, are confirmed with a bKash deposit once you accept the price. For a bouquet that goes out today or tomorrow (or, with no date, as soon as the deposit arrives), the deposit is {deposit.soon}% of the price; for a later date, and for other made-to-order pieces, it is {deposit.later}%. The order form shows your share before you send it. The deposit is part of the price, not an extra charge, and the rest is paid in cash on delivery. We never charge more than the price we confirmed.</p>
      <p>We do not yet collect VAT. When Sanguine&rsquo;s Trade Licence and VAT registration become active, we will say so plainly and adjust the displayed prices to be inclusive of any required VAT.</p>

      <h2>Delivery</h2>
      <p>Flowers are delivered in Dhaka only. Everything else ships nationwide via Pathao Courier and Steadfast Courier. Flowers arrive within 2 days of your deposit, usually the same day, or on the day you choose. With paid same-day express, ordered before the cutoff, they arrive that day. Other orders arrive within 48 hours inside Dhaka and typically three to seven working days elsewhere in Bangladesh, but courier delays do happen and we cannot guarantee a specific date unless we have agreed it with you in writing.</p>
      <p>For bespoke pieces, the timeline begins when the quote is accepted and is stated in the quote itself.</p>

      <h2>Returns and refunds</h2>
      <p>Please see our <Link href="/legal/returns">Returns Policy</Link>. In short: stock pieces may be returned within {days} {days === 1 ? "day" : "days"} of delivery; bespoke pieces (those made or sourced specifically for you) are not returnable except in the case of a defect in the piece itself. Bouquets follow the promise on the returns page: a remake or a full refund if something is wrong, and a full refund of the deposit if you cancel by 8 PM the day before delivery.</p>

      <h2>Your account</h2>
      <p>You are responsible for keeping your sign-in details private. Tell us at once if you suspect someone else has used your account. We may suspend or close an account that breaches these terms or appears to be used fraudulently.</p>

      <h2>Our content</h2>
      <p>The text, photographs, illustrations, and other content on this site are the property of Sanguine or used with permission. You may save and share them for personal, non-commercial use; you may not republish them without asking.</p>

      <h2>Limitation of liability</h2>
      <p>To the extent permitted by Bangladeshi law, Sanguine&rsquo;s liability for any single order is limited to the value of that order. Nothing in these terms limits liability that cannot, by law, be limited, for instance in the case of personal injury caused by negligence.</p>

      <h2>Disputes</h2>
      <p>If something goes wrong, please call or WhatsApp {SUPPORT_PHONE_DISPLAY}, or write to <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>, first. We answer every complaint within 72 hours and will try to resolve the matter directly. If a dispute remains, the courts of Dhaka, Bangladesh have exclusive jurisdiction, and Bangladeshi law applies.</p>

      <h2>Reviews</h2>
      <p>We never remove a review for being critical. We check reviews before they appear and decline only ones that are abusive or off-topic, and no one who works with us writes them.</p>

      <h2>Changes to these terms</h2>
      <p>We may update these terms from time to time. The version that applies to your order is the one published on the day you placed it. Material changes will be flagged in our newsletter.</p>

      <h2>Contact</h2>
      <p>Sanguine, Dhaka, Bangladesh. <a href="mailto:concierge@sanguine-co.com">concierge@sanguine-co.com</a></p>
    </>
  );
}

function BangleSection({ days, deposit }: { days: number; deposit: DepositShares }) {
  return (
    <>
      <div className="legal-kicker">পরিষেবার শর্তাবলি</div>
      <h1>সাঙ্গুইন এবং আপনি যেসব শর্তে ব্যবসা করতে সম্মত হই।</h1>
      <p className="legal-lede">সর্বশেষ আপডেট: ২৬ নভেম্বর ২০২৬।</p>

      <h2>এই শর্তাবলি সম্পর্কে</h2>
      <p>সাঙ্গুইনে স্বাগতম। অর্ডার দেয়া বা অ্যাকাউন্ট তৈরি করার মাধ্যমে আপনি নিম্নলিখিত শর্তগুলোয় সম্মতি প্রকাশ করছেন। প্রতিটি বাক্য সরাসরি লেখা, এবং প্রতিটিতেই আমরা যা বলেছি তা-ই বুঝিয়েছি। যেখানে শর্তগুলো নীরব, সেখানে বাংলাদেশের আইন প্রযোজ্য।</p>

      <h2>আমরা কে</h2>
      <p>সাঙ্গুইন একটি ছোট প্রতিষ্ঠান, যা ঢাকা, বাংলাদেশ থেকে পরিচালিত। আমরা পিস তৈরি ও সংগ্রহ করি এবং আপনার দরজায় পৌঁছে দিই। যোগাযোগের ইমেইল: <a href="mailto:concierge@sanguine-co.com">concierge@sanguine-co.com</a></p>

      <h2>অর্ডার</h2>
      <p>আপনি অর্ডার দিলে সেটি একটি ক্রয়ের প্রস্তাব হিসেবে গণ্য হয়। সাঙ্গুইন প্রস্তাবটি গ্রহণ করে যখন আমরা আপনাকে ইমেইলে অর্ডার নিশ্চিতকরণ পাঠাই। তার আগ পর্যন্ত আমরা অর্ডার প্রত্যাখ্যান করতে পারি: যেমন কোনো পিস হঠাৎ অপ্রাপ্য হলে কিংবা ডেলিভারি ঠিকানা আমাদের কুরিয়ার নেটওয়ার্কের বাইরে হলে।</p>
      <p>বেসপোক প্রি-অর্ডারের ক্ষেত্রে আপনি একটি অনুরোধ জমা দেন এবং আমরা একটি কোট ফেরত দিই। সেই কোটটি সাঙ্গুইনের প্রস্তাব; আপনি জবাবের মাধ্যমে গ্রহণ করলে কেবল তখনই অর্ডার তৈরি হয়।</p>

      <h2>মূল্য ও পরিশোধ</h2>
      <p>সকল মূল্য বাংলাদেশি টাকায় (৳ / BDT)। বর্তমানে স্টকের অর্ডার ক্যাশ অন ডেলিভারিতে পরিশোধিত: কোনো জমা, কোনো অনলাইন পেমেন্ট, কোনো কার্ড সংরক্ষণ নয়। কুরিয়ার পৌঁছে গেলে সম্পূর্ণ অর্থ গ্রহণ করেন। অর্ডারে তৈরি জিনিস, যেমন ফুলের তোড়া, দাম মেনে নেওয়ার পর বিকাশে অগ্রিম দিয়ে নিশ্চিত হয়। তোড়া আজ বা আগামীকাল গেলে (অথবা তারিখ না দিলে, অগ্রিম পেলেই পাঠাই) অগ্রিম দামের {deposit.soon.toLocaleString("bn-BD")}%; পরের কোনো তারিখে, এবং অর্ডারে তৈরি অন্য জিনিসে, {deposit.later.toLocaleString("bn-BD")}%। অর্ডার পাঠানোর আগেই ফর্মে আপনার অগ্রিমের হার দেখতে পাবেন। অগ্রিম দামেরই অংশ, আলাদা কোনো চার্জ নয়; বাকিটা ডেলিভারির সময় নগদে। নিশ্চিত করা দামের বেশি আমরা কখনো নিই না।</p>
      <p>আমরা এখনো VAT সংগ্রহ করি না। সাঙ্গুইনের ট্রেড লাইসেন্স ও VAT রেজিস্ট্রেশন সক্রিয় হলে আমরা স্পষ্টভাবে জানাব এবং প্রদর্শিত মূল্যে প্রয়োজনীয় VAT অন্তর্ভুক্ত করে নেব।</p>

      <h2>ডেলিভারি</h2>
      <p>ফুল শুধু ঢাকায় ডেলিভারি হয়। বাকি সবকিছু আমরা সারা দেশে Pathao ও Steadfast কুরিয়ারের মাধ্যমে পাঠাই। ফুল অগ্রিম দেওয়ার ২ দিনের মধ্যে পৌঁছায়, সাধারণত একই দিনে, অথবা আপনার বেছে নেওয়া দিনে; সময়সীমার আগে একই দিনের এক্সপ্রেস (ফি সহ) বেছে নিলে সেদিনই। অন্য অর্ডার ঢাকার ভেতরে ৪৮ ঘণ্টার মধ্যে এবং বাইরে সাধারণত তিন থেকে সাত কর্মদিবস। কুরিয়ারজনিত বিলম্ব ঘটে; লিখিতভাবে নির্দিষ্ট তারিখ সম্মত না হলে আমরা গ্যারান্টি দিতে পারি না।</p>
      <p>বেসপোক পিসের ক্ষেত্রে কোট গৃহীত হওয়ার দিন থেকে সময় গণনা শুরু হয়, এবং তা কোটেই উল্লেখ থাকে।</p>

      <h2>ফেরত ও অর্থ ফেরত</h2>
      <p>বিস্তারিতের জন্য আমাদের <Link href="/legal/returns">ফেরত নীতি</Link> দেখুন। সংক্ষেপে: স্টক পিস ডেলিভারির {days.toLocaleString("bn-BD")} দিনের মধ্যে ফেরত দেওয়া যাবে; বেসপোক পিস (আপনার জন্য বিশেষভাবে তৈরি বা সংগৃহীত) ফেরতযোগ্য নয়, পিসটিতে ত্রুটি থাকলে ব্যতিক্রম। ফুলের তোড়ার জন্য রিটার্ন পেজের প্রতিশ্রুতি প্রযোজ্য: কিছু ভুল হলে নতুন করে বানিয়ে দিই বা পুরো টাকা ফেরত দিই, আর ডেলিভারির আগের দিন রাত ৮টার মধ্যে বাতিল করলে পুরো অগ্রিম ফেরত।</p>

      <h2>আপনার অ্যাকাউন্ট</h2>
      <p>আপনার সাইন-ইনের তথ্য গোপনে রাখার দায়িত্ব আপনার। অন্য কেউ আপনার অ্যাকাউন্ট ব্যবহার করেছে বলে সন্দেহ হলে অবিলম্বে আমাদের জানান। শর্ত লঙ্ঘন বা প্রতারণার লক্ষণ থাকলে আমরা অ্যাকাউন্ট স্থগিত বা বন্ধ করতে পারি।</p>

      <h2>আমাদের কনটেন্ট</h2>
      <p>এই সাইটের লেখা, ছবি, চিত্রায়ন ও অন্যান্য বিষয়বস্তু সাঙ্গুইনের সম্পত্তি অথবা অনুমতিক্রমে ব্যবহৃত। ব্যক্তিগত, অবাণিজ্যিক উদ্দেশ্যে সংরক্ষণ ও শেয়ার করতে পারেন; অনুমতি ছাড়া পুনঃপ্রকাশ করা যাবে না।</p>

      <h2>দায় সীমা</h2>
      <p>বাংলাদেশী আইন যতদূর অনুমতি দেয়, কোনো একক অর্ডারের জন্য সাঙ্গুইনের দায় সেই অর্ডারের মূল্যেই সীমাবদ্ধ। যেসব দায় আইনত সীমাবদ্ধ করা যায় না (যেমন অবহেলায় ব্যক্তিগত আঘাতের ক্ষেত্রে), এই শর্তাবলি সেগুলোয় কোনো সীমা আরোপ করে না।</p>

      <h2>বিরোধ</h2>
      <p>কিছু ভুল হলে দয়া করে প্রথমে {SUPPORT_PHONE_DISPLAY} নম্বরে ফোন বা হোয়াটসঅ্যাপ করুন, অথবা <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> ঠিকানায় লিখুন। প্রতিটি অভিযোগের উত্তর আমরা ৭২ ঘণ্টার মধ্যে দিই এবং সরাসরি সমাধানের চেষ্টা করি। এর পরও বিরোধ থাকলে ঢাকা, বাংলাদেশের আদালতের একচেটিয়া এখতিয়ার এবং বাংলাদেশী আইন প্রযোজ্য হবে।</p>

      <h2>রিভিউ</h2>
      <p>সমালোচনার কারণে আমরা কোনো রিভিউ সরাই না। প্রকাশের আগে রিভিউ দেখে নিই এবং শুধু অপমানজনক বা অপ্রাসঙ্গিক রিভিউ বাদ দিই। আমাদের সঙ্গে কাজ করেন এমন কেউ রিভিউ লেখেন না।</p>

      <h2>শর্ত পরিবর্তন</h2>
      <p>আমরা সময়ে সময়ে এই শর্তাবলি হালনাগাদ করতে পারি। আপনার অর্ডারের ক্ষেত্রে প্রযোজ্য সংস্করণ হবে আপনি যেদিন অর্ডার দিয়েছেন সেদিনের প্রকাশিত সংস্করণ। উল্লেখযোগ্য পরিবর্তন আমাদের নিউজলেটারে চিহ্নিত করা হবে।</p>

      <h2>যোগাযোগ</h2>
      <p>সাঙ্গুইন, ঢাকা, বাংলাদেশ। <a href="mailto:concierge@sanguine-co.com">concierge@sanguine-co.com</a></p>
    </>
  );
}
