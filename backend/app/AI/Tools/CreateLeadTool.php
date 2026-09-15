<?php

namespace App\AI\Tools;

use App\Models\Company;
use App\Models\Contact;
use App\Models\Conversation;
use App\Models\ConversionEvent;
use App\Models\Lead;
use InvalidArgumentException;

class CreateLeadTool implements ToolInterface
{
    public function name(): string
    {
        return 'CreateLeadTool';
    }

    /**
     * Creates (or reuses) a contact/company for the conversation and opens a lead.
     * Requires at least an email, phone, or WhatsApp number to avoid junk leads.
     */
    public function execute(array $input): array
    {
        $conversationId = $input['conversation_id'] ?? null;

        if (! $conversationId) {
            throw new InvalidArgumentException('conversation_id is required.');
        }

        $conversation = Conversation::query()->findOrFail($conversationId);

        if (empty($input['email']) && empty($input['phone']) && empty($input['whatsapp'])) {
            throw new InvalidArgumentException('At least one contact channel (email, phone, whatsapp) is required.');
        }

        $company = null;
        if (! empty($input['company'])) {
            $company = Company::query()->firstOrCreate(['name' => $input['company']]);
        }

        $contact = $conversation->contact;

        $contactData = array_filter([
            'company_id' => $company?->id,
            'first_name' => $input['first_name'] ?? null,
            'last_name' => $input['last_name'] ?? null,
            'email' => $input['email'] ?? null,
            'phone' => $input['phone'] ?? null,
            'whatsapp' => $input['whatsapp'] ?? null,
            'country' => $input['country'] ?? null,
        ], fn ($value) => $value !== null);

        if ($contact) {
            $contact->fill($contactData)->save();
        } else {
            $contact = Contact::query()->create($contactData);
            $conversation->update(['contact_id' => $contact->id]);
        }

        $lead = Lead::query()->firstOrCreate(
            ['conversation_id' => $conversation->id],
            [
                'contact_id' => $contact->id,
                'company_id' => $company?->id,
                'source' => 'website_chat',
                'service_interest' => $input['service_interest'] ?? null,
                'stage' => 'new',
            ]
        );

        ConversionEvent::query()->create([
            'contact_id' => $contact->id,
            'lead_id' => $lead->id,
            'conversation_id' => $conversation->id,
            'event_type' => 'lead_created',
            'occurred_at' => now(),
        ]);

        return [
            'lead_id' => $lead->id,
            'contact_id' => $contact->id,
        ];
    }
}
