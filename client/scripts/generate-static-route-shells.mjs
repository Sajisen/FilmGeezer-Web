import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const currentFile = fileURLToPath(import.meta.url);
const currentDirectory = dirname(currentFile);
const clientRoot = resolve(currentDirectory, "..");
const distDirectory = join(clientRoot, "dist");
const sourceIndexPath = join(distDirectory, "index.html");

const WEBSITE_STRUCTURED_DATA_ID =
  "filmgeezer-website-structured-data";

const routes = [
  {
    pathname: "/movies",
    output: "movies.html",
    title: "Movies | FilmGeezer",
    heading: "Discover Movies on FilmGeezer",
    description:
      "Explore movie discovery collections, trending titles, essentials, and recommendations on FilmGeezer.",
  },
  {
    pathname: "/tv",
    output: "tv.html",
    title: "TV Series | FilmGeezer",
    heading: "Discover TV Series on FilmGeezer",
    description:
      "Explore TV series discovery collections, trending titles, essentials, and recommendations on FilmGeezer.",
  },
  {
    pathname: "/anime",
    output: "anime.html",
    title: "Anime | FilmGeezer",
    heading: "Discover Anime on FilmGeezer",
    description:
      "Discover anime movies and series, trending titles, essentials, and recommendations on FilmGeezer.",
  },
  {
    pathname: "/k-drama",
    output: "k-drama.html",
    title: "K-Drama | FilmGeezer",
    heading: "Discover K-Drama on FilmGeezer",
    description:
      "Discover Korean movies and series, trending K-dramas, essentials, and recommendations on FilmGeezer.",
  },
  {
    pathname: "/about",
    output: "about.html",
    title: "About | FilmGeezer",
    heading: "About FilmGeezer",
    description:
      "Learn about FilmGeezer and its movie, TV, anime, and K-drama discovery experience.",
  },
  {
    pathname: "/contact",
    output: "contact.html",
    title: "Contact FilmGeezer",
    heading: "Contact FilmGeezer",
    description:
      "Contact FilmGeezer Support or continue an existing signed-in support conversation.",
  },
  {
    pathname: "/privacy",
    output: "privacy.html",
    title: "Privacy Policy | FilmGeezer",
    heading: "FilmGeezer Privacy Policy",
    description:
      "Learn how FilmGeezer handles account information, Watchlists, preferences, profile images, support messages, and security data.",
  },
  {
    pathname: "/terms",
    output: "terms.html",
    title: "Terms of Use | FilmGeezer",
    heading: "FilmGeezer Terms of Use",
    description:
      "Read the rules for using FilmGeezer and its movie, TV, anime, and K-drama discovery features.",
  },
];

function escapeHtmlAttribute(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function replaceTitle(html, title) {
  return html.replace(
    /<title>[\s\S]*?<\/title>/u,
    `<title>${title}</title>`,
  );
}

function replaceMetaByName(html, name, content) {
  const pattern = new RegExp(
    `<meta\\s+name="${name}"[^>]*>`,
    "u",
  );

  return html.replace(
    pattern,
    `<meta name="${name}" content="${escapeHtmlAttribute(content)}" />`,
  );
}

function replaceMetaByProperty(html, property, content) {
  const pattern = new RegExp(
    `<meta\\s+property="${property}"[^>]*>`,
    "u",
  );

  return html.replace(
    pattern,
    `<meta property="${property}" content="${escapeHtmlAttribute(content)}" />`,
  );
}

function replaceCanonical(html, canonicalUrl) {
  return html.replace(
    /<link\s+rel="canonical"[^>]*>/u,
    `<link rel="canonical" href="${canonicalUrl}" />`,
  );
}

function removeWebsiteStructuredData(html) {
  const pattern = new RegExp(
    `<script\\s+id="${WEBSITE_STRUCTURED_DATA_ID}"[\\s\\S]*?<\\/script>`,
    "u",
  );

  return html.replace(pattern, "");
}


const STATIC_FALLBACK_PATTERN =
  /<!-- FILMGEEZER_STATIC_FALLBACK_START -->[\s\S]*?<!-- FILMGEEZER_STATIC_FALLBACK_END -->/u;

function buildStaticFallback(route) {
  return `<!-- FILMGEEZER_STATIC_FALLBACK_START -->
      <main
        data-filmgeezer-static-fallback
        style="min-height:100vh;background:#020617;color:#f8fafc;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:48px 24px"
      >
        <div style="max-width:860px;margin:0 auto">
          <p style="color:#38bdf8;font-weight:700;letter-spacing:.08em">
            FILMGEEZER
          </p>
          <h1 style="font-size:clamp(2rem,5vw,3.5rem);line-height:1.05;margin:16px 0">
            ${escapeHtmlAttribute(route.heading)}
          </h1>
          <p style="max-width:700px;color:#cbd5e1;line-height:1.7">
            ${escapeHtmlAttribute(route.description)}
          </p>
          <nav aria-label="FilmGeezer public pages" style="margin-top:28px">
            <a href="/" style="color:#7dd3fc;margin-right:18px">Home</a>
            <a href="/movies" style="color:#7dd3fc;margin-right:18px">Movies</a>
            <a href="/tv" style="color:#7dd3fc;margin-right:18px">TV Series</a>
            <a href="/anime" style="color:#7dd3fc;margin-right:18px">Anime</a>
            <a href="/k-drama" style="color:#7dd3fc;margin-right:18px">K-Drama</a>
            <a href="/about" style="color:#7dd3fc">About</a>
          </nav>
          <p style="margin-top:32px;color:#64748b;font-size:.875rem">
            JavaScript enables the full interactive FilmGeezer experience.
          </p>
        </div>
      </main>
      <!-- FILMGEEZER_STATIC_FALLBACK_END -->`;
}

function replaceStaticFallback(html, route) {
  return html.replace(
    STATIC_FALLBACK_PATTERN,
    buildStaticFallback(route),
  );
}

function buildRouteShell(baseHtml, route) {
  const canonicalUrl = `https://filmgeezer.site${route.pathname}`;

  let html = replaceTitle(baseHtml, route.title);
  html = replaceMetaByName(html, "description", route.description);
  html = replaceMetaByName(
    html,
    "robots",
    "index, follow, max-image-preview:large",
  );
  html = replaceMetaByProperty(html, "og:title", route.title);
  html = replaceMetaByProperty(
    html,
    "og:description",
    route.description,
  );
  html = replaceMetaByProperty(html, "og:url", canonicalUrl);
  html = replaceMetaByName(html, "twitter:title", route.title);
  html = replaceMetaByName(
    html,
    "twitter:description",
    route.description,
  );
  html = replaceCanonical(html, canonicalUrl);
  html = removeWebsiteStructuredData(html);
  html = replaceStaticFallback(html, route);

  return html;
}

async function main() {
  const baseHtml = await readFile(sourceIndexPath, "utf8");

  await mkdir(distDirectory, { recursive: true });

  for (const route of routes) {
    const outputPath = join(distDirectory, route.output);
    const html = buildRouteShell(baseHtml, route);

    await writeFile(outputPath, html, "utf8");
    console.log(
      `Generated static search shell: ${route.pathname} -> ${route.output}`,
    );
  }
}

main().catch((error) => {
  console.error("Failed to generate FilmGeezer static route shells.");

  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(String(error));
  }

  process.exitCode = 1;
});
