<?php

namespace Database\Factories;

use App\Models\AgentRun;
use App\Models\ToolCall;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ToolCall>
 */
class ToolCallFactory extends Factory
{
    public function definition(): array
    {
        return [
            'agent_run_id' => AgentRun::factory(),
            'tool_name' => 'SearchKnowledgeTool',
            'input' => ['query' => 'cliqpos pricing'],
            'output' => ['results' => []],
            'status' => 'success',
            'error' => null,
            'latency_ms' => fake()->numberBetween(10, 200),
        ];
    }
}
