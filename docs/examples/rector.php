<?php

declare(strict_types=1);

use Rector\Config\RectorConfig;
use Rector\PHP81\Rector\Array_\FirstClassCallableRector;
use Rector\PHP80\Rector\Class_\ClassPropertyAssignToConstructorPromotionRector;
use Rector\PHP80\Rector\FunctionLike\MixedTypeRector;
use Rector\DeadCode\Rector\ClassMethod\RemoveUnusedPrivateMethodRector;
use Rector\DeadCode\Rector\Property\RemoveUnusedPrivatePropertyRector;
use Rector\Set\ValueObject\LevelSetList;

return RectorConfig::configure()
    ->withPaths([
        __DIR__ . '/src',
        __DIR__ . '/tests',
    ])
    ->withPhpSets(php81: true)
    ->withPhpVersion(\Rector\ValueObject\PhpVersion::PHP_81)
    ->withDeadCodeLevel(20)
    ->withTypeCoverageLevel(5)
    ->withRules([
        FirstClassCallableRector::class,
        ClassPropertyAssignToConstructorPromotionRector::class,
        MixedTypeRector::class,
        RemoveUnusedPrivateMethodRector::class,
        RemoveUnusedPrivatePropertyRector::class,
    ])
    ->withSkip([
        RemoveUnusedPrivateMethodRector::class => [
            __DIR__ . '/src/Legacy',
        ],
    ])
    ->withImportNames(importDocBlockNames: false);
