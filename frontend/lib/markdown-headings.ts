export interface MarkdownHeading {
  depth: 1 | 2 | 3;
  text: string;
  slug: string;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

/**
 * Extract h1/h2/h3 headings from raw report markdown and assign stable,
 * de-duplicated slugs so the table of contents and in-content anchors agree.
 */
export function extractHeadings(markdown: string): MarkdownHeading[] {
  const headings: MarkdownHeading[] = [];
  const seen = new Map<string, number>();
  const lines = markdown.split("\n");

  for (const line of lines) {
    const match = /^(#{1,3})\s+(.+?)\s*$/.exec(line);
    if (!match) continue;
    const depth = match[1].length as 1 | 2 | 3;
    const text = match[2].trim();
    const base = slugify(text);
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    const slug = count === 0 ? base : `${base}-${count}`;
    headings.push({ depth, text, slug });
  }

  return headings;
}
