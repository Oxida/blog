import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { marked } from "marked";

// Configuration Paths
const CONTENT_DIR = path.join(__dirname, "../content");
const TEMPLATE_DIR = path.join(__dirname, "../templates");
const PUBLIC_DIR = path.join(__dirname, "../public");
const DIST_DIR = path.join(__dirname, "../dist");
const SITE_URL = "https://oxida.github.io/blog";

// Utility: Calculate read time based on 200 words per minute
function getReadTime(text: string): number {
  const words = text.trim().split(/\s+/).length;
  return Math.ceil(words / 200);
}

// Utility: Recursively copy a directory (for public assets)
function copyDirectory(src: string, dest: string) {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDirectory(srcPath, destPath);
    else fs.copyFileSync(srcPath, destPath);
  }
}

// 1. Prepare output directory
if (fs.existsSync(DIST_DIR))
  fs.rmSync(DIST_DIR, { recursive: true, force: true });
fs.mkdirSync(DIST_DIR, { recursive: true });

// 2. Copy public assets (CSS, CNAME, robots.txt) to dist
if (fs.existsSync(PUBLIC_DIR)) copyDirectory(PUBLIC_DIR, DIST_DIR);

// 3. Load Templates
const postTemplate = fs.readFileSync(
  path.join(TEMPLATE_DIR, "post.html"),
  "utf-8",
);
const indexTemplate = fs.readFileSync(
  path.join(TEMPLATE_DIR, "index.html"),
  "utf-8",
);

// 4. Process Markdown Files
const files = fs
  .readdirSync(CONTENT_DIR)
  .filter((file) => file.endsWith(".md"));
const allPosts: any[] = [];

for (const file of files) {
  const rawContent = fs.readFileSync(path.join(CONTENT_DIR, file), "utf-8");
  const { data, content } = matter(rawContent); // Parse Frontmatter

  // Skip drafts unless we pass a flag (useful for later expansion)
  if (data.draft) continue;

  // Convert Markdown body to HTML
  const htmlContent = marked.parse(content) as string;
  const readTime = getReadTime(content);
  const slug = data.slug || file.replace(".md", "");

  // Inject data into Post Template
  let postHtml = postTemplate
    .replace(/{{ title }}/g, data.title || "Untitled")
    .replace(/{{ description }}/g, data.description || "")
    .replace(/{{ author }}/g, data.author || "Anonymous")
    .replace(/{{ date }}/g, data.date || "")
    .replace(/{{ readTime }}/g, readTime.toString())
    .replace(/{{ image }}/g, data.image || "")
    .replace(/{{ slug }}/g, slug)
    .replace(/{{ content }}/g, htmlContent);

  // Create Clean URL directory (dist/post-slug/index.html)
  const postDir = path.join(DIST_DIR, slug);
  if (!fs.existsSync(postDir)) fs.mkdirSync(postDir, { recursive: true });
  fs.writeFileSync(path.join(postDir, "index.html"), postHtml);

  // Save metadata for the index page and sitemap
  allPosts.push({ ...data, slug, readTime });
}

// 5. Generate Homepage (Blog Roll)
// Sort posts by newest date first
allPosts.sort(
  (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
);

const postListHtml = allPosts
  .map(
    (post) => `
    <div style="margin-bottom: 2rem;">
        <h2 style="margin-bottom: 0.5rem;"><a href="/blog/${post.slug}/" style="color: inherit; text-decoration: none;">${post.title}</a></h2>
        <p style="color: #6b6b6b; margin-top: 0;">${post.description}</p>
        <small style="color: #6b6b6b;">${post.date} · ${post.readTime} min read</small>
    </div>
`,
  )
  .join("");

const finalIndexHtml = indexTemplate.replace(/{{ posts }}/g, postListHtml);
fs.writeFileSync(path.join(DIST_DIR, "index.html"), finalIndexHtml);

// 6. Generate XML Sitemap for SEO
const sitemapItems = allPosts
  .map(
    (post) => `
  <url>
    <loc>${SITE_URL}/${post.slug}/</loc>
    <lastmod>${new Date(post.date).toISOString()}</lastmod>
  </url>
`,
  )
  .join("");

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE_URL}/</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
  </url>${sitemapItems}
</urlset>`;

fs.writeFileSync(path.join(DIST_DIR, "sitemap.xml"), sitemap);

console.log(`✅ Successfully built ${allPosts.length} posts!`);
