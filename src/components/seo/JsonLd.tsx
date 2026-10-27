/**
 * Renders an inline `<script type="application/ld+json">` for SEO structured data.
 * Server component: safe to use inside any page or layout. Pass any JSON-LD
 * shape (Organization, Product, BreadcrumbList, etc.) as `data`.
 *
 * Escapes the dangerous `</script>` and `<!--` sequences in the JSON output so
 * a maliciously-crafted product name or description can't break out of the
 * script block. Standard hardening pattern for JSON-LD.
 */
type Props = {
  data: Record<string, unknown> | Record<string, unknown>[];
};

function safeStringify(data: unknown): string {
  return JSON.stringify(data)
    .replace(/<\/script>/gi, "<\\/script>")
    .replace(/<!--/g, "<\\!--");
}

export default function JsonLd({ data }: Props) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeStringify(data) }}
    />
  );
}
