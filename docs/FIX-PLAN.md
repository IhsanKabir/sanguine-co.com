# Sanguine fix plan

Started 12 Nov 2026, after the weakness analysis. This file is the single list
of what is being fixed, in order, what the owner needs to do, and enough detail
for anyone (or any assistant) to pick the work up. Update the table and the
change log in every PR.

Status key: DONE, IN REVIEW (PR open, waiting for merge), NEXT, LATER,
OWNER (only the owner can do it).

## The plan

| # | Fix | Who | Status |
|---|-----|-----|--------|
| 1 | Alerts: emails were never sent; owner alert for every order and request; waiting-time badge in Admin | Claude, owner | DONE (PR #68, tested live). SMS is not connected, see A5 |
| 1b | Preorder form fills in name, phone and address by itself | Claude | DONE (PR #69) |
| H | Home hero: the wave background is back instead of one rose bouquet photo | Claude | IN REVIEW |
| 2 | Security updates (Next.js, Sentry and others) and a spam guard on the request form | Claude | NEXT |
| 3 | Contact and FAQ pages; flower refund wording; flowers promised in Dhaka only | Claude | NEXT (all answers in) |
| G | Board games launch: products in Admin, then posts and Reels with descriptions | Owner adds products (C3), Claude writes posts and renders videos | NEXT, needs the list of games (T6) |
| V | Video maker: type the lines, pick photos, get a branded vertical video | Claude | LATER, owner has not said "build it" yet |
| 4 | Mark test orders so reports show real revenue; leave the owner's own visits out of traffic | Claude | LATER |
| 5 | Meta Pixel behind the cookie consent | Claude, needs owner step R4 | LATER |
| 6 | Tests for prices, deposits and stock | Claude | LATER |
| 8 | Home page: campaign slot and category panels (mockups are on the design canvas) | Claude, needs owner approval | LATER |
| R | Reach: Instagram, Google Business Profile, Search Console, posting by hand | Owner, steps R1 to R5 | OWNER (Instagram being opened 12 Nov) |
| C | Catalogue: bouquet details, clothing and board game products, category wording | Owner, steps C1 to C4 | OWNER |
| B | Backups: confirm the Supabase plan | Owner, step B1 | OWNER |

## Owner guide

### A. Alerts

A1 to A4 are done (12 Nov): the alert email and the customer email arrive.

**A5. SMS alerts (optional, later).** No SMS arrives because the shop has no SMS account: the SSL Wireless keys are empty everywhere. Getting one usually needs business papers, so leave it until the trade licence exists. Until then, make the email alert loud on your phone:
1. Install the Gmail app and sign in with the alert address.
2. In Gmail on a computer, open one alert email, then the three dots, then "Filter messages like these". Choose "Never send to Spam", "Always mark as important" and apply the label "Sanguine alerts".
3. In the Gmail app: Settings, your account, Notifications, and give the "Sanguine alerts" label its own sound under Manage labels.

**Reply-time habit.** Flower prices are hidden, so your reply is the sale. Aim to send the price within 2 hours between 10am and 8pm. The badge in Admin, Pre-orders turns amber after 2 hours and red after 12.

### R. Reach (the biggest gap: almost nobody has seen the shop)

**R1. Post by hand, 3 to 5 times a week.** Posts made through the API are visible only to you. Upload the Reels and photos yourself in Meta Business Suite (business.facebook.com). Claude prepares the videos and captions.

**R2. Instagram.** Create the account. If the code does not arrive at concierge@sanguine-co.com, use your Gmail for now and switch later. Then link Instagram to the Facebook page in Meta Business Suite, Settings, Accounts, and give Claude the profile link so it goes on the site.

**R3. Google Business Profile.** Go to business.google.com, add "Sanguine", category "Florist" (add "Gift shop" as a second), service area Dhaka, website sanguine-co.com, phone 01777603364. Google will verify by phone or video. This is what makes the shop appear on Google Maps and in "flower delivery Dhaka" searches.

**R4. Google Search Console and Meta Pixel.**
- Search Console: go to search.google.com/search-console, add `sanguine-co.com` as a Domain property. It gives you a TXT record. Add it in Cloudflare, DNS, then press Verify. Then open Sitemaps and submit `https://sanguine-co.com/sitemap.xml`.
- Pixel: in Meta Events Manager, create a Pixel for sanguine-co.com and give Claude the Pixel ID (a number, it is not a secret).

**R5. First reviews.** Offer the first 5 to 10 bouquets to people you know at cost. Ask each for an honest review on the site and a photo you may post.

### C. Catalogue

**C1. Bouquet details.** In Admin, Products, open each bouquet and fill "Details": number of stems, size (height and width), wrapping, and how long it stays fresh. Rename "THE 100 LYCHEE BOUQUET" to "The 100 Lychee Bouquet".

**C2. Clothing.** Add at least 8 pieces with real photos before unhiding the category. If that is not ready by 16 Nov, move the launch date instead of opening with 2 or 3 pieces.

**C3. Board games (5 games in hand).** For each game: Admin, Products, New, category Boardgames, a real price, your own photos (box front, box back, the pieces laid out, a game in play), stock quantity, and in Details: players, age, play time, language, what is in the box. Unhide the category when 3 or more are in. Claude then checks the pages and prepares the posts.

**C4. Category wording.** Before unhiding any category, open Admin, Segments and replace the old tag and description. Boardgames: name "Board games", tag "Games", description "Games for long evenings". Turn preorder off for board games that are in stock. Clothing still says "Garments cut with patience" with tag "Atelier".

### T. Answers Claude needs

- **T1.** ANSWERED: phone 01777603364 for now.
- **T2.** ANSWERED: no licence yet; the owner will apply once sales grow. Nothing is shown in the footer until then.
- **T3.** ANSWERED: returns 3 days in general. Flowers: a refund on the spot if the customer does not like the bouquet.
- **T4.** ANSWERED: flowers are delivered in Dhaka only for now.
- **T5.** ANSWERED: on a flower refund, only the delivery charge is deducted, and only if needed.
- **T6.** OPEN: the 5 board games. For each: name, price, how many in stock, and where the photos are (a folder on this computer is fine).

### B. Backups

**B1.** Open supabase.com, the Sanguine project, then Settings, then Billing. Tell Claude whether the plan is Free or Pro. The Free plan keeps no backups, so Claude will set up a weekly export.

## Working notes for whoever continues

Rules that must hold in every change:
- The owner merges PRs. Give the PR link; do not merge.
- No em dashes anywhere (CI checks). Voice guide: `docs/BRAND-VOICE.md`. Only state facts the owner confirmed.
- Flowers stay preorder-only with hidden prices. Never suggest visible prices or instant buy for flowers.
- A PR with a database migration: the owner runs the SQL in Supabase first, it is verified with a read-only query, and only then is the merge link given.
- Any email or SMS send goes through `runAfterResponse()` (`src/lib/background.ts`). A bare unawaited promise is dropped on Vercel.
- Show a screenshot and get a yes before merging anything that changes how a page looks.
- Speed target: PageSpeed mobile 90 or more on home, shop and product. Measure preview against preview.
- Never print or ask for secrets; they live in `web/.env` and in Vercel.

Detail for the open fixes:

**Fix 2, security updates and spam guard.**
- `npm audit --omit=dev` showed 29 advisories on 12 Nov, two critical (`next`, `@sentry/nextjs`). Update within the same major versions first (`npm audit fix`, then `next` to the latest 15.x and Sentry to the latest 10.x). `zod` 3 to 4 is a breaking change: do it alone, in its own PR, or leave it.
- Add `src/app/global-error.tsx` for Sentry (the build warns about it).
- Spam guard on `createProductPreorderRequest` and `createPreorderRequest` (`src/lib/actions/preorders.ts`): a hidden honeypot field, plus a limit per IP and per email (for example 5 requests an hour), the same way `src/lib/actions/stock-notify.ts` limits. The form emails whatever address is typed, so this protects the sender reputation.
- Check: build, CI, then one real request on the preview still works.

**Fix 3, Contact, FAQ and policy wording.**
- New pages `/contact` and `/faq` in both languages (`src/app/[locale]/contact`, `/faq`), linked in the footer, added to the sitemap.
- Contact: phone 01777603364, WhatsApp, Messenger, concierge@sanguine-co.com, reply hours 10am to 8pm, "based in Dhaka". No street address and no licence number until the owner provides them.
- FAQ: how a flower order works (request, price, deposit by bKash, made fresh, delivered within 48 hours in Dhaka), payment, delivery, returns.
- Returns page (`src/app/[locale]/legal/returns/page.tsx`): add a flowers section: if the customer does not like the bouquet on delivery, the deposit is refunded on the spot, less the delivery charge only if needed.
- Flowers in Dhaka only: the home lede, meta description and shipping page say "delivered across Bangladesh". Make the flower promise "delivered in Dhaka"; keep "across Bangladesh" for categories that ship by courier. The preorder form for a flower product should say Dhaka only and reject other cities with a clear message.

**Fix G, board games launch.**
- After the owner adds the products (C3, T6): check each product page live, then write for each game one Facebook and Instagram caption in English and Bangla with a link carrying `?utm_source=facebook&utm_medium=social&utm_campaign=boardgames`, and one short Reel scene file in `social-studio/videos/`.
- Render with `social-studio/render.mjs`. The owner uploads by hand (R1).
- Descriptions come from the box and the owner, not from memory: wrong player counts or play times are a returns risk.

**Fix V, Video maker.**
- A local page in `social-studio` (it cannot run on the website: rendering needs Playwright and ffmpeg). The owner types the lines in English and Bangla, picks product photos or a live-site recording, presses Render, and gets a 1080x1920 MP4.
- It is a front for the existing `render.mjs` and `stage.html`. No generated footage of products. Generated footage for mood or backgrounds only, through a paid service, if the owner asks.

**Fix 4, clean numbers.** The 7 delivered orders of 30 Apr to 3 May and the ৳160 refund look like tests: confirm with the owner, then exclude them from `src/lib/revenue.ts` reports (a flag, not a delete). Skip analytics events for signed-in admins.

**Fix 5, Pixel.** Load the Meta Pixel only after cookie consent, with PageView, ViewContent and Lead (request sent). Re-measure speed.

**Fix 6, tests.** Unit tests for `src/lib/pricing.ts`, `src/lib/variant-stock.ts`, deposit math in `preorders.ts`, and `quote-message.ts`. Add a CI step that fails when a migration file exists that production has not applied.

**Fix 8, home redesign.** Mockups: design canvas, row "Home: the brand on top, the categories under it". A campaign slot in Admin (image, headline, button) that falls back to the wave background, and one photo panel per open category with the photo set in Admin, Segments (needs a migration for the cover image). Needs the owner's approval of the mockups first.

## Change log

- 12 Nov 2026: plan created after the weakness analysis.
- 12 Nov 2026: fix 1 merged (PR #68) and tested by the owner: alert and customer emails arrive, SMS does not (no SMS account).
- 12 Nov 2026: fix 1b merged (PR #69). Owner answered T1 to T5.
- 12 Nov 2026: fix H opened: the home hero goes back to the wave background (reverts the photo hero of PR #67).
