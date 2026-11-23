export default function LegalLayout({ children }: { children: React.ReactNode }) {
  // The text as a cream card on the warm stage, its sections numbered (styles/content-stage.css).
  return (
    <div className="legal-shell">
      <article className="legal-page">
        {children}
      </article>
    </div>
  );
}
