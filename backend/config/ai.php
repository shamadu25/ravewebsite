<?php

return [

    'enabled' => (bool) env('AI_AGENT_ENABLED', true),

    'default_provider' => env('AI_LLM_PROVIDER', 'openai'),

    'openai' => [
        'api_key' => env('OPENAI_API_KEY'),
        'model' => env('OPENAI_MODEL', 'gpt-4o-mini'),
        'base_url' => env('OPENAI_BASE_URL', 'https://api.openai.com/v1'),
        'timeout' => (int) env('OPENAI_TIMEOUT', 20),
    ],

    'assistant_name' => env('AI_ASSISTANT_NAME', 'Rave AI'),

    /*
    |--------------------------------------------------------------------------
    | Lead scoring weights (spec §12)
    |--------------------------------------------------------------------------
    */
    'lead_scoring' => [
        'decision_maker' => 15,
        'clear_problem' => 15,
        'high_business_impact' => 15,
        'implementation_under_30_days' => 15,
        'pricing_interest' => 10,
        'demo_interest' => 10,
        'meaningful_lead_volume' => 10,
        'contact_details_complete' => 5,
        'returning_high_intent_visitor' => 5,
    ],

    'lead_score_levels' => [
        'low' => [0, 30],
        'nurture' => [31, 50],
        'qualified' => [51, 70],
        'sales_qualified' => [71, 85],
        'hot' => [86, 100],
    ],

    /*
    |--------------------------------------------------------------------------
    | Quick action buttons shown on first chat open (spec §6)
    |--------------------------------------------------------------------------
    */
    'quick_actions' => [
        ['label' => 'Get More Sales', 'message' => 'I want to get more sales for my business.'],
        ['label' => 'Automate WhatsApp', 'message' => 'I want to automate WhatsApp inquiries.'],
        ['label' => 'Get an AI Employee', 'message' => 'I want an AI employee for my business.'],
        ['label' => 'Automate Customer Service', 'message' => 'I want to automate customer service.'],
        ['label' => 'Build Custom Software', 'message' => 'I need custom software built.'],
        ['label' => 'CliqPOS', 'message' => 'Tell me about CliqPOS.'],
        ['label' => 'Hotel Software', 'message' => 'Tell me about your hotel management software.'],
        ['label' => 'Talk to RaveSoft', 'message' => 'I would like to speak to someone at RaveSoft.'],
        ['label' => 'I Need Support', 'message' => 'I am an existing customer and need support.'],
    ],
];
