import { useEffect, useMemo } from "react";
import type { ListingSeoPayload } from "../../seo/listingSeo";

type ListingSeoProps = {
  seo: ListingSeoPayload;
};

const upsertMetaTag = (
  selector: string,
  attributeName: "property" | "name",
  attributeValue: string,
  content: string
) => {
  let tag = document.querySelector(selector) as HTMLMetaElement | null;
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attributeName, attributeValue);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
};

const upsertCanonicalLink = (href: string) => {
  let linkTag = document.querySelector("link[rel='canonical']") as HTMLLinkElement | null;
  if (!linkTag) {
    linkTag = document.createElement("link");
    linkTag.setAttribute("rel", "canonical");
    document.head.appendChild(linkTag);
  }
  linkTag.setAttribute("href", href);
};

const upsertJsonLdScript = (id: string, payload: Record<string, unknown>) => {
  let scriptTag = document.getElementById(id) as HTMLScriptElement | null;
  if (!scriptTag) {
    scriptTag = document.createElement("script");
    scriptTag.id = id;
    scriptTag.type = "application/ld+json";
    document.head.appendChild(scriptTag);
  }
  scriptTag.textContent = JSON.stringify(payload);
};

const ListingSeo = ({ seo }: ListingSeoProps) => {
  const vehicleSchemaJson = useMemo(() => seo.vehicleSchema, [seo.vehicleSchema]);
  const breadcrumbSchemaJson = useMemo(() => seo.breadcrumbSchema, [seo.breadcrumbSchema]);
  const websiteSchemaJson = useMemo(() => seo.websiteSchema, [seo.websiteSchema]);

  useEffect(() => {
    document.title = seo.title;

    upsertMetaTag("meta[name='description']", "name", "description", seo.description);
    upsertMetaTag("meta[property='og:site_name']", "property", "og:site_name", seo.siteName);
    upsertMetaTag("meta[property='og:type']", "property", "og:type", "article");
    upsertMetaTag("meta[property='og:title']", "property", "og:title", seo.title);
    upsertMetaTag("meta[property='og:description']", "property", "og:description", seo.description);
    upsertMetaTag("meta[property='og:url']", "property", "og:url", seo.canonicalUrl);
    upsertMetaTag("meta[property='og:image']", "property", "og:image", seo.ogImage);
    upsertMetaTag("meta[property='og:image:width']", "property", "og:image:width", "1200");
    upsertMetaTag("meta[property='og:image:height']", "property", "og:image:height", "630");

    upsertMetaTag("meta[name='twitter:card']", "name", "twitter:card", "summary_large_image");
    upsertMetaTag("meta[name='twitter:title']", "name", "twitter:title", seo.title);
    upsertMetaTag("meta[name='twitter:description']", "name", "twitter:description", seo.description);
    upsertMetaTag("meta[name='twitter:image']", "name", "twitter:image", seo.ogImage);

    upsertCanonicalLink(seo.canonicalUrl);
    upsertJsonLdScript("listing-seo-vehicle-schema", vehicleSchemaJson);
    upsertJsonLdScript("listing-seo-breadcrumb-schema", breadcrumbSchemaJson);
    upsertJsonLdScript("listing-seo-website-schema", websiteSchemaJson);
  }, [
    breadcrumbSchemaJson,
    seo.canonicalUrl,
    seo.description,
    seo.ogImage,
    seo.siteName,
    seo.title,
    vehicleSchemaJson,
    websiteSchemaJson,
  ]);

  return null;
};

export default ListingSeo;
