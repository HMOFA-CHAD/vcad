import fs from "fs";
import path from "path";
import matter from "gray-matter";

const contentDirectory = path.join(process.cwd(), "content");

export interface ContentMeta {
  title: string;
  description: string;
  section?: "beginner" | "intermediate" | "advanced";
  order?: number;
  difficulty?: "Beginner" | "Intermediate" | "Advanced";
  time?: string;
  playground?: {
    exampleId: string;
  };
}

export interface ContentItem {
  slug: string;
  meta: ContentMeta;
}

export interface ContentData {
  meta: ContentMeta;
  content: string;
}

/**
 * Get a single content file by category and slug.
 * For nested paths (e.g., learn/beginner/hello-cube), pass slug as array or joined string.
 */
export function getContentBySlug(
  category: string,
  slug: string | string[]
): ContentData {
  const slugPath = Array.isArray(slug) ? slug.join("/") : slug;
  const fullPath = path.join(contentDirectory, category, `${slugPath}.mdx`);

  const fileContents = fs.readFileSync(fullPath, "utf8");
  const { data, content } = matter(fileContents);

  return {
    meta: data as ContentMeta,
    content,
  };
}

/**
 * Get all content items in a category (non-recursive).
 * Returns metadata only, sorted by order field if present.
 */
export function getAllContent(category: string): ContentItem[] {
  const categoryPath = path.join(contentDirectory, category);

  if (!fs.existsSync(categoryPath)) {
    return [];
  }

  const files = fs.readdirSync(categoryPath);
  const items: ContentItem[] = [];

  for (const file of files) {
    if (!file.endsWith(".mdx")) continue;

    const filePath = path.join(categoryPath, file);
    const stat = fs.statSync(filePath);

    if (stat.isFile()) {
      const fileContents = fs.readFileSync(filePath, "utf8");
      const { data } = matter(fileContents);
      const slug = file.replace(/\.mdx$/, "");

      items.push({
        slug,
        meta: data as ContentMeta,
      });
    }
  }

  // Sort by order if present, otherwise alphabetically
  return items.sort((a, b) => {
    if (a.meta.order !== undefined && b.meta.order !== undefined) {
      return a.meta.order - b.meta.order;
    }
    return a.slug.localeCompare(b.slug);
  });
}

/**
 * Get all content items in a nested category (e.g., learn/beginner).
 */
export function getNestedContent(
  category: string,
  subcategory: string
): ContentItem[] {
  const categoryPath = path.join(contentDirectory, category, subcategory);

  if (!fs.existsSync(categoryPath)) {
    return [];
  }

  const files = fs.readdirSync(categoryPath);
  const items: ContentItem[] = [];

  for (const file of files) {
    if (!file.endsWith(".mdx")) continue;

    const filePath = path.join(categoryPath, file);
    const fileContents = fs.readFileSync(filePath, "utf8");
    const { data } = matter(fileContents);
    // Remove numeric prefix and extension: "01-hello-cube.mdx" -> "hello-cube"
    const slug = file.replace(/\.mdx$/, "").replace(/^\d+-/, "");

    items.push({
      slug,
      meta: data as ContentMeta,
    });
  }

  // Sort by order if present
  return items.sort((a, b) => {
    if (a.meta.order !== undefined && b.meta.order !== undefined) {
      return a.meta.order - b.meta.order;
    }
    return a.slug.localeCompare(b.slug);
  });
}

/**
 * Get all slug paths for static generation.
 * For flat categories like cookbook.
 */
export function getContentPaths(category: string): string[] {
  const categoryPath = path.join(contentDirectory, category);

  if (!fs.existsSync(categoryPath)) {
    return [];
  }

  const files = fs.readdirSync(categoryPath);
  return files
    .filter((file) => file.endsWith(".mdx"))
    .map((file) => file.replace(/\.mdx$/, ""));
}

/**
 * Get all nested slug paths for static generation.
 * Returns array of [subcategory, slug] tuples.
 */
export function getNestedContentPaths(
  category: string
): { subcategory: string; slug: string }[] {
  const categoryPath = path.join(contentDirectory, category);

  if (!fs.existsSync(categoryPath)) {
    return [];
  }

  const paths: { subcategory: string; slug: string }[] = [];
  const entries = fs.readdirSync(categoryPath, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const subcategoryPath = path.join(categoryPath, entry.name);
      const files = fs.readdirSync(subcategoryPath);

      for (const file of files) {
        if (file.endsWith(".mdx")) {
          // Remove numeric prefix and extension
          const slug = file.replace(/\.mdx$/, "").replace(/^\d+-/, "");
          paths.push({ subcategory: entry.name, slug });
        }
      }
    }
  }

  return paths;
}

/**
 * Resolve MDX file path accounting for numeric prefixes.
 * "hello-cube" might be stored as "01-hello-cube.mdx"
 */
export function resolveContentPath(
  category: string,
  slug: string | string[]
): string | null {
  const slugPath = Array.isArray(slug) ? slug.join("/") : slug;
  const dir = path.dirname(path.join(contentDirectory, category, slugPath));
  const filename = path.basename(slugPath);

  if (!fs.existsSync(dir)) {
    return null;
  }

  const files = fs.readdirSync(dir);

  // Try exact match first
  if (files.includes(`${filename}.mdx`)) {
    return path.join(dir, `${filename}.mdx`);
  }

  // Try with numeric prefix
  const prefixedFile = files.find((f) => {
    const stripped = f.replace(/^\d+-/, "").replace(/\.mdx$/, "");
    return stripped === filename;
  });

  if (prefixedFile) {
    return path.join(dir, prefixedFile);
  }

  return null;
}

/**
 * Get content by slug, resolving numeric prefixes.
 */
export function getContentBySlugResolved(
  category: string,
  slug: string | string[]
): ContentData | null {
  const filePath = resolveContentPath(category, slug);

  if (!filePath || !fs.existsSync(filePath)) {
    return null;
  }

  const fileContents = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(fileContents);

  return {
    meta: data as ContentMeta,
    content,
  };
}

/**
 * Get navigation info (prev/next) for a content item in a list.
 */
export function getNavigation(
  items: ContentItem[],
  currentSlug: string,
  baseHref: string
): { prev: { href: string; title: string } | null; next: { href: string; title: string } | null } {
  const currentIndex = items.findIndex((item) => item.slug === currentSlug);

  const prevItem = currentIndex > 0 ? items[currentIndex - 1] : null;
  const nextItem = currentIndex >= 0 && currentIndex < items.length - 1 ? items[currentIndex + 1] : null;

  const prev = prevItem
    ? {
        href: `${baseHref}/${prevItem.slug}`,
        title: prevItem.meta.title,
      }
    : null;

  const next = nextItem
    ? {
        href: `${baseHref}/${nextItem.slug}`,
        title: nextItem.meta.title,
      }
    : null;

  return { prev, next };
}
