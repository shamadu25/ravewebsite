<?php

namespace App\AI\Tools;

interface ToolInterface
{
    /**
     * Unique tool name as referenced in agent structured output tool_requests.
     */
    public function name(): string;

    /**
     * Validate input and execute the tool, returning a structured result.
     *
     * @param  array<string, mixed>  $input
     * @return array<string, mixed>
     */
    public function execute(array $input): array;
}
