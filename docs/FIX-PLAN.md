# Sanguine fix plan

Started 12 Nov 2026, after the weakness analysis. This file is the single list
of what is being fixed, in order, and what the owner needs to do for each step.
It is updated with every PR.

Status key: DONE, IN REVIEW (PR open, waiting for merge), NEXT, LATER,
OWNER (only the owner can do it).

## The plan

| # | Fix | Who | Status |
|---|-----|-----|--------|
| 1 | Alerts: emails were never sent; add owner alert for every order and request; waiting-time badge in Admin | Claude, owner | DONE (PR #68, tested live 12 Nov: emails arrive). SMS is not connected, see A5 |
| 1b | Preorder form fills in name, phone and address by itself | Claude | IN REVIEW |
| 2 | Security updates (Next.js, Sentry and others) and a spam guard on the request form | Claude | NEXT |
| 3 | Contact and FAQ pages; business registration number in the footer | Claude, needs owner answers T1 to T3 | NEXT |
| 4 | Mark test orders so reports show real revenue; leave the owner's own visits out of traffic | Claude | LATER |
| 5 | Meta Pixel behind the cookie consent | Claude, needs owner step R4 | LATER |
| 6 | Tests for prices, deposits and stock | Claude | LATER |
| 7 | Flower delivery area: promise only where bouquets arrive fresh | Claude, needs owner answer T4 | LATER |
| 8 | Home page: campaign slot and category panels (mockups are on the design canvas) | Claude, needs owner approval | LATER |
| R | Reach: Instagram, Google Business Profile, Search Console, posting by hand | Owner, steps R1 to R5 | OWNER |
| C | Catalogue: bouquet details, clothing and board game products, category wording | Owner, steps C1 to C4 | OWNER |
| B | Backups: confirm the Supabase plan | Owner, step B1 | OWNER |

## Owner guide

### A. Alerts (do these right after merging fix 1)

**A1. Tell the site where to alert you.** About 3 minutes.
1. Open vercel.com, then the Sanguine project, then Settings, then Environment Variables.
2. Add `OWNER_ALERT_EMAIL` with your personal Gmail address. Tick Production.
3. Add `OWNER_ALERT_PHONE` with your mobile number, like `01XXXXXXXXX`. Tick Production.
4. Check that `BREVO_API_KEY` and `BREVO_FROM_EMAIL` are in the list. If either is missing, tell Claude.
5. Open Deployments, then the newest one, then the three dots, then Redeploy. New settings only apply after a redeploy.

**A2. Send a test request.** On your phone, open any bouquet on the live site and send a preorder request with your own details.

**A3. Check four things arrive.**
- An email "New pre-order request" in your Gmail. Look in Spam too. If it is in Spam, mark it "Not spam".
- An SMS on your phone.
- A "Request received" email at the address you typed in the form.
- In Admin, Pre-orders: the request shows a "Waiting under 1 h" badge.

**A4. Open Admin, then Health.** The row "Owner alerts (new orders and requests)" should be green. Reject the test request with the reason "Test".

If any of the four did not arrive, tell Claude which one.

**Reply-time habit.** Flower prices are hidden, so your reply is the sale. Aim to send the price within 2 hours between 10am and 8pm. The badge turns amber after 2 hours and red after 12.

**A5. SMS alerts (optional, later).** No SMS arrived because the shop has no SMS account yet: the SSL Wireless keys are empty everywhere. Getting one usually needs business papers, so leave it until the trade licence exists. Until then, make the email alert loud on your phone:
1. Install the Gmail app and sign in with the alert address.
2. In Gmail on a computer, open one alert email, then the three dots, then "Filter messages like these". Choose "Never send to Spam", "Always mark as important" and apply the label "Sanguine alerts".
3. In the Gmail app: Settings, your account, Notifications, set to "High priority only" or "All", and give the "Sanguine alerts" label its own sound under Manage labels.

### R. Reach (the biggest gap: almost nobody has seen the shop)

**R1. Post by hand, 3 to 5 times a week.** Posts made through the API are visible only to you. Upload the Reels and photos yourself in Meta Business Suite (business.facebook.com). Claude can prepare the videos and captions.

**R2. Instagram.** Retry creating the account with concierge@sanguine-co.com. Type the address carefully: only that exact address is forwarded. If the code still does not arrive, use your Gmail for now and switch later. Then link Instagram to the Facebook page in Meta Business Suite, Settings, Accounts.

**R3. Google Business Profile.** Go to business.google.com, add "Sanguine", category "Florist" (add "Gift shop" as a second), service area Dhaka, website sanguine-co.com. Google will verify by phone or video. This is what makes the shop appear on Google Maps and in "flower delivery Dhaka" searches.

**R4. Google Search Console and Meta Pixel.**
- Search Console: go to search.google.com/search-console, add `sanguine-co.com` as a Domain property. It gives you a TXT record. Add it in Cloudflare, DNS, then press Verify. Then open Sitemaps and submit `https://sanguine-co.com/sitemap.xml`.
- Pixel: in Meta Events Manager, create a Pixel for sanguine-co.com and give Claude the Pixel ID (a number, it is not a secret).

**R5. First reviews.** Offer the first 5 to 10 bouquets to people you know at cost. Ask each for an honest review on the site and a photo you may post.

### C. Catalogue

**C1. Bouquet details.** In Admin, Products, open each bouquet and fill "Details": number of stems, size (height and width), wrapping, and how long it stays fresh. Rename "THE 100 LYCHEE BOUQUET" to "The 100 Lychee Bouquet".

**C2. Clothing.** Add at least 8 pieces with real photos before unhiding the category. If that is not ready by 16 Nov, move the launch date instead of opening with 2 or 3 pieces.

**C3. Board games.** Add each game (real price, your own photos, players, age, play time, language, what is in the box, stock). Unhide when 3 or more are in.

**C4. Category wording.** Before unhiding any category, open Admin, Segments and replace the old tag and description. For example Boardgames: name "Board games", tag "Games", description "Games for long evenings". Clothing still says "Garments cut with patience" with tag "Atelier".

### T. Answers Claude needs

- **T1.** ANSWERED 12 Nov: 01777603364 for now.
- **T2.** ANSWERED 12 Nov: no licence yet; the owner will apply once sales grow. Nothing is shown in the footer until then.
- **T3.** ANSWERED 12 Nov: 3 days in general. Flowers: a refund on the spot if the customer does not like the bouquet.
- **T4.** OPEN: where can you really deliver a fresh bouquet? Dhaka only, or other cities too?
- **T5.** OPEN: for the flower refund, what exactly is refunded when a customer refuses a bouquet at the door: the full deposit, or the deposit minus delivery?

### B. Backups

**B1.** Open supabase.com, the Sanguine project, then Settings, then Billing. Tell Claude whether the plan is Free or Pro. The Free plan keeps no backups, so Claude will set up a weekly export.

## Change log

- 12 Nov 2026: plan created. Fix 1 opened as a PR.
- 12 Nov 2026: fix 1 merged (PR #68) and tested by the owner: alert and customer emails arrive, SMS does not (no SMS account). Owner answered T1 to T3. Fix 1b opened: the preorder form now fills in saved details.
