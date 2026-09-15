<?php

namespace Database\Factories;

use App\Models\AgentAction;
use App\Models\AgentRun;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AgentAction>
 */
class AgentActionFactory extends Factory
{
    public function definition(): array
    {
        return [
            'agent_run_id' => AgentRun::factory(),
            'action_type' => 'decision',
            'payload' => ['recommended_next_action' => 'ask_daily_inquiry_volume'],
        ];
    }
}
