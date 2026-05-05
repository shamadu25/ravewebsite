import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | RaveSoft Digital Solutions",
  description: "Terms of service for RaveSoft Digital Solutions Ltd — governing the use of our website and software development services.",
};

export default function TermsOfServicePage() {
  return (
    <>
      <section className="relative bg-[#050816] pt-32 pb-16 lg:pt-40">
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white leading-[1.15] tracking-tight mb-4">
            Terms of Service
          </h1>
          <p className="text-gray-400">Last updated: 1 May 2026</p>
        </div>
      </section>

      <section className="bg-white py-16 lg:py-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="prose prose-gray prose-lg max-w-none prose-headings:font-bold prose-headings:text-gray-900 prose-p:text-gray-600 prose-li:text-gray-600 prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline">

            <div>
              <h2>1. Acceptance of Terms</h2>
              <p>
                By accessing or using the RaveSoft Digital Solutions Ltd website (ravesoft.io)
                or engaging our services, you agree to be bound by these Terms of Service.
                If you do not agree to these terms, please do not use our website or services.
              </p>
            </div>

            <div>
              <h2>2. Services</h2>
              <p>
                RaveSoft Digital Solutions Ltd provides software development, website design,
                mobile app development, business automation, POS systems, ERP systems, and
                related digital services. The specific terms of each engagement are governed
                by a separate Project Agreement or Service Contract signed between RaveSoft
                and the client.
              </p>
            </div>

            <div>
              <h2>3. Intellectual Property</h2>
              <p>
                All content on this website — including text, graphics, logos, and code —
                is owned by RaveSoft Digital Solutions Ltd and protected by applicable
                intellectual property laws.
              </p>
              <p className="mt-3">
                For custom software projects, intellectual property ownership is defined in
                the Project Agreement. Unless otherwise specified, clients receive full
                ownership of the final deliverables upon completion of payment.
              </p>
            </div>

            <div>
              <h2>4. Project Engagements</h2>
              <p>
                All software development projects are governed by a separate Project Agreement
                that defines scope, deliverables, timelines, payment terms, intellectual
                property ownership, confidentiality obligations, and post-launch support terms.
                These Terms of Service apply to use of the website only.
              </p>
            </div>

            <div>
              <h2>5. Website Use</h2>
              <p>You agree not to:</p>
              <ul className="mt-3 space-y-2 list-disc pl-5">
                <li>Use the website for any unlawful purpose</li>
                <li>Attempt to gain unauthorized access to any portion of the website</li>
                <li>Transmit any harmful, offensive, or disruptive content</li>
                <li>Reproduce or distribute website content without written permission</li>
                <li>Use automated tools to scrape or extract website data</li>
              </ul>
            </div>

            <div>
              <h2>6. Limitation of Liability</h2>
              <p>
                RaveSoft Digital Solutions Ltd makes no warranties, express or implied,
                regarding the accuracy or completeness of information on this website.
                We are not liable for any indirect, incidental, or consequential damages
                arising from use of this website or reliance on information contained herein.
              </p>
              <p className="mt-3">
                Our total liability for any claims arising from our services is limited to
                the amount paid by the client for the specific service giving rise to the claim,
                unless otherwise specified in the Project Agreement.
              </p>
            </div>

            <div>
              <h2>7. Privacy</h2>
              <p>
                Your use of our website is also governed by our{" "}
                <a href="/privacy" className="text-blue-600 hover:underline">
                  Privacy Policy
                </a>
                , which is incorporated into these Terms of Service by reference.
              </p>
            </div>

            <div>
              <h2>8. Governing Law</h2>
              <p>
                These Terms of Service are governed by the laws of the Republic of Ghana.
                Any disputes arising from these terms shall be subject to the exclusive
                jurisdiction of the courts of Ghana.
              </p>
            </div>

            <div>
              <h2>9. Changes to These Terms</h2>
              <p>
                We reserve the right to update these Terms of Service at any time. We will
                notify users of material changes by updating the &quot;Last updated&quot; date.
                Continued use of the website after changes constitutes acceptance of the
                updated terms.
              </p>
            </div>

            <div>
              <h2>10. Contact</h2>
              <p>
                For questions about these Terms of Service, contact us at:
              </p>
              <div className="mt-3 p-5 rounded-xl bg-[#F5F7FA] border border-gray-100">
                <p className="font-semibold text-gray-900">RaveSoft Digital Solutions Ltd</p>
                <p>Accra, Ghana</p>
                <p>
                  Email:{" "}
                  <a href="mailto:info@ravesoftsolutions.com" className="text-blue-600 hover:underline">
                    info@ravesoftsolutions.com
                  </a>
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>
    </>
  );
}
