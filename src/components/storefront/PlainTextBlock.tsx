/**
 * Renders admin-entered plain text (size guides, materials, care) without
 * HTML: lines containing "|" become table rows — the first such row is the
 * header — and every other non-empty line is a paragraph. Pure, so it works
 * in server and client components and cannot inject markup.
 */
export default function PlainTextBlock({ text }: { text: string }) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const blocks: ({ kind: "p"; text: string } | { kind: "table"; rows: string[][] })[] = [];
  for (const line of lines) {
    if (line.includes("|")) {
      const cells = line.split("|").map((c) => c.trim());
      const last = blocks[blocks.length - 1];
      if (last && last.kind === "table") last.rows.push(cells);
      else blocks.push({ kind: "table", rows: [cells] });
    } else {
      blocks.push({ kind: "p", text: line });
    }
  }
  return (
    <>
      {blocks.map((b, i) =>
        b.kind === "p" ? (
          <p key={i}>{b.text}</p>
        ) : (
          <div key={i} className="pdp-info-table-wrap">
            <table className="pdp-info-table">
              <thead>
                <tr>{b.rows[0].map((c, j) => <th key={j} scope="col">{c}</th>)}</tr>
              </thead>
              <tbody>
                {b.rows.slice(1).map((r, k) => (
                  <tr key={k}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        ),
      )}
    </>
  );
}
