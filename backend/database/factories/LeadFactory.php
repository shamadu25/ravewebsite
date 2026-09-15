<?php

namespace Database\Factories;

use App\Models\Contact;
use App\Models\Lead;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Lead>
 */
class LeadFactory extends Factory
{
    public function definition(): array
    {
        return [
            'contact_id' => Contact::factory(),
            'company_id' => null,
            'conversation_id' => null,
            'source' => 'website_chat',
            'service_interest' => 'whatsapp_automation',
            'stage' => 'new',
            'priority' => null,
            'owner' => null,
        ];
    }
}
