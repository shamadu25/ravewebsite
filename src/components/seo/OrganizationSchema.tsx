export default function OrganizationSchema() {
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": ["Organization", "LocalBusiness", "ProfessionalService"],
    "@id": "https://ravesoftsolutions.com/#organization",
    name: "RaveSoft Digital Solutions Ltd",
    alternateName: "RaveSoft",
    url: "https://ravesoftsolutions.com",
    logo: "https://ravesoftsolutions.com/img/logo.png",
    description:
      "RaveSoft Digital Solutions builds websites, custom software, SaaS platforms, POS systems, ERP solutions, mobile apps, and automation for 500+ businesses across Ghana, Nigeria, Kenya, South Africa, and all 40+ African countries.",
    slogan: "Software Solutions Built to Power Modern African Businesses",
    foundingDate: "2020",
    foundingLocation: "Accra, Ghana",
    numberOfEmployees: { "@type": "QuantitativeValue", minValue: 10 },
    areaServed: [
      "Ghana", "Nigeria", "Kenya", "South Africa", "Ivory Coast", "Senegal",
      "Tanzania", "Uganda", "Ethiopia", "Rwanda", "Cameroon", "Zimbabwe",
      "Zambia", "Mozambique", "Botswana", "Namibia", "Angola",
    ],
    contactPoint: [
      {
        "@type": "ContactPoint",
        telephone: "+233503319610",
        contactType: "customer service",
        areaServed: "GH",
        availableLanguage: "English",
      },
      {
        "@type": "ContactPoint",
        telephone: "+14065186775",
        contactType: "customer service",
        areaServed: "US",
        availableLanguage: "English",
      },
    ],
    email: "info@ravesoftsolutions.com",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Accra",
      addressCountry: "GH",
    },
    sameAs: [
      "https://www.linkedin.com/company/ravesoft-digital-solutions/",
      "https://www.facebook.com/ravesoftsolutions",
      "https://www.instagram.com/ravesoft_digital/",
    ],
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "RaveSoft Software Products & Services",
      itemListElement: [
        { "@type": "Offer", itemOffered: { "@type": "SoftwareApplication", name: "CliqPOS", applicationCategory: "BusinessApplication" } },
        { "@type": "Offer", itemOffered: { "@type": "SoftwareApplication", name: "Hotel Management System", applicationCategory: "BusinessApplication" } },
        { "@type": "Offer", itemOffered: { "@type": "SoftwareApplication", name: "Hospital Management System", applicationCategory: "MedicalApplication" } },
        { "@type": "Offer", itemOffered: { "@type": "SoftwareApplication", name: "School Management System", applicationCategory: "EducationalApplication" } },
        { "@type": "Offer", itemOffered: { "@type": "SoftwareApplication", name: "HR & Payroll Software", applicationCategory: "BusinessApplication" } },
        { "@type": "Offer", itemOffered: { "@type": "SoftwareApplication", name: "ERP System", applicationCategory: "BusinessApplication" } },
      ],
    },
  };

  const cliqposProductSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": "https://ravesoftsolutions.com/products/cliqpos#product",
    name: "CliqPOS",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web, Android, iOS",
    description:
      "CliqPOS is a cloud POS and business management system trusted by 500+ businesses across Ghana and Nigeria for retail, wholesale, restaurants, supermarkets, and pharmacies.",
    offers: {
      "@type": "Offer",
      availability: "https://schema.org/InStock",
      seller: { "@id": "https://ravesoftsolutions.com/#organization" },
    },
    publisher: { "@id": "https://ravesoftsolutions.com/#organization" },
    url: "https://ravesoftsolutions.com/products/cliqpos",
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "5",
      bestRating: "5",
      ratingCount: "500",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(cliqposProductSchema) }}
      />
    </>
  );
}
