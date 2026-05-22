import Script from "next/script";
import { preconnect, prefetchDNS } from "react-dom";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

export default function GoogleAnalytics() {
  // Always hint at GA domains so connection is ready when GA_ID is set
  preconnect("https://www.googletagmanager.com");
  preconnect("https://www.google-analytics.com");
  prefetchDNS("https://stats.g.doubleclick.net");

  if (!GA_ID) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}', {
            page_path: window.location.pathname,
          });
        `}
      </Script>
    </>
  );
}
