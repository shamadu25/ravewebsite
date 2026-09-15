<?php

namespace Database\Seeders;

use App\Models\KnowledgeDocument;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class KnowledgeDocumentSeeder extends Seeder
{
    /**
     * Seeds the knowledge base from real RaveSoft site content
     * (src/lib/data.ts in the Next.js site) so the AI agent never
     * has to fabricate services, products, or FAQ answers (spec §33/§98).
     */
    public function run(): void
    {
        foreach ($this->company() as $document) {
            $this->upsert('company', $document['title'], $document['content']);
        }

        foreach ($this->services() as $document) {
            $this->upsert('services', $document['title'], $document['content']);
        }

        foreach ($this->products() as $document) {
            $this->upsert($document['category'], $document['title'], $document['content']);
        }

        foreach ($this->faqs() as $document) {
            $this->upsert('faq', $document['title'], $document['content']);
        }
    }

    private function upsert(string $category, string $title, string $content): void
    {
        KnowledgeDocument::query()->updateOrCreate(
            ['slug' => Str::slug($title)],
            [
                'title' => $title,
                'category' => $category,
                'content' => $content,
                'source' => 'src/lib/data.ts',
                'status' => 'published',
                'approved_by' => 'system',
            ]
        );
    }

    /**
     * @return array<int, array{title: string, content: string}>
     */
    private function company(): array
    {
        return [
            [
                'title' => 'About RaveSoft Digital Solutions Ltd',
                'content' => 'RaveSoft Digital Solutions Ltd builds custom software, SaaS platforms, POS & ERP systems, '
                    .'mobile apps, AI automation, and premium websites for businesses across Ghana, Nigeria, Kenya, '
                    .'South Africa, Ivory Coast, Senegal, Tanzania, Uganda, Ethiopia, Rwanda, Cameroon, and all 54 '
                    .'African countries. Based in Accra, Ghana. Contact: info@ravesoftsolutions.com, phone '
                    .'0503319610 (Ghana) / +1 (406) 518-6775 (US), WhatsApp +233503319610. '
                    .'500+ businesses run on systems RaveSoft has built, across 20+ industries and 40+ African countries.',
            ],
        ];
    }

    /**
     * @return array<int, array{title: string, content: string}>
     */
    private function services(): array
    {
        return [
            [
                'title' => 'Custom Software Development',
                'content' => 'ERP, CRM, dashboards, inventory systems, reporting tools, portals, booking systems, '
                    .'and workflow platforms built around a business\'s exact operations. Full ownership, no '
                    .'recurring licence fees, ongoing support and improvements. Use cases: retail inventory and '
                    .'sales systems, hospital patient management, logistics fleet/delivery management, school '
                    .'admissions and fees portals.',
            ],
            [
                'title' => 'SaaS Product Development',
                'content' => 'MVPs, subscription platforms, admin dashboards, multi-tenant apps, billing systems '
                    .'(Stripe or Paystack), onboarding flows, and scalable SaaS products for founders and companies. '
                    .'Use cases: launching a B2B SaaS for African SMEs, productizing an internal tool, building an '
                    .'MVP to validate with investors.',
            ],
            [
                'title' => 'Website Design & Development',
                'content' => 'Premium corporate websites, NGO websites, e-commerce stores, landing pages, and '
                    .'business websites — mobile-first, fast-loading, SEO-optimised, and designed to convert '
                    .'visitors into leads. Includes corporate sites, NGO/nonprofit sites, e-commerce, portfolio '
                    .'sites, and CMS-powered websites.',
            ],
            [
                'title' => 'Mobile App Development',
                'content' => 'Native Android and iOS apps (React Native, single codebase) for customer portals, '
                    .'staff operations, delivery workflows, bookings, and mobile-first business systems, with '
                    .'App Store/Play Store deployment support.',
            ],
            [
                'title' => 'Business Automation & AI',
                'content' => 'WhatsApp automation, CRM automation and lead management, email/SMS automation, '
                    .'automated report generation, AI customer support assistants, invoice/payment reminder '
                    .'automation, internal workflow and approval automation, and data integration between systems. '
                    .'Helps eliminate repetitive manual tasks and save staff time every week.',
            ],
            [
                'title' => 'POS & ERP Solutions',
                'content' => 'Retail and wholesale POS, restaurant/food service POS, hotel management systems, '
                    .'school management systems, hospital management systems, custom ERP platforms, inventory '
                    .'management, HR/payroll, and accounting/financial reporting — giving real-time visibility '
                    .'across branches and departments.',
            ],
        ];
    }

    /**
     * @return array<int, array{category: string, title: string, content: string}>
     */
    private function products(): array
    {
        return [
            [
                'category' => 'cliqpos',
                'title' => 'CliqPOS — Cloud POS and Business Management System',
                'content' => 'Cloud POS and business management system for retail, wholesale, restaurants, '
                    .'supermarkets, pharmacies, and multi-branch businesses. Features: sales tracking and receipts, '
                    .'inventory management, receipt printing and barcode support, multi-branch access and control, '
                    .'daily and monthly reports, customer and supplier management, staff accounts and permissions. '
                    .'Used across retail, wholesale, restaurants, supermarkets, and pharmacies. RaveSoft\'s most '
                    .'popular product — 500+ businesses across Ghana and Nigeria use CliqPOS.',
            ],
            [
                'category' => 'erp',
                'title' => 'ERP System — Business Operations Platform',
                'content' => 'Custom ERP systems for businesses that need sales, inventory, HR, accounting, '
                    .'procurement, customers, suppliers, and reporting in one place. Used by manufacturing, '
                    .'distribution, services, and trading businesses.',
            ],
            [
                'category' => 'hospital',
                'title' => 'Hospital Management System',
                'content' => 'Patient records, billing, appointments, pharmacy, lab, staff management, and '
                    .'reporting for hospitals and clinics. Features: patient registration/records, appointment '
                    .'scheduling, billing and payments, pharmacy management, lab results management, staff/doctor '
                    .'profiles.',
            ],
            [
                'category' => 'school',
                'title' => 'School Management System',
                'content' => 'Admissions, fees, attendance, results, parent communication, staff management, and '
                    .'administration for schools and colleges. Features: student admissions/profiles, fee '
                    .'collection and receipts, attendance tracking, results and report cards, parent communication '
                    .'portal, staff/subject management.',
            ],
            [
                'category' => 'hotel',
                'title' => 'Hotel Management System',
                'content' => 'Bookings, rooms, guests, billing, housekeeping, reports, and staff operations for '
                    .'hotels and hospitality businesses. Features: room booking and availability, guest check-in/'
                    .'check-out, billing and invoicing, housekeeping management, staff/operations control, revenue '
                    .'and occupancy reports. Used by hotels, guest houses, resorts, and lodges.',
            ],
        ];
    }

    /**
     * @return array<int, array{title: string, content: string}>
     */
    private function faqs(): array
    {
        return [
            [
                'title' => 'FAQ: How much does a project cost',
                'content' => 'Every project is scoped to the client\'s goals, features, and complexity. A free '
                    .'consultation leads to a clear, fixed quote within 24 hours — no pressure, no obligation. '
                    .'RaveSoft does not quote a specific price without a scoped consultation.',
            ],
            [
                'title' => 'FAQ: How long does it take to deliver a project',
                'content' => 'A standard website takes 1–3 weeks. A custom software system typically takes 4–12 '
                    .'weeks depending on complexity. Off-the-shelf products (CliqPOS, Hotel System, etc.) can be '
                    .'set up and live within 1–5 business days. A clear timeline is provided before every project '
                    .'starts.',
            ],
            [
                'title' => 'FAQ: Support after project delivery',
                'content' => 'All projects come with a post-launch support period. Ongoing monthly maintenance and '
                    .'support packages are also available. The team is reachable by WhatsApp, email, and phone.',
            ],
            [
                'title' => 'FAQ: Integrating with existing systems or data',
                'content' => 'RaveSoft regularly integrates with existing databases, ERPs, payment gateways, '
                    .'accounting tools, and third-party APIs, and can migrate existing data (e.g. spreadsheets or '
                    .'an old system) into a new platform.',
            ],
            [
                'title' => 'FAQ: Do you work with businesses outside Ghana',
                'content' => 'Yes — RaveSoft serves businesses across all 54 African countries and internationally, '
                    .'including clients in Nigeria, Kenya, South Africa, Ivory Coast, the UK, and the US. All '
                    .'project communication, meetings, and support happen remotely.',
            ],
            [
                'title' => 'FAQ: Who owns the code after delivery',
                'content' => 'The client does. For custom-built projects, full source code and intellectual '
                    .'property is transferred to the client on final delivery — no ongoing licence fees for their '
                    .'own software.',
            ],
            [
                'title' => 'FAQ: Not sure exactly what is needed',
                'content' => 'A free consultation call helps define the right solution based on the business, team '
                    .'size, budget, and goals — no obligation, no pressure.',
            ],
            [
                'title' => 'FAQ: Do you build mobile apps',
                'content' => 'Yes — iOS and Android apps using React Native (single codebase for both platforms), '
                    .'including customer apps, staff apps, delivery tracking apps, and companion apps for RaveSoft '
                    .'software products.',
            ],
        ];
    }
}
