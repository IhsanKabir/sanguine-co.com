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
| H | Home hero: the wave background is back instead of one rose bouquet photo | Claude | DONE (PR #70; the empty desktop arch and faint text fixed in PR #76) |
| 2 | Security updates (Next.js, Sentry and others) and a spam guard on the request form | Claude | DONE (PR #71, tested live). 29 advisories down to 9; what is left is listed under fix 2b |
| 3 | Contact and FAQ pages; flower refund wording; flowers promised in Dhaka only | Claude | DONE (PR #72, live) |
| 3b | Grey strip down the left edge of every page on phones (shadow of the closed menu); Contact and FAQ polish; Questions and Contact in the phone menu | Claude | DONE (PR #73, live) |
| 3c | Open phone menu was covered at the bottom by the cookie bar (it hid the language switch for first-time visitors) | Claude | DONE (PR #74, live) |
| 3d | Instagram on the site, reply hours (10am to 10pm), and the product import takes Details and Care columns | Claude | DONE (PR #75) |
| G | Board games launch: listings imported; shop pictures and three videos remade as 3D boxes built from the owner's photos, all checked (`E:\Documents\Retail Platform\board-games`) | Owner: re-upload the CSV (ages), stock, photos, category settings, unhide, post. One photo of the Daybreak box. Better photos when there is half an hour | OWNER (steps in that folder's README) |
| Q | Quality check after every video and for shop pictures, with a written standard | Claude | DONE (13 Nov; 3D boxes added 14 Nov). `social-studio/qc.mjs`; the standard and the owner's photo guide are in `social-studio/quality-standard.md` |
| V | Video maker: type the lines, pick photos, get a branded vertical video | Claude | DONE (12 Nov). Double-click `social-studio/Video maker.cmd`. Videos for three board games are made and checked, each with the game's own box in 3D; Daybreak waits for a photo |
| 4 | Mark test orders so reports show real revenue; leave the owner's own visits out of traffic | Claude, owner ran the SQL | DONE (PR #77; migration 0024 run and checked 13 Nov). Owner: open Admin once on each device |
| 5 | Meta Pixel behind the cookie consent | Claude, needs owner step R4 | LATER |
| 6 | Tests for prices, deposits and stock | Claude | NEXT |
| 8 | Home page: campaign slot and category panels (mockups are on the design canvas) | Claude, needs owner approval | LATER |
| R | Reach: Instagram, Google Business Profile, Search Console, posting by hand | Owner, steps R1 to R5 | OWNER (Instagram open: instagram.com/thesanguineco) |
| C | Catalogue: bouquet details, clothing and board game products, category wording | Owner, steps C1 to C4 | OWNER |
| B | Backups: confirm the Supabase plan | Owner, step B1 | OWNER |

## Owner guide

### A. Alerts

A1 to A4 are done (12 Nov): the alert email and the customer email arrive.

**A5. SMS alerts (optional, later).** No SMS arrives because the shop has no SMS account: the SSL Wireless keys are empty everywhere. Getting one usually needs business papers, so leave it until the trade licence exists. Until then, make the email alert loud on your phone:
1. Install the Gmail app and sign in with the alert address.
2. In Gmail on a computer, open one alert email, then the three dots, then "Filter messages like these". Choose "Never send to Spam", "Always mark as important" and apply the label "Sanguine alerts".
3. In the Gmail app: Settings, your account, Notifications, and give the "Sanguine alerts" label its own sound under Manage labels.

**Reply-time habit.** Flower prices are hidden, so your reply is the sale. Aim to send the price within 2 hours between 10am and 10pm (the hours the Contact page promises). The badge in Admin, Pre-orders turns amber after 2 hours and red after 12.

### R. Reach (the biggest gap: almost nobody has seen the shop)

**R1. Post by hand, 3 to 5 times a week.** Posts made through the API are visible only to you. Upload the Reels and photos yourself in Meta Business Suite (business.facebook.com). Claude prepares the videos and captions.

**R2. Instagram.** DONE 13 Nov: https://www.instagram.com/thesanguineco/ is on the site (footer, Contact page, and the brand data Google reads). Still to do: link Instagram to the Facebook page in Meta Business Suite, Settings, Accounts, and put the shop link in the Instagram bio.

**R3. Google Business Profile.** Go to business.google.com, add "Sanguine", category "Florist" (add "Gift shop" as a second), service area Dhaka, website sanguine-co.com, phone 01777603364. Google will verify by phone or video. This is what makes the shop appear on Google Maps and in "flower delivery Dhaka" searches.

**R4. Google Search Console and Meta Pixel.**
- Search Console: go to search.google.com/search-console, add `sanguine-co.com` as a Domain property. It gives you a TXT record. Add it in Cloudflare, DNS, then press Verify. Then open Sitemaps and submit `https://sanguine-co.com/sitemap.xml`.
- Pixel: in Meta Events Manager, create a Pixel for sanguine-co.com and give Claude the Pixel ID (a number, it is not a secret).

**R5. First reviews.** Offer the first 5 to 10 bouquets to people you know at cost. Ask each for an honest review on the site and a photo you may post.

### C. Catalogue

**C1. Bouquet details.** In Admin, Products, open each bouquet and fill "Details": number of stems, size (height and width), wrapping, and how long it stays fresh. Rename "THE 100 LYCHEE BOUQUET" to "The 100 Lychee Bouquet".

**C2. Clothing.** Add at least 8 pieces with real photos before unhiding the category. If that is not ready by 16 Nov, move the launch date instead of opening with 2 or 3 pieces.

**C3. Board games (4 games in hand: Exploding Kittens ৳1,800, One Night Ultimate Werewolf ৳1,500, One Night Ultimate Werewolf Daybreak ৳1,500, Coup ৳1,400; prices from the Summer 2024 list, confirm them).** Everything is ready in `E:\Documents\Retail Platform\board-games`: follow its README. In short: merge the import PR (3d), upload `board-games.csv` in Admin, Products, Import, add your photos, set the category name and switch its preorder off, then unhide it. Stock is set to 1 of each. The pictures to upload are in `photos\ready`; Daybreak has none until its box is photographed.

**C4. Category wording.** Before unhiding any category, open Admin, Segments and replace the old tag and description. Boardgames: name "Board games", tag "Games", description "Games for long evenings". Turn preorder off for board games that are in stock. Clothing still says "Garments cut with patience" with tag "Atelier".

### T. Answers Claude needs

- **T1.** ANSWERED: phone 01777603364 for now.
- **T2.** ANSWERED: no licence yet; the owner will apply once sales grow. Nothing is shown in the footer until then.
- **T3.** ANSWERED: returns 3 days in general. Flowers: a refund on the spot if the customer does not like the bouquet.
- **T4.** ANSWERED: flowers are delivered in Dhaka only for now.
- **T5.** ANSWERED: on a flower refund, only the delivery charge is deducted, and only if needed.
- **T7.** ANSWERED 13 Nov: replies between 10am and 10pm (days not stated, so the site does not name them).
- **T8.** ANSWERED 13 Nov: all orders so far (the 7 delivered on 30 Apr to 3 May and the ৳160 refund of 14 Jul) were tests.
- **T6.** ANSWERED: four games, names and prices as in C3. Still needed from the owner: stock counts and photos.

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

**Fix 2, security updates and spam guard (in review).**
- Done: `next` 15.5.15 to 15.5.29 and `@sentry/nextjs` 10.51 to 10.78 (both were rated critical), plus `npm audit fix`. 29 advisories became 9.
- Done: `src/app/global-error.tsx` reports rendering errors to Sentry.
- Done: spam guard. The preorder form has a hidden honeypot field, and `src/lib/request-guard.ts` limits each network to 20 requests an hour (counted in `events` as `form_attempt:preorder`). The limit of 3 requests per email per 10 minutes was already there.

**Fix 2b, the 9 advisories that are left (later, each alone in its own PR).**
- `zod` 3 to 4 (rated high: a very large list can use up memory during validation). A breaking change across about 20 files. Server actions already cap the request size, which limits the risk.
- `next-intl` 3 to 4 (moderate). A breaking change in how translations are set up.
- `postcss` inside Next.js, and `glob` and `minimatch` inside the Sentry build plugin (build tools only, they do not run on the live site). They clear when Next.js and Sentry ship updates.

**Fix 3, Contact, FAQ and policy wording (done: PR #72, then PR #73 for fix 3b; the menu stacking point is fix 3c, in review).**
- Done: `/contact` and `/faq` in both languages, linked in the footer and in the sitemap. The FAQ takes its figures from Admin, Settings and carries FAQ structured data for search engines. Contact details live in `src/lib/contact.ts`.
- Done: the returns page has a flowers section (deposit refunded straight away, less the delivery charge only if needed); the terms page no longer says "no deposit" for made-to-order pieces.
- Done: flowers are Dhaka only. `src/lib/delivery-scope.ts` lists the Dhaka-only categories (`flowers`). The home lede, meta description, top bar, moving strip and "How it works" pick their wording from the open categories: Dhaka wording while only flowers are open, "across Bangladesh, flowers in Dhaka only" once a courier category opens. The preorder form fixes the city to Dhaka for flowers and the server rejects other cities.
- Reply hours (T7) are on the Contact page and in the FAQ, from `REPLY_HOURS` in `src/lib/contact.ts` (fix 3d). No street address and no licence number until the owner provides them.
- To change the wording later: the strings are in `src/messages/en.json` and `bn.json` under keys ending in `Dhaka` and `Mixed`. An edit of the base string in Admin, Editorial (for example the announcement bar) also replaces its Dhaka and Mixed variants, unless a variant is edited itself (`expandVariantOverrides` in `src/lib/copy.ts`).
- Done, found while checking the screenshots: the closed phone menu cast a grey shadow down the left edge of every page on phones. The shadow now shows only while the menu is open.
- Done in fix 3b: Questions and Contact links in the phone menu.
- Fix 3c: the open menu now sits above the cookie bar and the chat buttons. The drawer is inside the sticky nav (z-index 40), so the nav itself rises while the menu is open (`.nav:has(.mobile-drawer.open)` in `src/styles/extras.css`).
- Seen, not changed: a full-screen canvas and a custom cursor layer are still mounted on phones, where they do nothing. Worth removing on touch devices in a later speed pass.

**Fix G, board games launch (waiting for the owner's last steps).**
- `E:\Documents\Retail Platform\board-games` (outside the repo): `board-games.csv` for Admin, Products, Import; `README.md`, the owner's steps; `make-board-games.cjs`, which writes the CSV, the video texts in `social-studio/videos/` and the captions in `social-studio/captions/` from one list of facts.
- Facts were checked on 13 Nov against several shops' listings: players, playing time and contents agree everywhere. One Night Ultimate Werewolf Daybreak is 3 to 7 players on its own, up to 10 with the original. Ages come from the owner's boxes and graphics: Exploding Kittens 7+, One Night Ultimate Werewolf 8+, Daybreak 8+, Coup 14+ (its box back; the spines say 13+).
- The owner imported the CSV on 13 Nov (four products, hidden category, stock 1 each). The regenerated CSV adds the ages; re-uploading it is safe while prices and stock in the shop still match the file.
- Photos: the owner's originals are in `board-games/photos/<game>/`. On 14 Nov the owner was still not satisfied with the flat pictures, so each box is now rebuilt in 3D from photos of its own faces: `social-studio/packshot.mjs` straightens the front, back and spine (spines from the group photo) per `photos/shots.json`; `social-studio/boxshot.mjs` builds the box at its real size with three.js (MIT, saved in `social-studio/vendor`), lights it like a studio shot and lays it on one paper ground in the shop's 3:4 shape (1200 x 1600), per `photos/boxes.json`. Nothing is generated: every printed surface is the owner's photo; the light and the shadow are drawn. Earlier versions (4:5 with blurred bars, then flat straightened boxes) were replaced. Four files are designed graphics with a "TableTop" logo and are not used. Daybreak has no photo of its own, so it has no picture and no video yet.
- Videos: `social-studio/out/<game>.mp4` for Coup, Exploding Kittens and One Night Ultimate Werewolf. The template (`stage.html`, with `stage-box.js` and `box3d.js`) opens on the 3D box large, keeps every word inside Meta's safe zone for vertical video (between its two gold lines), turns the box round through its spine to its back (or tilts it to its spine) and comes back for the price. The browser here draws 3D only in software (flags in `social-studio/lib/browser.mjs`); a video takes about 3 minutes with frames shared across four browsers (longer when the laptop is low on power). The old Daybreak video is in `out/not-ready/` and must not be posted.
- Quality check: `social-studio/qc.mjs` runs by itself after every render and shows under the video in the Video maker; `node qc.mjs <video or folder of pictures>` runs it by hand; reports are in `social-studio/out/qc/`. What it enforces, the sources, the comparison with the publishers' own product pages and the owner's 30 minute photo guide: `social-studio/quality-standard.md`. Finding of that comparison: the boxes now look like the publishers' own main pictures (a lit 3D box), but the faces are still phone photos of wrapped boxes, and the publishers also show the contents and people playing; only the owner's camera can add those. The shop's product frames are 3:4 and phones show only the middle of them, which the pictures now respect.
- The captions link to `/en/product/<slug>` (slugs: exploding-kittens-original-edition, one-night-ultimate-werewolf, one-night-ultimate-werewolf-daybreak, coup), which open once the category is unhidden.
- Next for Claude: when the owner says the category is open, check the four product pages live (photos, details, price, add to bag).

**Fix V, Video maker (done).**
- `social-studio/studio.mjs` (a local server on 127.0.0.1:4477, no dependencies) and `studio.html`, started with `Video maker.cmd`. Scenes are Words, Photo or Website recording; the page shows a live preview and runs `render.mjs`. How to use it: `social-studio/README.md`.
- `social-studio` is not a git repository; it lives only on the owner's computer.
- No generated footage of products. Generated footage for mood or backgrounds only, through a paid service, if the owner asks.

**Fix 4, clean numbers (done, PR #77).**
- Migration `supabase/migrations/0024_test_orders_staff_visits.sql`: `orders.is_test` (the 8 orders the owner confirmed as tests are set) and `events.is_staff` (past events from any browser that opened Admin are set: 1,382 of 1,862 events on 13 Nov; over the last 30 days page views go from 438 to 130).
- `notTestOrder` and `countsAsRevenue` in `src/lib/revenue.ts` leave test orders out of the dashboard, analytics, reports, the sales export and the customers list. Test orders stay in Admin, Orders with a "Test" label, and the order drawer has a "Mark as test order" button for future tests. The orders CSV export gets an `is_test` column.
- The shop's own visits: Admin sets a cookie (`ssg_staff`, `src/lib/staff.ts`, `StaffMarker` in the Admin layout); `trackEvent` writes `is_staff` from it; Admin, Behaviour leaves those events out.
- The owner ran the SQL first (13 Nov); a read-only check found both columns, 8 test orders and 1,382 flagged events; a test visit carrying the cookie on the preview was recorded with `is_staff = true`. A device only counts as the owner's after Admin is opened on it once.

**Fix 5, Pixel.** Load the Meta Pixel only after cookie consent, with PageView, ViewContent and Lead (request sent). Re-measure speed.

**Fix 6, tests.** Unit tests for `src/lib/pricing.ts`, `src/lib/variant-stock.ts`, deposit math in `preorders.ts`, and `quote-message.ts`. Add a CI step that fails when a migration file exists that production has not applied.

**Fix 8, home redesign.** Mockups: design canvas, row "Home: the brand on top, the categories under it". A campaign slot in Admin (image, headline, button) that falls back to the wave background, and one photo panel per open category with the photo set in Admin, Segments (needs a migration for the cover image). Needs the owner's approval of the mockups first.

## Change log

- 12 Nov 2026: plan created after the weakness analysis.
- 12 Nov 2026: fix 1 merged (PR #68) and tested by the owner: alert and customer emails arrive, SMS does not (no SMS account).
- 12 Nov 2026: fix 1b merged (PR #69). Owner answered T1 to T5.
- 12 Nov 2026: fix H merged (PR #70): the home hero is the wave background again.
- 12 Nov 2026: Video maker built and tested; drafts saved for the four board games.
- 12 Nov 2026: fix 2 merged (PR #71); the owner's test request arrived on the new versions.
- 12 Nov 2026: fix 3 merged (PR #72): Contact and FAQ pages, flower refund wording, flowers in Dhaka only.
- 12 Nov 2026: fix 3b merged (PR #73): no more grey strip from the closed phone menu, Contact and FAQ polish, Questions and Contact in the phone menu, and an owner's edit in Admin, Editorial now covers the Dhaka wording too.
- 12 Nov 2026: fix 3c merged (PR #74): the open phone menu sits above the cookie bar.
- 13 Nov 2026: owner answered T7 (10am to 10pm) and T8 (all orders so far are tests), and opened Instagram. Board games content pack written. Fix 3d opened.
- 13 Nov 2026: fix 3d merged (PR #75) and the desktop hero fixed (PR #76: no empty arch, readable text). Fix 4 written; waiting for the owner to run migration 0024.
- 13 Nov 2026: fix 4 merged (PR #77) after the owner ran migration 0024.
- 13 Nov 2026: owner imported the board games and added photos. Ages added to the CSV, photos prepared for the shop, four videos rendered.
- 13 Nov 2026: owner asked for a quality check after generation and a comparison with the global brands. The first pictures and videos did not pass: wrong shape for the shop, blurred bars, text under the apps' buttons. Check built, pictures and three videos remade to pass it, Daybreak held back until its box is photographed.
- 14 Nov 2026: owner still not satisfied with the pictures and videos. Boxes rebuilt in 3D from the owner's own photos of their faces, for the shop pictures and the videos; all pass the check.
- Working note: the owner merges a PR as soon as its checks are green. Finish and verify the work on a pushed branch first (Vercel builds a preview for any branch), and open the PR only when nothing more will be added.
