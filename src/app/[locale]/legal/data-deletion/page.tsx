export const metadata = { title: "Data Deletion" };

export default function DataDeletionPage() {
  return (
    <>
      <div className="legal-kicker">DATA DELETION</div>
      <h1>How to remove your data from the maison.</h1>
      <p className="legal-lede">Last updated: 2 May 2026.</p>

      <h2>Your right to be forgotten</h2>
      <p>
        You may at any time ask the maison to delete the personal information we hold on you — your name, contact details,
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
        the maison&apos;s access from the social provider directly — Facebook → Settings → Apps and Websites; Google → myaccount.google.com → Security → Third-party apps.
      </p>

      <h2>What we cannot delete</h2>
      <p>
        Bangladeshi tax law (NBR) requires us to retain a record of completed orders for seven years. Those records — invoice number,
        amount, items, delivery address — must remain on file even after a deletion request. We will, on request, anonymise the personal
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
