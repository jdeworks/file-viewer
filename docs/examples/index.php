<?php

declare(strict_types=1);

function render_status(array $services): string {
    $ok = array_filter($services, fn ($service) => $service['ok']);
    return sprintf('%d/%d services healthy', count($ok), count($services));
}

echo render_status([
    ['name' => 'api', 'ok' => true],
    ['name' => 'worker', 'ok' => false],
]);
