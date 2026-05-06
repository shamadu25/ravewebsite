export default function OrganizationSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "RaveSoft Digital Solutions Ltd",
    alternateName: "RaveSoft",
    url: "https://ravesoftsolutions.com",
    logo: "https://ravesoftsolutions.com/img/logo.png",
    description:
      "RaveSoft Digital Solutions builds websites, custom software, SaaS platforms, POS systems, ERP solutions, mobile apps, and automation for businesses across Ghana, Nigeria, Kenya, South Africa, and all 54 African countries.",
    foundingDate: "2020",
    foundingLocation: "Accra, Ghana",
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

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
