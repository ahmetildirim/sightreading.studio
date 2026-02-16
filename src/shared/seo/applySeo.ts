import { APP_TITLE } from "../config/appMeta";
import {
  absoluteUrl,
  DEFAULT_OG_IMAGE_PATH,
  DEFAULT_SEO_KEYWORDS,
  SITE_ORIGIN,
  type RouteSeoConfig,
} from "../config/seo";

const PAGE_JSON_LD_ID = "srl-webpage-jsonld";
const BREADCRUMB_JSON_LD_ID = "srl-breadcrumb-jsonld";

function ensureMetaTag(attribute: "name" | "property", key: string): HTMLMetaElement {
  const selector = `meta[${attribute}="${key}"]`;
  const existingTag = document.head.querySelector<HTMLMetaElement>(selector);
  if (existingTag) return existingTag;

  const tag = document.createElement("meta");
  tag.setAttribute(attribute, key);
  document.head.append(tag);
  return tag;
}

function setMetaContent(
  attribute: "name" | "property",
  key: string,
  content: string,
): void {
  const tag = ensureMetaTag(attribute, key);
  tag.content = content;
}

function ensureCanonicalLink(): HTMLLinkElement {
  const existingLink = document.head.querySelector<HTMLLinkElement>(
    'link[rel="canonical"]',
  );
  if (existingLink) return existingLink;

  const link = document.createElement("link");
  link.rel = "canonical";
  document.head.append(link);
  return link;
}

function setJsonLd(id: string, data: Record<string, unknown>): void {
  const existingNode = document.getElementById(id);
  const existingScript =
    existingNode instanceof HTMLScriptElement ? existingNode : null;
  const script = existingScript ?? document.createElement("script");

  if (existingNode && !existingScript) {
    existingNode.remove();
  }

  script.id = id;
  script.type = "application/ld+json";
  script.text = JSON.stringify(data);

  if (!existingScript) {
    document.head.append(script);
  }
}

function pageLabelFromPath(path: string): string {
  const segment = path.replace(/^\/+/, "") || "home";
  return segment.charAt(0).toUpperCase() + segment.slice(1);
}

export function applySeo(seo: RouteSeoConfig): void {
  const canonicalUrl = absoluteUrl(seo.canonicalPath);
  const ogImageUrl = absoluteUrl(DEFAULT_OG_IMAGE_PATH);

  document.title = seo.title;

  setMetaContent("name", "description", seo.description);
  setMetaContent("name", "robots", seo.robots);
  setMetaContent("name", "keywords", DEFAULT_SEO_KEYWORDS);
  setMetaContent("name", "author", APP_TITLE);

  setMetaContent("property", "og:type", seo.ogType ?? "website");
  setMetaContent("property", "og:locale", "en_US");
  setMetaContent("property", "og:site_name", APP_TITLE);
  setMetaContent("property", "og:title", seo.title);
  setMetaContent("property", "og:description", seo.description);
  setMetaContent("property", "og:url", canonicalUrl);
  setMetaContent("property", "og:image", ogImageUrl);
  setMetaContent("property", "og:image:alt", `${APP_TITLE} — piano sight-reading practice app`);
  setMetaContent("property", "og:image:width", "512");
  setMetaContent("property", "og:image:height", "512");

  setMetaContent("name", "twitter:card", "summary_large_image");
  setMetaContent("name", "twitter:title", seo.title);
  setMetaContent("name", "twitter:description", seo.description);
  setMetaContent("name", "twitter:image", ogImageUrl);

  const canonicalLink = ensureCanonicalLink();
  canonicalLink.href = canonicalUrl;

  // WebPage structured data
  setJsonLd(PAGE_JSON_LD_ID, {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: seo.title,
    description: seo.description,
    url: canonicalUrl,
    inLanguage: "en",
    isPartOf: {
      "@type": "WebSite",
      name: APP_TITLE,
      url: SITE_ORIGIN,
    },
    publisher: {
      "@type": "Organization",
      name: APP_TITLE,
      url: SITE_ORIGIN,
      logo: {
        "@type": "ImageObject",
        url: ogImageUrl,
      },
    },
  });

  // BreadcrumbList structured data
  setJsonLd(BREADCRUMB_JSON_LD_ID, {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: APP_TITLE,
        item: SITE_ORIGIN,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: pageLabelFromPath(seo.canonicalPath),
        item: canonicalUrl,
      },
    ],
  });
}
