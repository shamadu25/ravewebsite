<?php

namespace Database\Seeders;

use App\Models\Intent;
use Illuminate\Database\Seeder;

class IntentSeeder extends Seeder
{
    /**
     * Seeds the intent catalog from spec §5.
     */
    public function run(): void
    {
        $intents = [
            'ai_agent' => 'AI Agent',
            'ai_employee' => 'AI Employee',
            'whatsapp_automation' => 'WhatsApp Automation',
            'sales_automation' => 'Sales Automation',
            'customer_service_automation' => 'Customer Service Automation',
            'business_process_automation' => 'Business Process Automation',
            'custom_ai_solution' => 'Custom AI Solution',
            'website_development' => 'Website Development',
            'custom_software' => 'Custom Software',
            'saas_development' => 'SaaS Development',
            'cliqpos' => 'CliqPOS',
            'retail_pos' => 'Retail POS',
            'pharmacy_pos' => 'Pharmacy POS',
            'restaurant_pos' => 'Restaurant POS',
            'hotel_management' => 'Hotel Management',
            'erp' => 'ERP',
            'inventory_management' => 'Inventory Management',
            'pricing' => 'Pricing',
            'demo_request' => 'Demo Request',
            'consultation_request' => 'Consultation Request',
            'existing_customer_support' => 'Existing Customer Support',
            'technical_support' => 'Technical Support',
            'billing' => 'Billing',
            'partnership' => 'Partnership',
            'reseller' => 'Reseller',
            'careers' => 'Careers',
            'general_enquiry' => 'General Enquiry',
            'spam' => 'Spam',
            'unknown' => 'Unknown',
        ];

        foreach ($intents as $key => $label) {
            Intent::query()->firstOrCreate(['key' => $key], ['label' => $label]);
        }
    }
}
