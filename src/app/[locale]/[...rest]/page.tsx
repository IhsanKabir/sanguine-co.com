import { notFound } from "next/navigation";

// Unknown paths inside a locale (/bn/xyz) matched no route, so Next fell back
// to the root not-found: English, lang="en", no nav or footer. Catching them
// here renders [locale]/not-found.tsx in the visitor's language instead.
export default function CatchAllNotFound() {
  notFound();
}
