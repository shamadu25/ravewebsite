interface SoftwareSchemaProps {
  name: string;
  description: string;
  applicationCategory: string;
  operatingSystem?: string;
  offers?: {
    price?: string;
    priceCurrency?: string;
    priceDescription?: string;
  };
  features?: string[];
  url: string;
}

export default function SoftwareAppSchema({
  name,
  description,
  applicationCategory,
  operatingSystem = "Web, Android, iOS",
  offers,
  features = [],
  url,
}: SoftwareSchemaProps) {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name,
    description,
    applicationCategory,
    operatingSystem,
    url,
    author: {
      "@type": "Organization",
      name: "RaveSoft Digital Solutions",
      url: "https://ravesoftsolutions.com",
    },
    publisher: {
      "@type": "Organization",
      name: "RaveSoft Digital Solutions",
      url: "https://ravesoftsolutions.com",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "5",
      ratingCount: "500",
      bestRating: "5",
      worstRating: "1",
    },
  };

  if (offers) {
    schema.offers = {
      "@type": "Offer",
      price: offers.price ?? "0",
      priceCurrency: offers.priceCurrency ?? "USD",
      description: offers.priceDescription ?? "Contact for pricing",
    };
  }

  if (features.length > 0) {
    schema.featureList = features.join(", ");
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
