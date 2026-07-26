import { readFileSync } from "node:fs";
import path from "node:path";

// Server Component only (uses fs) — inlines the SVG markup directly so
// stroke="currentColor" in the source file picks up whatever CSS `color`
// is set on this span (see category_icons/README.md). A plain <img src>
// can't do this since the browser treats the SVG as an opaque image.
const iconCache = new Map<string, string | null>();

function readIconSvg(slug: string): string | null {
  if (iconCache.has(slug)) return iconCache.get(slug) ?? null;

  try {
    const filePath = path.join(
      process.cwd(),
      "public",
      "category-icons",
      "svg",
      `${slug}.svg`,
    );
    const content = readFileSync(filePath, "utf8");
    iconCache.set(slug, content);
    return content;
  } catch {
    iconCache.set(slug, null);
    return null;
  }
}

export function CategoryIcon({
  slug,
  className,
}: {
  slug: string;
  className?: string;
}) {
  const svg = readIconSvg(slug);
  if (!svg) {
    return (
      <span
        className={`inline-block rounded bg-border-hairline-2 ${className ?? "h-6 w-6"}`}
        title={`Missing icon: ${slug}`}
      />
    );
  }

  return (
    <span
      className={`category-icon inline-block ${className ?? "h-6 w-6"}`}
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
