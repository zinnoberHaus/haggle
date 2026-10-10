import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getGuide, guides } from "@/lib/guides";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return guides.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const guide = getGuide((await params).slug);
  return {
    title: guide?.title ?? "Guide not found",
    description: guide?.description,
  };
}

export default async function GuidePage({ params }: Props) {
  const guide = getGuide((await params).slug);
  if (!guide) notFound();
  return (
    <article className="content-narrow" style={{ paddingBlock: "2rem 4rem" }}>
      <Link href="/guides">All buying guides</Link>
      <header style={{ marginBlock: "2rem" }}>
        <p className="eyebrow">
          {guide.category} · {guide.readTime}
        </p>
        <h1 className="page-title">{guide.title}</h1>
        <p className="muted" style={{ fontSize: "1.15rem" }}>
          {guide.description}
        </p>
      </header>
      <aside
        className="panel"
        style={{ background: guide.tint, marginBottom: "2rem" }}
      >
        <p style={{ fontSize: "1.2rem", margin: 0 }}>{guide.takeaway}</p>
      </aside>
      <div className="prose">
        {guide.sections.map((section) => (
          <section key={section.heading} style={{ marginBottom: "2rem" }}>
            <h2>{section.heading}</h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            {section.checklist && (
              <ul>
                {section.checklist.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
      <section className="panel" style={{ marginBlock: "2rem" }}>
        <h2>{guide.example.title}</h2>
        <dl style={{ margin: "1rem 0" }}>
          {guide.example.rows.map((row) => (
            <div
              key={row.label}
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "1rem",
                paddingBlock: ".8rem",
                borderTop: "1px dashed #d6d1c6",
              }}
            >
              <dt>{row.label}</dt>
              <dd style={{ margin: 0, fontWeight: 600, textAlign: "right" }}>
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
        <p className="muted" style={{ fontSize: ".85rem" }}>
          {guide.example.note}
        </p>
      </section>
      <section>
        <h2>Read the source</h2>
        <p className="muted">
          Original Haggle editorial guidance. Provider terms can change; check
          the current source for your purchase.
        </p>
        <ul style={{ paddingLeft: "1.2rem", lineHeight: 1.8 }}>
          {guide.sources.map((source) => (
            <li key={source.url}>
              <a href={source.url} target="_blank" rel="noopener noreferrer">
                {source.label}
              </a>
            </li>
          ))}
        </ul>
      </section>
      <Link className="button" href="/" style={{ marginTop: "1rem" }}>
        Put it to use: browse deals
      </Link>
    </article>
  );
}
