import { setRequestLocale } from "next-intl/server";
import { legalMetadata } from "../_metadata";

type Props = { params: Promise<{ locale: string }> };

export const generateMetadata = ({ params }: Props) => legalMetadata("returns", params);

export default async function ReturnsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return locale === "bn" ? <BangleSection /> : <EnglishSection />;
}

function EnglishSection() {
  return (
    <>
      <div className="legal-kicker">RETURNS &amp; REFUNDS</div>
      <h1>How returns work, and what cannot be returned.</h1>
      <p className="legal-lede">Last updated: 2 May 2026.</p>

      <h2>Stock pieces &mdash; fourteen days</h2>
      <p>A piece bought from our in-stock collection may be returned within <b>fourteen days of delivery</b>, in its original condition (unworn, unwashed, with tags and packaging intact). The fourteen-day window matches the prevailing standard of Bangladeshi e-commerce.</p>
      <p>To begin a return, write to <a href="mailto:concierge@saanguine.com">concierge@saanguine.com</a> with your order number (SSG-XXXX) and a sentence about why you are returning. We will book a collection through our courier; the maison covers return shipping for any defective or incorrect piece, otherwise return shipping is at the customer&rsquo;s cost (typically ৳60&ndash;120).</p>
      <p>Once the piece arrives back at the atelier and we have verified its condition, we will refund you within seven working days. Refunds for cash-on-delivery orders are made by bKash or bank transfer to a number/account you nominate.</p>

      <h2>Bespoke pieces &mdash; defects only</h2>
      <p>Pieces that were made or sourced specifically for your order &mdash; anything that came through our pre-order or bespoke request flow &mdash; are not returnable except in the case of a clear defect in the piece itself, or a clear and material deviation from the agreed brief.</p>
      <p>If you believe the piece has a defect, write to us within forty-eight hours of delivery with photographs. We will respond within two working days. If a defect is confirmed we will, at our option, repair, replace, or refund the piece.</p>
      <p>This is unfortunately the universal practice for bespoke work &mdash; every piece is made for you specifically and cannot be put back on the shelf. We are sorry for the asymmetry.</p>

      <h2>Items not returnable</h2>
      <p>In addition to bespoke pieces, the following are not returnable for reasons of hygiene or fragility:</p>
      <ul>
        <li>Open perfume bottles (sealed, unopened bottles may be returned within fourteen days)</li>
        <li>Cut flowers and bouquets</li>
        <li>Pieces marked &ldquo;final sale&rdquo; at the time of purchase</li>
      </ul>

      <h2>Damaged on arrival</h2>
      <p>If your parcel arrives damaged, photograph it before opening, and write to us the same day at <a href="mailto:concierge@saanguine.com">concierge@saanguine.com</a>. We will arrange a replacement or refund without requiring you to send the piece back.</p>

      <h2>Cancelling an order</h2>
      <p>You may cancel an order before it has been booked with the courier. Once it has been collected by the courier, it is treated as a delivery in progress and the return policy above applies.</p>

      <h2>Contact</h2>
      <p>Maison Saanguine, Dhaka, Bangladesh. <a href="mailto:concierge@saanguine.com">concierge@saanguine.com</a></p>
    </>
  );
}

function BangleSection() {
  return (
    <>
      <div className="legal-kicker">ফেরত ও অর্থ ফেরত</div>
      <h1>ফেরত কীভাবে কাজ করে, এবং কী ফেরত দেওয়া যায় না।</h1>
      <p className="legal-lede">সর্বশেষ আপডেট: ২ মে ২০২৬।</p>

      <h2>স্টক পিস &mdash; চৌদ্দ দিন</h2>
      <p>আমাদের ইন-স্টক সংগ্রহ থেকে কেনা একটি পিস ডেলিভারির <b>চৌদ্দ দিনের মধ্যে</b> মূল অবস্থায় ফেরত দেওয়া যায় (পরা হয়নি, ধোয়া হয়নি, ট্যাগ ও প্যাকেজিং অক্ষত)। চৌদ্দ দিনের সময়সীমাটি বাংলাদেশী ই-কমার্সের প্রচলিত মানদণ্ডের সঙ্গে সঙ্গতিপূর্ণ।</p>
      <p>ফেরত শুরু করতে আপনার অর্ডার নম্বর (SSG-XXXX) এবং কারণসংক্রান্ত একটি সংক্ষিপ্ত বার্তা দিয়ে <a href="mailto:concierge@saanguine.com">concierge@saanguine.com</a>-এ লিখুন। আমরা আমাদের কুরিয়ারের মাধ্যমে কালেকশন বুক করব; ত্রুটিযুক্ত বা ভুল পিসের ক্ষেত্রে ফেরতের শিপিং মেইসন বহন করে, অন্যথায় ফেরতের শিপিং গ্রাহকের খরচে (সাধারণত ৳৬০&ndash;১২০)।</p>
      <p>পিসটি অ্যাটেলিয়ারে ফিরে আসা ও অবস্থা যাচাই হওয়ার পর সাত কর্মদিবসের মধ্যে আপনাকে অর্থ ফেরত দেওয়া হবে। ক্যাশ অন ডেলিভারি অর্ডারের ফেরত আপনার নির্দেশিত bKash বা ব্যাংক অ্যাকাউন্টে পাঠানো হবে।</p>

      <h2>বেসপোক পিস &mdash; কেবল ত্রুটিতে</h2>
      <p>আপনার জন্য বিশেষভাবে তৈরি বা সংগৃহীত পিস &mdash; প্রি-অর্ডার বা বেসপোক রিকোয়েস্ট ফ্লোর মাধ্যমে আসা যেকোনো কিছু &mdash; পিসে স্পষ্ট ত্রুটি থাকলে কিংবা সম্মত ব্রিফ থেকে স্পষ্ট ও উল্লেখযোগ্য বিচ্যুতি ছাড়া ফেরতযোগ্য নয়।</p>
      <p>পিসে ত্রুটি আছে মনে হলে ডেলিভারির আটচল্লিশ ঘণ্টার মধ্যে ছবি সহ আমাদের লিখুন। আমরা দুই কর্মদিবসের মধ্যে উত্তর দেব। ত্রুটি নিশ্চিত হলে আমরা মেরামত, প্রতিস্থাপন, কিংবা অর্থ ফেরত &mdash; এই বিকল্পগুলোর যেকোনো একটি বেছে নিতে পারি।</p>
      <p>এটি বেসপোক কাজের সর্বজনীন রীতি &mdash; প্রতিটি পিস আপনার জন্য বিশেষভাবে তৈরি বলে শেলফে ফিরিয়ে রাখা সম্ভব নয়। এই অসামঞ্জস্যের জন্য আমরা দুঃখিত।</p>

      <h2>ফেরতযোগ্য নয় এমন আইটেম</h2>
      <p>বেসপোক পিস ছাড়াও, স্বাস্থ্য বা ভঙ্গুরতার কারণে নিম্নলিখিত আইটেম ফেরতযোগ্য নয়:</p>
      <ul>
        <li>খোলা পারফিউম বোতল (বন্ধ, না-খোলা বোতল চৌদ্দ দিনের মধ্যে ফেরত দেওয়া যাবে)</li>
        <li>কাটা ফুল ও ফুলের তোড়া</li>
        <li>কেনার সময় &ldquo;final sale&rdquo; চিহ্নিত পিস</li>
      </ul>

      <h2>পৌঁছানোর সময় ক্ষতিগ্রস্ত</h2>
      <p>পার্সেল ক্ষতিগ্রস্ত অবস্থায় পৌঁছালে খোলার আগে ছবি তুলুন এবং সেদিনই <a href="mailto:concierge@saanguine.com">concierge@saanguine.com</a>-এ আমাদের জানান। প্রতিস্থাপন বা অর্থ ফেরতের ব্যবস্থা করা হবে &mdash; পিস ফেরত পাঠানোর প্রয়োজন নেই।</p>

      <h2>অর্ডার বাতিল</h2>
      <p>কুরিয়ারের সঙ্গে বুকিং হওয়ার আগে আপনি অর্ডার বাতিল করতে পারেন। কুরিয়ার সংগ্রহ করে নেয়ার পর সেটি একটি চলমান ডেলিভারি হিসেবে গণ্য হবে এবং উপরের ফেরত নীতি প্রযোজ্য হবে।</p>

      <h2>যোগাযোগ</h2>
      <p>মেইসন স্যাঙ্গুইন, ঢাকা, বাংলাদেশ। <a href="mailto:concierge@saanguine.com">concierge@saanguine.com</a></p>
    </>
  );
}
