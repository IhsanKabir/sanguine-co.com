import { setRequestLocale } from "next-intl/server";
import { legalMetadata } from "../_metadata";

type Props = { params: Promise<{ locale: string }> };

export const generateMetadata = ({ params }: Props) => legalMetadata("terms", params);

export default async function TermsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return locale === "bn" ? <BangleSection /> : <EnglishSection />;
}

function EnglishSection() {
  return (
    <>
      <div className="legal-kicker">TERMS OF SERVICE</div>
      <h1>The terms by which the maison and you agree to do business.</h1>
      <p className="legal-lede">Last updated: 2 May 2026.</p>

      <h2>About these terms</h2>
      <p>Welcome to Maison Saanguine. By placing an order or creating an account, you agree to the following. They are written plainly and we mean every line. Where the terms are silent, the laws of Bangladesh apply.</p>

      <h2>About us</h2>
      <p>Maison Saanguine is a small house operating from Dhaka, Bangladesh. We compose pieces, source pieces, and deliver them to your door. Our contact email is <a href="mailto:concierge@saanguine.com">concierge@saanguine.com</a>.</p>

      <h2>Orders</h2>
      <p>When you place an order, you make an offer to buy. The maison accepts the offer when we send you an order confirmation by email. Until that moment we may decline the order &mdash; for instance, if a piece is unexpectedly unavailable or the delivery address is outside our courier network.</p>
      <p>For bespoke pre-order requests, you submit a request and we return a quote. The quote is an offer from the maison; you accept it by reply, and only at that point is an order created.</p>

      <h2>Pricing and payment</h2>
      <p>All prices are in Bangladeshi Taka (৳ / BDT). At present, all orders are paid for in cash on delivery &mdash; no deposit, no online payment, no card on file. The courier collects the full amount on arrival.</p>
      <p>We do not yet collect VAT. When the maison&rsquo;s Trade Licence and VAT registration become active, we will say so plainly and adjust the displayed prices to be inclusive of any required VAT.</p>

      <h2>Delivery</h2>
      <p>We ship nationwide via Pathao Courier and Steadfast Courier. Delivery is typically two to four working days within Dhaka and three to seven working days elsewhere in Bangladesh, but courier delays do happen and we cannot guarantee a specific date unless we have agreed it with you in writing.</p>
      <p>For bespoke pieces, the timeline begins when the quote is accepted and is stated in the quote itself.</p>

      <h2>Returns and refunds</h2>
      <p>Please see our <a href="/legal/returns">Returns Policy</a>. In short: stock pieces may be returned within fourteen days; bespoke pieces (those made or sourced specifically for you) are not returnable except in the case of a defect in the piece itself.</p>

      <h2>Your account</h2>
      <p>You are responsible for keeping your sign-in details private. Tell us at once if you suspect someone else has used your account. We may suspend or close an account that breaches these terms or appears to be used fraudulently.</p>

      <h2>Our content</h2>
      <p>The text, photographs, illustrations, and other content on this site are the property of the maison or used with permission. You may save and share them for personal, non-commercial use; you may not republish them without asking.</p>

      <h2>Limitation of liability</h2>
      <p>To the extent permitted by Bangladeshi law, the maison&rsquo;s liability for any single order is limited to the value of that order. Nothing in these terms limits liability that cannot, by law, be limited &mdash; for instance, in the case of personal injury caused by negligence.</p>

      <h2>Disputes</h2>
      <p>If something goes wrong, please write to <a href="mailto:concierge@saanguine.com">concierge@saanguine.com</a> first. We will try to resolve the matter directly. If a dispute remains, the courts of Dhaka, Bangladesh have exclusive jurisdiction, and Bangladeshi law applies.</p>

      <h2>Changes to these terms</h2>
      <p>We may update these terms from time to time. The version that applies to your order is the one published on the day you placed it. Material changes will be flagged in the seasonal Letter from the Maison.</p>

      <h2>Contact</h2>
      <p>Maison Saanguine, Dhaka, Bangladesh. <a href="mailto:concierge@saanguine.com">concierge@saanguine.com</a></p>
    </>
  );
}

function BangleSection() {
  return (
    <>
      <div className="legal-kicker">পরিষেবার শর্তাবলি</div>
      <h1>মেইসন এবং আপনি যেসব শর্তে ব্যবসা করতে সম্মত হই।</h1>
      <p className="legal-lede">সর্বশেষ আপডেট: ২ মে ২০২৬।</p>

      <h2>এই শর্তাবলি সম্পর্কে</h2>
      <p>মেইসন স্যাঙ্গুইনে স্বাগতম। অর্ডার দেয়া বা অ্যাকাউন্ট তৈরি করার মাধ্যমে আপনি নিম্নলিখিত শর্তগুলোয় সম্মতি প্রকাশ করছেন। প্রতিটি বাক্য সরাসরি লেখা, এবং প্রতিটিতেই আমরা যা বলেছি তা-ই বুঝিয়েছি। যেখানে শর্তগুলো নীরব, সেখানে বাংলাদেশের আইন প্রযোজ্য।</p>

      <h2>আমরা কে</h2>
      <p>মেইসন স্যাঙ্গুইন একটি ছোট আঙিনা, যা ঢাকা, বাংলাদেশ থেকে পরিচালিত। আমরা পিস তৈরি ও সংগ্রহ করি এবং আপনার দরজায় পৌঁছে দিই। যোগাযোগের ইমেইল: <a href="mailto:concierge@saanguine.com">concierge@saanguine.com</a></p>

      <h2>অর্ডার</h2>
      <p>আপনি অর্ডার দিলে সেটি একটি ক্রয়ের প্রস্তাব হিসেবে গণ্য হয়। মেইসন প্রস্তাবটি গ্রহণ করে যখন আমরা আপনাকে ইমেইলে অর্ডার নিশ্চিতকরণ পাঠাই। তার আগ পর্যন্ত আমরা অর্ডার প্রত্যাখ্যান করতে পারি &mdash; যেমন কোনো পিস হঠাৎ অপ্রাপ্য হলে কিংবা ডেলিভারি ঠিকানা আমাদের কুরিয়ার নেটওয়ার্কের বাইরে হলে।</p>
      <p>বেসপোক প্রি-অর্ডারের ক্ষেত্রে আপনি একটি অনুরোধ জমা দেন এবং আমরা একটি কোট ফেরত দিই। সেই কোটটি মেইসনের প্রস্তাব; আপনি জবাবের মাধ্যমে গ্রহণ করলে কেবল তখনই অর্ডার তৈরি হয়।</p>

      <h2>মূল্য ও পরিশোধ</h2>
      <p>সকল মূল্য বাংলাদেশি টাকায় (৳ / BDT)। বর্তমানে সকল অর্ডার ক্যাশ অন ডেলিভারিতে পরিশোধিত &mdash; কোনো জমা, কোনো অনলাইন পেমেন্ট, কোনো কার্ড সংরক্ষণ নয়। কুরিয়ার পৌঁছে গেলে সম্পূর্ণ অর্থ গ্রহণ করেন।</p>
      <p>আমরা এখনো VAT সংগ্রহ করি না। মেইসনের ট্রেড লাইসেন্স ও VAT রেজিস্ট্রেশন সক্রিয় হলে আমরা স্পষ্টভাবে জানাব এবং প্রদর্শিত মূল্যে প্রয়োজনীয় VAT অন্তর্ভুক্ত করে নেব।</p>

      <h2>ডেলিভারি</h2>
      <p>আমরা সারা দেশে Pathao ও Steadfast কুরিয়ারের মাধ্যমে পাঠাই। সাধারণত ঢাকার ভেতরে দুই থেকে চার কর্মদিবস এবং বাইরে তিন থেকে সাত কর্মদিবস। কুরিয়ারজনিত বিলম্ব ঘটে; লিখিতভাবে নির্দিষ্ট তারিখ সম্মত না হলে আমরা গ্যারান্টি দিতে পারি না।</p>
      <p>বেসপোক পিসের ক্ষেত্রে কোট গৃহীত হওয়ার দিন থেকে সময় গণনা শুরু হয়, এবং তা কোটেই উল্লেখ থাকে।</p>

      <h2>ফেরত ও অর্থ ফেরত</h2>
      <p>বিস্তারিতের জন্য আমাদের <a href="/legal/returns">ফেরত নীতি</a> দেখুন। সংক্ষেপে: স্টক পিস চৌদ্দ দিনের মধ্যে ফেরত দেয়া যাবে; বেসপোক পিস (আপনার জন্য বিশেষভাবে তৈরি বা সংগৃহীত) ফেরতযোগ্য নয়, পিসটিতে ত্রুটি থাকলে ব্যতিক্রম।</p>

      <h2>আপনার অ্যাকাউন্ট</h2>
      <p>আপনার সাইন-ইনের তথ্য গোপনে রাখার দায়িত্ব আপনার। অন্য কেউ আপনার অ্যাকাউন্ট ব্যবহার করেছে বলে সন্দেহ হলে অবিলম্বে আমাদের জানান। শর্ত লঙ্ঘন বা প্রতারণার লক্ষণ থাকলে আমরা অ্যাকাউন্ট স্থগিত বা বন্ধ করতে পারি।</p>

      <h2>আমাদের কনটেন্ট</h2>
      <p>এই সাইটের লেখা, ছবি, চিত্রায়ন ও অন্যান্য বিষয়বস্তু মেইসনের সম্পত্তি অথবা অনুমতিক্রমে ব্যবহৃত। ব্যক্তিগত, অবাণিজ্যিক উদ্দেশ্যে সংরক্ষণ ও শেয়ার করতে পারেন; অনুমতি ছাড়া পুনঃপ্রকাশ করা যাবে না।</p>

      <h2>দায় সীমা</h2>
      <p>বাংলাদেশী আইন যতদূর অনুমতি দেয়, কোনো একক অর্ডারের জন্য মেইসনের দায় সেই অর্ডারের মূল্যেই সীমাবদ্ধ। যেসব দায় আইনত সীমাবদ্ধ করা যায় না (যেমন অবহেলায় ব্যক্তিগত আঘাতের ক্ষেত্রে), এই শর্তাবলি সেগুলোয় কোনো সীমা আরোপ করে না।</p>

      <h2>বিরোধ</h2>
      <p>কিছু ভুল হলে দয়া করে প্রথমে <a href="mailto:concierge@saanguine.com">concierge@saanguine.com</a> ঠিকানায় লিখুন। আমরা সরাসরি সমাধানের চেষ্টা করব। এর পরও বিরোধ থাকলে ঢাকা, বাংলাদেশের আদালতের একচেটিয়া এখতিয়ার এবং বাংলাদেশী আইন প্রযোজ্য হবে।</p>

      <h2>শর্ত পরিবর্তন</h2>
      <p>আমরা সময়ে সময়ে এই শর্তাবলি হালনাগাদ করতে পারি। আপনার অর্ডারের ক্ষেত্রে প্রযোজ্য সংস্করণ হবে আপনি যেদিন অর্ডার দিয়েছেন সেদিনের প্রকাশিত সংস্করণ। উল্লেখযোগ্য পরিবর্তন ঋতুর Letter from the Maison-এ চিহ্নিত করা হবে।</p>

      <h2>যোগাযোগ</h2>
      <p>মেইসন স্যাঙ্গুইন, ঢাকা, বাংলাদেশ। <a href="mailto:concierge@saanguine.com">concierge@saanguine.com</a></p>
    </>
  );
}
