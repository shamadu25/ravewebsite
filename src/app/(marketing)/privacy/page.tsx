import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | RaveSoft Digital Solutions",
  description: "Privacy policy for RaveSoft Digital Solutions Ltd — how we collect, use, and protect your personal information.",
};

export default function PrivacyPolicyPage() {
  return (
    <>
      <section className="relative bg-[#050816] pt-32 pb-16 lg:pt-40">
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white leading-[1.15] tracking-tight mb-4">
            Privacy Policy
          </h1>
          <p className="text-gray-400">Last updated: 1 May 2026</p>
        </div>
      </section>

      <section className="bg-white py-16 lg:py-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="prose prose-gray prose-lg max-w-none prose-headings:font-bold prose-headings:text-gray-900 prose-p:text-gray-600 prose-li:text-gray-600 prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline">

            <div>
              <h2>1. Who We Are</h2>
              <p>
                RaveSoft Digital Solutions Ltd (&quot;RaveSoft&quot;, &quot;we&quot;,
                &quot;us&quot;, or &quot;our&quot;) is a software and digital transformation
                company based in Accra, Ghana. We operate the website{" "}
                <a href="https://ravesoft.io" className="text-blue-600 hover:underline">
                  ravesoft.io
                </a>{" "}
                and provide software development, automation, and digital services to businesses.
              </p>
            </div>

            <div>
              <h2>2. Information We Collect</h2>
              <p>We collect the following types of information:</p>
              <ul className="mt-3 space-y-2 list-disc pl-5">
                <li>
                  <strong>Contact information:</strong> Name, email address, phone number, and
                  company name when you submit a contact form, book a consultation, or reach
                  out to us directly.
                </li>
                <li>
                  <strong>Project information:</strong> Details about your business, project
                  goals, and requirements that you share when discussing a project with us.
                </li>
                <li>
                  <strong>Usage data:</strong> Pages visited, time on site, referral source,
                  and browser type — collected via analytics tools to improve our website.
                </li>
                <li>
                  <strong>Communication records:</strong> Emails, chat messages, and other
                  communications with our team.
                </li>
              </ul>
            </div>

            <div>
              <h2>3. How We Use Your Information</h2>
              <p>We use the information we collect to:</p>
              <ul className="mt-3 space-y-2 list-disc pl-5">
                <li>Respond to your inquiries and project requests</li>
                <li>Provide, manage, and improve our services</li>
                <li>Send project updates, proposals, and relevant communications</li>
                <li>Improve our website and user experience</li>
                <li>Comply with legal obligations</li>
              </ul>
              <p className="mt-3">
                We do not sell, rent, or trade your personal information to third parties.
              </p>
            </div>

            <div>
              <h2>4. Data Storage and Security</h2>
              <p>
                Your data is stored on secure, encrypted servers. We implement appropriate
                technical and organizational security measures to protect your information
                from unauthorized access, disclosure, or loss. Access to personal data is
                restricted to RaveSoft team members who need it to perform their work.
              </p>
            </div>

            <div>
              <h2>5. Third-Party Services</h2>
              <p>We may use trusted third-party services including:</p>
              <ul className="mt-3 space-y-2 list-disc pl-5">
                <li>Email service providers for communications</li>
                <li>Analytics platforms (e.g., Google Analytics) for website analytics</li>
                <li>Cloud hosting providers for website infrastructure</li>
              </ul>
              <p className="mt-3">
                These providers operate under their own privacy policies and are contractually
                required to handle your data securely.
              </p>
            </div>

            <div>
              <h2>6. Your Rights</h2>
              <p>You have the right to:</p>
              <ul className="mt-3 space-y-2 list-disc pl-5">
                <li>Request access to the personal information we hold about you</li>
                <li>Request correction of inaccurate information</li>
                <li>Request deletion of your personal data</li>
                <li>Opt out of marketing communications at any time</li>
              </ul>
              <p className="mt-3">
                To exercise these rights, contact us at{" "}
                <a href="mailto:info@ravesoftsolutions.com" className="text-blue-600 hover:underline">
                  info@ravesoftsolutions.com
                </a>
                .
              </p>
            </div>

            <div>
              <h2>7. Cookies</h2>
              <p>
                Our website uses cookies and similar technologies to improve your browsing
                experience and gather analytics data. By using our website, you consent to
                our use of cookies in accordance with this policy. You can disable cookies
                through your browser settings, though this may affect website functionality.
              </p>
            </div>

            <div>
              <h2>8. Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. We will notify you of
                significant changes by updating the &quot;Last updated&quot; date at the top
                of this page. We encourage you to review this policy periodically.
              </p>
            </div>

            <div>
              <h2>9. Contact Us</h2>
              <p>
                If you have questions about this Privacy Policy or how we handle your data,
                please contact us:
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
