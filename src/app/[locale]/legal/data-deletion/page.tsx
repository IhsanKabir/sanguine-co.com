import { setRequestLocale } from "next-intl/server";
import { legalMetadata } from "../_metadata";

type Props = { params: Promise<{ locale: string }> };

export const generateMetadata = ({ params }: Props) => legalMetadata("data-deletion", params);

export default async function DataDeletionPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return locale === "bn" ? <BanglaSection /> : <EnglishSection />;
}

function EnglishSection() {
  return (
    <>
      <div className="legal-kicker">DATA DELETION</div>
      <h1>How to remove your data from Sanguine.</h1>
      <p className="legal-lede">Last updated: 2 May 2026.</p>

      <h2>Your right to be forgotten</h2>
      <p>
        You may at any time ask Sanguine to delete the personal information we hold on you: your name, contact details,
        addresses, wishlist, and account record. We will action the request within thirty days and write back to you to confirm.
      </p>

      <h2>How to request deletion</h2>
      <p>Send an email to <a href="mailto:concierge@sanguine-co.com">concierge@sanguine-co.com</a> with the subject line <b>Data deletion request</b>. Please include:</p>
      <ul>
        <li>The email address tied to your account, or the email you used at checkout.</li>
        <li>Whether you want everything removed, or only certain things (your wishlist, your saved addresses, etc).</li>
      </ul>
      <p>
        If you signed in with Google or Facebook, simply tell us so and we will remove the linked record. You may also revoke
        Sanguine&apos;s access from the social provider directly: Facebook → Settings → Apps and Websites; Google → myaccount.google.com → Security → Third-party apps.
      </p>

      <h2>What we cannot delete</h2>
      <p>
        Bangladeshi tax law (NBR) requires us to retain a record of completed orders for seven years. Those records (invoice number,
        amount, items, delivery address) must remain on file even after a deletion request. We will, on request, anonymise the personal
        identifiers attached to those order records (replace name with the placeholder <i>Customer-XXXX</i>) once the legal retention period has passed.
      </p>

      <h2>Confirmation</h2>
      <p>
        Once your data is deleted you will receive an email confirmation listing what was removed and what was retained for legal
        compliance. The action is irreversible.
      </p>

      <h2>Contact</h2>
      <p>Sanguine, Dhaka, Bangladesh. <a href="mailto:concierge@sanguine-co.com">concierge@sanguine-co.com</a></p>
    </>
  );
}

function BanglaSection() {
  return (
    <>
      <div className="legal-kicker">তথ্য মুছে ফেলা</div>
      <h1>সাঙ্গুইন থেকে আপনার তথ্য যেভাবে মুছবেন।</h1>
      <p className="legal-lede">সর্বশেষ হালনাগাদ: ২ মে ২০২৬।</p>

      <h2>ভুলে যাওয়ার অধিকার</h2>
      <p>
        আমাদের কাছে থাকা আপনার ব্যক্তিগত তথ্য, যেমন নাম, যোগাযোগের তথ্য, ঠিকানা, উইশলিস্ট ও অ্যাকাউন্ট রেকর্ড, যেকোনো সময়
        মুছে ফেলতে বলতে পারেন। ত্রিশ দিনের মধ্যে আমরা অনুরোধটি কার্যকর করব এবং লিখে নিশ্চিত করব।
      </p>

      <h2>অনুরোধ যেভাবে করবেন</h2>
      <p><a href="mailto:concierge@sanguine-co.com">concierge@sanguine-co.com</a> ঠিকানায় <b>Data deletion request</b> বিষয় লিখে ইমেইল করুন। সঙ্গে জানান:</p>
      <ul>
        <li>আপনার অ্যাকাউন্টের ইমেইল, অথবা চেকআউটে যে ইমেইল ব্যবহার করেছিলেন।</li>
        <li>সবকিছু মুছতে চান, নাকি শুধু নির্দিষ্ট কিছু (যেমন উইশলিস্ট বা সংরক্ষিত ঠিকানা)।</li>
      </ul>
      <p>
        Google বা Facebook দিয়ে সাইন-ইন করে থাকলে সেটা জানান, আমরা সংযুক্ত রেকর্ডটি মুছে দেব। চাইলে সরাসরি সেই প্ল্যাটফর্ম থেকেও
        সাঙ্গুইনের অ্যাক্সেস বাতিল করতে পারেন: Facebook → Settings → Apps and Websites; Google → myaccount.google.com → Security → Third-party apps।
      </p>

      <h2>যা মুছতে পারি না</h2>
      <p>
        বাংলাদেশের কর আইন (NBR) অনুযায়ী সম্পন্ন অর্ডারের রেকর্ড সাত বছর রাখতে হয়। মুছে ফেলার অনুরোধের পরেও সেই রেকর্ড (ইনভয়েস নম্বর,
        অঙ্ক, পিস, ডেলিভারি ঠিকানা) সংরক্ষিত থাকবে। আইনি সংরক্ষণের সময় পার হলে অনুরোধ করলে আমরা সেই রেকর্ডের ব্যক্তিগত পরিচয়
        মুছে বেনামি করে দেব (নামের জায়গায় <i>Customer-XXXX</i>)।
      </p>

      <h2>নিশ্চিতকরণ</h2>
      <p>
        তথ্য মুছে ফেলার পর একটি ইমেইল পাবেন, তাতে লেখা থাকবে কী মোছা হয়েছে আর আইনি কারণে কী রাখা হয়েছে। এই কাজ আর ফেরানো যায় না।
      </p>

      <h2>যোগাযোগ</h2>
      <p>সাঙ্গুইন, ঢাকা, বাংলাদেশ। <a href="mailto:concierge@sanguine-co.com">concierge@sanguine-co.com</a></p>
    </>
  );
}
