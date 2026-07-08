import { setRequestLocale } from "next-intl/server";
import { legalMetadata } from "../_metadata";

type Props = { params: Promise<{ locale: string }> };

export const generateMetadata = ({ params }: Props) => legalMetadata("shipping", params);

export default async function ShippingPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return locale === "bn" ? <BangleSection /> : <EnglishSection />;
}

function EnglishSection() {
  return (
    <>
      <div className="legal-kicker">SHIPPING</div>
      <h1>How we deliver, and how long it takes.</h1>
      <p className="legal-lede">Last updated: 2 May 2026.</p>

      <h2>Where we ship</h2>
      <p>The maison ships nationwide within Bangladesh &mdash; sixty-four districts, every upazila served by Pathao or Steadfast. We do not ship internationally at this time; if you are abroad and would like a piece sent within Bangladesh, you may of course place the order and have it delivered to a Bangladeshi address.</p>

      <h2>How we ship</h2>
      <p>Stock orders are typically dispatched within one working day of order confirmation. Bespoke pieces are dispatched on the date stated in the quote.</p>
      <p>We use:</p>
      <ul>
        <li><b>Pathao Courier</b> &mdash; primary, for Dhaka and the major divisional cities</li>
        <li><b>Steadfast Courier</b> &mdash; fallback and for routes Pathao does not serve well</li>
      </ul>

      <h2>How long it takes</h2>
      <table className="legal-table">
        <thead><tr><th>Destination</th><th>Typical</th><th>Maximum</th></tr></thead>
        <tbody>
          <tr><td>Within Dhaka</td><td>1&ndash;2 working days</td><td>4 working days</td></tr>
          <tr><td>Outside Dhaka, divisional cities</td><td>2&ndash;4 working days</td><td>7 working days</td></tr>
          <tr><td>Rural addresses</td><td>3&ndash;7 working days</td><td>10 working days</td></tr>
        </tbody>
      </table>
      <p>These are typical figures, not guarantees. During Eid weeks, monsoon flooding, or hartal/civic disruption, all couriers slow down and we cannot promise the above.</p>

      <h2>Shipping cost</h2>
      <p>Shipping is calculated at checkout based on destination and parcel weight. For orders over ৳5,000, shipping is complimentary anywhere in Bangladesh.</p>

      <h2>Cash on Delivery</h2>
      <p>All orders at present are paid in cash on delivery &mdash; please have the displayed total ready in hand for our courier. The courier may carry change for amounts up to ৳1,000; for larger amounts, it helps both of you to have the exact amount.</p>
      <p>A small COD handling fee (typically ৳20&ndash;40, displayed at checkout) is added by the courier and passed on transparently.</p>

      <h2>Tracking</h2>
      <p>When your parcel is collected, we email and SMS you the tracking number from your courier. You can also see live tracking on your order page after signing in.</p>

      <h2>Failed deliveries</h2>
      <p>The courier will attempt delivery up to two times. If both attempts fail, the parcel is held at the nearest depot for seven days, after which it is returned to the maison. If your parcel is returned to us, we will write to you to arrange re-delivery (charged at cost) or a refund.</p>

      <h2>Contact</h2>
      <p>Sanguine, Dhaka, Bangladesh. <a href="mailto:concierge@sanguine-co.com">concierge@sanguine-co.com</a></p>
    </>
  );
}

function BangleSection() {
  return (
    <>
      <div className="legal-kicker">শিপিং</div>
      <h1>আমরা কীভাবে পৌঁছে দিই, এবং কতদিন লাগে।</h1>
      <p className="legal-lede">সর্বশেষ আপডেট: ২ মে ২০২৬।</p>

      <h2>কোথায় পাঠাই</h2>
      <p>মেইসন বাংলাদেশের সারা দেশে পাঠায় &mdash; চৌষট্টি জেলা, Pathao বা Steadfast যেসব উপজেলায় পরিষেবা দেয় সব। বর্তমানে আমরা আন্তর্জাতিক শিপিং করি না; আপনি বিদেশে থেকেও বাংলাদেশের কোনো ঠিকানায় ডেলিভারির জন্য অবশ্যই অর্ডার করতে পারেন।</p>

      <h2>কীভাবে পাঠাই</h2>
      <p>স্টক অর্ডার সাধারণত অর্ডার নিশ্চিতকরণের এক কর্মদিবসের মধ্যে প্রেরিত হয়। বেসপোক পিস কোটে উল্লিখিত তারিখে প্রেরিত হয়।</p>
      <p>আমরা ব্যবহার করি:</p>
      <ul>
        <li><b>Pathao Courier</b> &mdash; প্রাথমিক, ঢাকা ও বিভাগীয় শহরগুলোর জন্য</li>
        <li><b>Steadfast Courier</b> &mdash; বিকল্প, এবং যেসব রুটে Pathao কম পরিষেবা দেয় সেগুলোর জন্য</li>
      </ul>

      <h2>সময় কত লাগে</h2>
      <table className="legal-table">
        <thead><tr><th>গন্তব্য</th><th>সাধারণ</th><th>সর্বোচ্চ</th></tr></thead>
        <tbody>
          <tr><td>ঢাকার ভেতরে</td><td>১&ndash;২ কর্মদিবস</td><td>৪ কর্মদিবস</td></tr>
          <tr><td>ঢাকার বাইরে, বিভাগীয় শহর</td><td>২&ndash;৪ কর্মদিবস</td><td>৭ কর্মদিবস</td></tr>
          <tr><td>গ্রামীণ ঠিকানা</td><td>৩&ndash;৭ কর্মদিবস</td><td>১০ কর্মদিবস</td></tr>
        </tbody>
      </table>
      <p>এগুলো সাধারণ চিত্র, গ্যারান্টি নয়। ঈদ সপ্তাহ, বন্যা, কিংবা হরতাল/অন্য বিঘ্নের সময় সকল কুরিয়ার ধীর হয় এবং উপরোক্ত সময় আমরা নিশ্চিত করতে পারি না।</p>

      <h2>শিপিং খরচ</h2>
      <p>চেকআউটে গন্তব্য ও পার্সেলের ওজনের ভিত্তিতে শিপিং হিসাব করা হয়। ৳৫,০০০-এর বেশি অর্ডারে বাংলাদেশের যেকোনো জায়গায় শিপিং বিনামূল্যে।</p>

      <h2>ক্যাশ অন ডেলিভারি</h2>
      <p>বর্তমানে সকল অর্ডার ক্যাশ অন ডেলিভারিতে পরিশোধিত &mdash; অনুগ্রহ করে কুরিয়ারের জন্য প্রদর্শিত মোট অর্থ হাতে রাখুন। কুরিয়ার ৳১,০০০ পর্যন্ত খুচরা বহন করতে পারেন; বেশি অঙ্কের ক্ষেত্রে নির্দিষ্ট পরিমাণ থাকলে দু&rsquo;পক্ষেরই সুবিধা।</p>
      <p>একটি ছোট COD হ্যান্ডলিং ফি (সাধারণত ৳২০&ndash;৪০, চেকআউটে প্রদর্শিত) কুরিয়ার যোগ করে এবং স্বচ্ছভাবে গ্রাহকের কাছে আসে।</p>

      <h2>ট্র্যাকিং</h2>
      <p>পার্সেল সংগ্রহ করা হলে আমরা আপনার কুরিয়ারের ট্র্যাকিং নম্বর ইমেইল ও SMS-এ পাঠাই। সাইন-ইনের পর আপনার অর্ডার পাতায়ও সরাসরি ট্র্যাকিং দেখতে পারেন।</p>

      <h2>ডেলিভারি ব্যর্থ হলে</h2>
      <p>কুরিয়ার সর্বোচ্চ দু&rsquo;বার ডেলিভারির চেষ্টা করবে। দুটি প্রচেষ্টা ব্যর্থ হলে পার্সেল নিকটস্থ ডিপোয় সাত দিন রাখা হবে, এর পর মেইসনে ফেরত আসবে। আপনার পার্সেল ফিরে এলে আমরা পুনরায় ডেলিভারি (খরচ গ্রাহকের) কিংবা অর্থ ফেরতের জন্য আপনাকে লিখব।</p>

      <h2>যোগাযোগ</h2>
      <p>সাঙ্গুইন, ঢাকা, বাংলাদেশ। <a href="mailto:concierge@sanguine-co.com">concierge@sanguine-co.com</a></p>
    </>
  );
}
