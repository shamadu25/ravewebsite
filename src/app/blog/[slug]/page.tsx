import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Clock, Tag, User, Calendar } from "lucide-react";
import { BLOG_POSTS } from "@/lib/data";
import CTASection from "@/components/ui/CTASection";

type BlogSlugParams = { params: Promise<{ slug: string }> };

const BLOG_CONTENT: Record<string, React.ReactNode> = {
  "how-custom-software-helps-businesses-reduce-manual-work": (
    <>
      <p>
        Every week, businesses across Africa lose dozens of hours to manual work — printing sales
        reports from spreadsheets, manually updating stock counts, chasing down invoices, and
        re-entering data from one system into another. This is not just slow; it is expensive.
        Manual processes introduce errors, slow decision-making, and limit how fast a business
        can grow.
      </p>
      <p>
        Custom software solves this by building automation and intelligence directly into the
        way your business works. Instead of adapting your operations to a generic tool, you get
        a system designed around your exact workflows, your team, and your goals.
      </p>
      <h2>What manual work actually costs your business</h2>
      <p>
        Before understanding the solution, it helps to see the full cost of manual operations.
        Most business owners underestimate it. Consider a business that manually enters sales
        from a paper register into a spreadsheet at the end of each day. That takes time.
        Someone has to do it. Errors creep in. Stock counts drift. By the time a manager tries
        to understand how the business is performing, the data is stale and unreliable.
      </p>
      <p>
        Now multiply that across procurement, supplier payments, staff attendance, customer
        follow-up, and report generation. The hours lost add up fast — and the cost in errors
        and missed opportunities adds up even faster.
      </p>
      <h2>How custom software eliminates manual work</h2>
      <p>
        Custom software does not just digitize your existing processes. Done well, it
        redesigns them. Here are the most common areas where businesses see immediate impact:
      </p>
      <h3>1. Automatic data capture</h3>
      <p>
        When a sale happens in a POS system, inventory is automatically updated, a receipt is
        generated, and the transaction is logged. No manual entry. No re-typing. Data flows
        through the system automatically.
      </p>
      <h3>2. Real-time reporting</h3>
      <p>
        Instead of compiling monthly reports by hand, managers can see real-time dashboards
        showing today's sales, current stock levels, outstanding payments, and staff performance.
        Decision-making becomes faster and more accurate.
      </p>
      <h3>3. Automated notifications and workflows</h3>
      <p>
        Custom software can send automatic alerts when stock falls below a threshold, when an
        invoice is due, or when a customer has not been contacted in 30 days. Tasks that
        previously required a person to remember them happen automatically.
      </p>
      <h3>4. Integration between systems</h3>
      <p>
        When your sales system talks to your accounting system, which talks to your inventory
        system, there is no more re-entering data. Information moves through your business
        without human intervention.
      </p>
      <h2>Real examples from businesses we have built for</h2>
      <p>
        A retail business using our CliqPOS system went from spending two hours per day on
        manual stock reconciliation to zero — the system tracks every item automatically.
        A school using our School Management System eliminated the end-of-term chaos of
        manually compiling report cards across dozens of teachers into a single, automated
        process that takes minutes.
      </p>
      <h2>When is the right time to invest in custom software?</h2>
      <p>
        If your business is spending more than a few hours per week on manual data entry,
        reporting, or reconciliation — that is a signal. If errors from manual processes are
        costing you money or customer trust, that is a signal. If your team is growing but
        processes are not scaling, that is a signal.
      </p>
      <p>
        Custom software is not only for large enterprises. Many of the businesses we work
        with are small and growing — and the ROI from eliminating manual work typically
        shows up within the first few months.
      </p>
      <p>
        If you want to explore what custom software could do for your operations,{" "}
        <Link href="/contact" className="text-blue-600 hover:underline font-medium">
          get in touch with us
        </Link>{" "}
        and we will walk you through it.
      </p>
    </>
  ),

  "why-every-growing-retail-business-needs-a-cloud-pos": (
    <>
      <p>
        If you are running a retail business with a paper register, a spreadsheet for stock,
        and a manual process for end-of-day reconciliation — you are already paying a price
        in time, errors, and missed opportunity. A cloud POS system changes all of that.
      </p>
      <p>
        This is not about technology for its own sake. It is about giving your business the
        operational foundation it needs to grow, stay profitable, and compete.
      </p>
      <h2>What a cloud POS actually does</h2>
      <p>
        A cloud POS — Point of Sale system hosted in the cloud — is more than a way to
        process sales. It is a business management platform. When a sale is made, the
        transaction is recorded, inventory is updated, a receipt is generated, and the
        data is instantly available for reporting. Everything is synchronized across branches,
        devices, and users in real time.
      </p>
      <h2>Why it matters for retail businesses specifically</h2>
      <h3>Inventory accuracy</h3>
      <p>
        Manual stock tracking is unreliable. Staff count stock at irregular intervals, items
        are misplaced, and theft goes undetected for weeks. A cloud POS tracks every sale
        and every stock movement. You always know exactly what you have, where it is, and
        what needs to be reordered.
      </p>
      <h3>Multi-branch visibility</h3>
      <p>
        For businesses with more than one location, managing branches without a system is a
        nightmare. A cloud POS gives you real-time visibility across all branches from a
        single dashboard — sales, stock levels, staff performance, and more.
      </p>
      <h3>Faster checkout</h3>
      <p>
        Slow checkout loses customers. A cloud POS with barcode scanning dramatically speeds
        up the transaction process, reduces errors, and improves the customer experience at
        the point of sale.
      </p>
      <h3>Business intelligence</h3>
      <p>
        What are your top-selling products? Which day of the week drives the most revenue?
        Which staff member closes the most sales? A cloud POS answers all these questions
        automatically, without anyone compiling a spreadsheet.
      </p>
      <h2>What about connectivity issues?</h2>
      <p>
        This is a common concern for businesses in Ghana and across Africa. Good cloud POS
        systems — including CliqPOS — include offline mode, which means the system continues
        working when internet connectivity drops and synchronizes automatically when it
        returns. Your operations never stop because of network issues.
      </p>
      <h2>Who needs a cloud POS?</h2>
      <p>
        Any retail business that processes more than 20 transactions per day, manages more
        than 100 product SKUs, operates more than one location, or needs reliable daily
        reporting is a strong candidate for a cloud POS system.
      </p>
      <p>
        If that sounds like your business,{" "}
        <Link href="/products/cliqpos" className="text-blue-600 hover:underline font-medium">
          explore CliqPOS
        </Link>{" "}
        — our cloud POS and business management platform used by 500+ businesses across
        Ghana and Nigeria.
      </p>
    </>
  ),

  "how-business-automation-saves-hours-every-week": (
    <>
      <p>
        Business automation is one of the most underutilized tools available to small and
        medium-sized businesses today. Most business owners associate automation with large
        corporations with deep technology budgets. The reality is that some of the most
        impactful automation can be implemented at any scale, often at low cost, and the
        returns in time and money are significant.
      </p>
      <h2>What business automation actually looks like in practice</h2>
      <p>
        Automation is not one thing. It is a category of solutions that replace manual,
        repetitive tasks with systems that handle them automatically. Here are the most common
        examples relevant to African businesses:
      </p>
      <h3>Customer follow-up automation</h3>
      <p>
        Many businesses generate leads that never get followed up simply because there are
        not enough hours in the day. Automated workflows can send a follow-up WhatsApp message
        or email the moment a customer submits a form or makes an inquiry — without anyone
        manually doing it. Conversion rates improve dramatically when follow-up is instant.
      </p>
      <h3>Invoicing and payment reminders</h3>
      <p>
        Sending manual invoices and chasing payments is one of the most time-consuming
        administrative tasks in any service business. Automated invoicing generates and sends
        invoices automatically when a job is completed, and automated reminders follow up
        on unpaid invoices on a schedule — without staff involvement.
      </p>
      <h3>Report generation</h3>
      <p>
        Instead of having a manager or accountant manually compile weekly or monthly reports
        from multiple spreadsheets, automated reporting pulls live data from your systems
        and generates formatted reports on a schedule. Reports arrive in inboxes without
        anyone compiling them.
      </p>
      <h3>Stock reorder alerts</h3>
      <p>
        Automated inventory systems monitor stock levels and trigger reorder alerts — or even
        purchase orders — when stock falls below a defined threshold. Running out of a
        bestselling item becomes a problem of the past.
      </p>
      <h3>Onboarding and communication workflows</h3>
      <p>
        When a new customer or staff member joins, a manual process might take hours of back
        and forth. Automated onboarding workflows trigger welcome emails, send required
        documents, and guide new users through a process automatically.
      </p>
      <h2>How to calculate the return on automation</h2>
      <p>
        A simple way to evaluate automation ROI: count how many hours per week a task
        currently takes, multiply by hourly staff cost, and compare to the cost of automating it.
        In most cases, a task taking 5 hours per week at any reasonable staff cost rate pays
        back the automation investment within three to six months.
      </p>
      <h2>Where to start</h2>
      <p>
        Start with the task your team finds most repetitive and time-consuming. Usually that
        is either customer communication, reporting, or invoicing. Automating one area
        successfully builds confidence to expand further.
      </p>
      <p>
        Want to explore what automation could look like for your business?{" "}
        <Link href="/services/business-automation" className="text-blue-600 hover:underline font-medium">
          Learn about our automation services
        </Link>{" "}
        or{" "}
        <Link href="/contact" className="text-blue-600 hover:underline font-medium">
          get in touch
        </Link>
        .
      </p>
    </>
  ),

  "what-to-consider-before-building-a-saas-product": (
    <>
      <p>
        Building a SaaS product is an appealing path for entrepreneurs and businesses who want
        to create scalable, recurring revenue from software. But the majority of SaaS products
        fail — not because the technology was bad, but because the foundations were not
        right before a single line of code was written.
      </p>
      <p>
        Here is what to seriously consider before you start building.
      </p>
      <h2>1. Do you have a clearly defined problem to solve?</h2>
      <p>
        The most common cause of SaaS failure is building a product that solves a problem
        the market does not actually have — or does not have badly enough to pay to fix.
        Before building, you should be able to clearly articulate: what specific problem does
        this solve, for whom, and why is the current solution inadequate?
      </p>
      <p>
        If the answer involves "people could use this" rather than "there is a real, documented
        pain that people are actively trying to solve," the product has weak foundations.
      </p>
      <h2>2. Have you validated demand before writing code?</h2>
      <p>
        Validation does not require a fully built product. It requires evidence that real
        people want to pay for the solution. Landing pages, early access signups, pre-sales,
        and even conversations with potential users all count as validation. Building an
        expensive product and then trying to find customers is the wrong order of operations.
      </p>
      <h2>3. What is your minimum viable product (MVP)?</h2>
      <p>
        An MVP is the smallest possible version of your product that delivers the core value
        proposition. The goal is to get real users using a real product as quickly as possible
        so you can learn what actually matters. Most founders try to build too much in the
        first version. Ruthlessly cutting scope is one of the most important skills in early
        SaaS development.
      </p>
      <h2>4. How will you acquire customers?</h2>
      <p>
        Distribution is often harder than the product. Before building, you need a credible
        answer to: how will the first 100 customers find this product? Content, partnerships,
        direct outreach, paid acquisition, and community distribution are all viable — but
        you need a specific strategy, not a vague plan to "market it."
      </p>
      <h2>5. What are your unit economics?</h2>
      <p>
        SaaS profitability depends on the relationship between customer acquisition cost
        (CAC) and lifetime value (LTV). You need a rough model of what you will charge,
        how long customers will stay, and what it will cost to acquire each one. Pricing
        is especially important — many founders price too low to be sustainable.
      </p>
      <h2>6. Are you building for a specific market or a broad one?</h2>
      <p>
        Vertical SaaS (built for a specific industry) is often an easier path to early
        traction than horizontal SaaS (built for everyone). When you serve a specific market,
        your messaging is precise, your sales cycles are shorter, and word of mouth within
        the industry accelerates growth.
      </p>
      <h2>7. Do you have the right technical partner?</h2>
      <p>
        The technology decisions made in the first version of a SaaS product have lasting
        consequences. Architecture choices, tech stack selection, and code quality affect
        how fast you can iterate, how well the product scales, and how expensive it will
        be to maintain and grow.
      </p>
      <p>
        If you are not a technical founder, working with a development partner who has
        experience building and operating SaaS products is important. Not just building
        them — operating them.
      </p>
      <p>
        We have built and operated our own SaaS products, which means we bring product
        thinking — not just development skills — to every project.{" "}
        <Link href="/services/saas-development" className="text-blue-600 hover:underline font-medium">
          Learn about our SaaS development service
        </Link>
        .
      </p>
    </>
  ),

  "website-features-every-serious-company-needs-2026": (
    <>
      <p>
        A business website in 2026 is not just an online brochure. It is your primary sales
        channel, your credibility foundation, and often the first — and deciding — impression
        a potential client has of your business. Yet many company websites are slow, outdated,
        hard to navigate, and almost invisible to search engines.
      </p>
      <p>
        Here are the features that separate serious company websites from forgettable ones.
      </p>
      <h2>1. Fast load speed</h2>
      <p>
        Speed is not optional. Research consistently shows that visitors abandon websites
        that take more than 3 seconds to load. A slow website loses visitors before they
        have a chance to become clients. Core Web Vitals — Google's performance scoring
        system — directly affect your search ranking, meaning a slow website also gets
        less visibility.
      </p>
      <h2>2. Mobile-first design</h2>
      <p>
        In Ghana and across Africa, most web traffic arrives from mobile devices. A website
        that looks fine on desktop but breaks on mobile is losing the majority of its
        visitors. Mobile-first design is not just responsive CSS — it is designing the entire
        experience starting from the mobile context.
      </p>
      <h2>3. Clear conversion paths</h2>
      <p>
        Every serious company website should have obvious, frictionless paths to conversion:
        "Book a call," "Get a quote," "Start a project." Visitors should never have to search
        for how to engage with you. CTAs should be prominent, specific, and repeated
        throughout the page.
      </p>
      <h2>4. SEO-ready structure</h2>
      <p>
        Organic search is one of the highest-ROI channels for business development. A
        properly structured website — with semantic HTML, targeted metadata, fast load times,
        and quality content — earns visibility on Google that compounds over time. SEO should
        be built into the architecture from day one, not added as an afterthought.
      </p>
      <h2>5. Social proof and credibility signals</h2>
      <p>
        Testimonials, case studies, client logos, key metrics, and certifications all help
        visitors trust your business. The first question in a visitor's mind is "can I trust
        this company?" Your website needs to answer it clearly and immediately.
      </p>
      <h2>6. Clear messaging about what you do</h2>
      <p>
        Many company websites are vague. Visitors should understand within three seconds
        what the company does, who it serves, and why it is different. Clarity beats
        creativity. A headline that says "Digital transformation for growing businesses in
        Ghana" is more effective than "Innovation. Growth. Excellence."
      </p>
      <h2>7. Contact and booking accessibility</h2>
      <p>
        A contact form, direct email, phone number, and WhatsApp link should all be easily
        accessible. Friction at the contact stage loses clients. Consider adding a calendar
        booking tool so prospects can schedule time without back-and-forth emailing.
      </p>
      <h2>8. Security (HTTPS and beyond)</h2>
      <p>
        HTTPS is a baseline, not a bonus. Beyond that, regular security updates, input
        validation, and protection against common vulnerabilities keep your website and
        your visitors safe. Browsers now flag insecure sites visibly — a security warning
        on your site destroys trust immediately.
      </p>
      <p>
        If your current website is missing several of these, it may be time for a rebuild.{" "}
        <Link href="/services/website-design" className="text-blue-600 hover:underline font-medium">
          See how we build websites
        </Link>{" "}
        for ambitious companies.
      </p>
    </>
  ),

  "erp-vs-spreadsheets-when-to-upgrade": (
    <>
      <p>
        Spreadsheets are where most businesses start. They are flexible, familiar, and free.
        For a business in its early stages, a well-organized spreadsheet is often sufficient.
        But as businesses grow, spreadsheets begin to create the very problems they were
        supposed to solve. At some point, continuing to manage operations in spreadsheets
        is not just inefficient — it becomes a strategic risk.
      </p>
      <h2>What spreadsheets do well</h2>
      <p>
        Spreadsheets are excellent for simple data storage, basic calculations, and ad hoc
        analysis. For a single-person business or a startup with a small number of products
        and customers, a spreadsheet can manage most operational data adequately.
      </p>
      <h2>Where spreadsheets break down</h2>
      <h3>Multiple users</h3>
      <p>
        Spreadsheets are not built for multiple people working on the same data simultaneously.
        Version conflicts, accidental overwrites, and inconsistent data entry quickly make
        the spreadsheet unreliable. When three people are maintaining three different versions
        of the same file, data integrity collapses.
      </p>
      <h3>Complex cross-functional data</h3>
      <p>
        When sales data needs to connect with inventory, which connects to procurement, which
        connects to finance, maintaining those relationships in spreadsheets requires constant
        manual linking and reconciliation. Every process that crosses functional areas becomes
        a headache.
      </p>
      <h3>Real-time visibility</h3>
      <p>
        Spreadsheets are snapshots. By the time someone updates and shares a report, the
        data is already out of date. An ERP system maintains live data across all functions,
        giving managers current information at any moment.
      </p>
      <h3>Audit trails and access control</h3>
      <p>
        Spreadsheets offer minimal protection against unauthorized changes, accidental
        deletions, or fraud. An ERP system logs every transaction, maintains a full audit
        trail, and allows granular access control — different roles see and edit only what
        they are permitted to.
      </p>
      <h2>Signs you have outgrown spreadsheets</h2>
      <ul>
        <li>You have multiple people maintaining the same data in different files</li>
        <li>Reconciling stock or financial data takes hours every week</li>
        <li>You regularly find errors in reports that took time to produce</li>
        <li>You cannot see real-time stock levels, sales, or payments without asking someone</li>
        <li>Staff are spending significant time on data entry that could be automated</li>
        <li>You have more than one branch or location</li>
      </ul>
      <h2>What an ERP does differently</h2>
      <p>
        A well-built ERP integrates sales, inventory, purchasing, finance, HR, and reporting
        into a single system where data flows automatically between functions. Sales reduce
        stock. Procurement increases it. Finance updates automatically. Reports generate
        themselves. Access is controlled by role.
      </p>
      <p>
        The result is that management can see exactly what is happening in the business at
        any moment, without compiling spreadsheets.
      </p>
      <p>
        If your business matches several of the signs above, it may be time to make the
        move.{" "}
        <Link href="/products/erp" className="text-blue-600 hover:underline font-medium">
          See our ERP system
        </Link>{" "}
        or{" "}
        <Link href="/contact" className="text-blue-600 hover:underline font-medium">
          talk to us about your operations
        </Link>
        .
      </p>
    </>
  ),
};

export async function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: BlogSlugParams): Promise<Metadata> {
  const { slug } = await params;
  const post = BLOG_POSTS.find((p) => p.slug === slug);
  if (!post) return {};
  return {
    title: `${post.title} | RaveSoft Blog`,
    description: post.excerpt,
  };
}

export default async function BlogPostPage({ params }: BlogSlugParams) {
  const { slug } = await params;
  const post = BLOG_POSTS.find((p) => p.slug === slug);
  if (!post) notFound();

  const content = BLOG_CONTENT[slug];
  const related = BLOG_POSTS.filter((p) => p.slug !== slug).slice(0, 3);

  return (
    <>
      {/* HERO */}
      <section className="bg-[#050816] pt-32 pb-16 lg:pt-40">
        <div className="max-w-4xl mx-auto px-5 sm:px-8 lg:px-10">
          <Link href="/blog" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-300 transition-colors mb-8">
            ← Back to Blog
          </Link>
          <div className="flex flex-wrap items-center gap-3 mb-5">
            <span className="px-3 py-1 rounded-full bg-blue-500/12 border border-blue-500/25 text-blue-400 text-xs font-semibold">
              {post.category}
            </span>
            <span className="flex items-center gap-1 text-gray-500 text-sm">
              <Clock className="w-3.5 h-3.5" />
              {post.readTime}
            </span>
            <span className="flex items-center gap-1 text-gray-500 text-sm">
              <Calendar className="w-3.5 h-3.5" />
              {post.date}
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-[1.08] tracking-tighter mb-5">
            {post.title}
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed mb-6">{post.excerpt}</p>
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <User className="w-4 h-4" />
            <span>{post.author}</span>
          </div>
        </div>
      </section>

      {/* CONTENT */}
      <section className="bg-white py-16 lg:py-20">
        <div className="max-w-4xl mx-auto px-5 sm:px-8 lg:px-10 lg:grid lg:grid-cols-[1fr_280px] lg:gap-16">
          {/* Article */}
          <article className="prose prose-gray prose-lg max-w-none
            prose-headings:font-bold prose-headings:text-gray-900
            prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4
            prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-3
            prose-p:text-gray-600 prose-p:leading-relaxed prose-p:mb-5
            prose-li:text-gray-600 prose-ul:space-y-1
            prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline">
            {content ?? (
              <p>Article content coming soon.</p>
            )}
          </article>

          {/* Sidebar */}
          <aside className="mt-12 lg:mt-0">
            <div className="sticky top-28 space-y-8">
              {/* CTA box */}
              <div className="p-6 rounded-2xl bg-[#060297] text-white">
                <h3 className="font-bold text-lg mb-2">Ready to get started?</h3>
                <p className="text-blue-200 text-sm mb-4 leading-relaxed">
                  Talk to our team about how we can help your business.
                </p>
                <Link
                  href="/contact"
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#FFB200] hover:bg-yellow-400 text-[#050816] text-sm font-bold transition-all"
                >
                  Book a Consultation
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* Related posts */}
              <div>
                <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wider mb-4">
                  Related Articles
                </h3>
                <div className="space-y-4">
                  {related.map((r) => (
                    <Link
                      key={r.slug}
                      href={`/blog/${r.slug}`}
                      className="block group"
                    >
                      <span className="text-xs font-semibold text-blue-600 mb-1 block">
                        {r.category}
                      </span>
                      <span className="text-sm text-gray-700 font-medium group-hover:text-blue-600 transition-colors leading-snug block">
                        {r.title}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <CTASection
        headline="Have a project in mind?"
        subheadline="Let's talk about your business goals and how we can help you build the right solution."
        primaryCTA={{ label: "Start a Project", href: "/contact" }}
        secondaryCTA={{ label: "View Our Work", href: "/case-studies" }}
      />
    </>
  );
}
