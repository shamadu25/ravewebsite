interface ArticleSchemaProps {
  title: string;
  description: string;
  datePublished: string;
  slug: string;
}

export default function ArticleSchema({ title, description, datePublished, slug }: ArticleSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description: description,
    datePublished: datePublished,
    dateModified: datePublished,
    author: {
      "@type": "Organization",
      name: "RaveSoft Digital Solutions",
      url: "https://ravesoftsolutions.com",
    },
    publisher: {
      "@type": "Organization",
      name: "RaveSoft Digital Solutions",
      url: "https://ravesoftsolutions.com",
      logo: {
        "@type": "ImageObject",
        url: "https://ravesoftsolutions.com/img/logo.png",
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://ravesoftsolutions.com/blog/${slug}`,
    },
    image: `https://ravesoftsolutions.com/api/og?title=${encodeURIComponent(title)}`,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
