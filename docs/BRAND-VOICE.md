# Sanguine brand voice

Read this before writing any customer-facing text: storefront copy (`src/messages/en.json`, `bn.json`), emails, SMS, legal pages, product and category descriptions, social posts.

## Who Sanguine is

Sanguine is a house of considered things, based in Dhaka, with several categories (flowers, perfume, books, jewelry, clothing, watches, accessories, anime and manga, boardgames). Categories open one at a time; flowers opened first. Brand-level copy (home headline, tab title, tagline, About) is about Sanguine, never about one category.

Copy that names categories must only name the ones customers can shop. On the homepage that list comes from the visible segments at render time (`src/lib/category-list.ts`), so unhiding a category in admin updates the copy by itself. Do not hard-code category names into brand copy, and do not describe hidden categories or their products.

Home tab title: **Sanguine · Considered gifts, Dhaka**. Brand line: **Things worth keeping**.

## The voice: quiet confidence

Think Aesop, Byredo, The Row. Confidence comes from what is left out.

1. **Plain over poetic.** Say what the thing is and what happens next. "Made to order. Paid for on arrival." Not "the slow unspooling of a season".
2. **Specific over impressive.** Numbers, places, days, what's in the box. "Delivered within Dhaka in two days" beats "white-glove service".
3. **Short sentences, few adjectives.** One adjective is usually enough; zero is often better.
4. **We, not "the maison".** Sanguine speaks as "we" and writes to "you". "Sanguine" is the name; it is not decorated.
5. **True or nothing.** Only state what is real and current: no invented founders, suppliers, staff, wages, awards, press or craft processes. If the owner can't confirm it, it doesn't go on the site.
6. **Calm about money.** Prices, fees and policies are stated once, clearly, without apology or hype.

## Words we don't use

maison (as a name for Sanguine) · atelier (as a name for Sanguine; it is reserved for a future house) · ceremony / ceremonial · curated · curiosities · the violet hour · unspooling · couturier · patron · elevate · elevated · premium · luxurious · exquisite · stunning · iconic · timeless · indulge · journey · experience · Roman-numeral years (MMXXVI) · invented French (Initié)

## Punctuation

- **Never the em dash**, in any form. Use a comma, colon, full stop or brackets. CI enforces this (`npm run check:dashes`).
- Title separator is the middle dot: "The Journal · Sanguine".
- Sentence case for headings and buttons ("Shop flowers", not "Shop Flowers").

## Bangla

Write natural, everyday Bangla that a Dhaka customer would say aloud, not a word-for-word translation of the English. Keep the same facts and the same restraint. The brand name is সাঙ্গুইন.

## Examples

| Instead of | Write |
|---|---|
| Perfume, flora & quiet ceremonies for the violet hour. | Things worth keeping. |
| Enter the Boutique | Shop flowers |
| The maison will write back within a day or two. | We'll reply within a day or two. |
| Ceremonial packaging · Wax-sealed. | Gift wrapping · With a note, if you'd like one. |
| CEREMONY COMPLETE | Order placed |
| Wax-sealing the parcel. | Packing your order. |
