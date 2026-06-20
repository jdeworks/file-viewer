<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\User;
use App\Models\Post;
use App\Contracts\RepositoryInterface;
use App\Exceptions\NotFoundException;
use App\Exceptions\ValidationException;
use Psr\Log\LoggerInterface;
use function App\Helpers\format_date;
use const App\Config\MAX_ITEMS_PER_PAGE;

require_once __DIR__ . '/../bootstrap.php';

/**
 * ContentService handles business logic for content management.
 */
class ContentService implements RepositoryInterface
{
    private LoggerInterface $logger;
    private array $cache = [];
    private static int $instanceCount = 0;

    const MAX_TITLE_LENGTH = 255;
    const CACHE_TTL = 3600;
    const DEFAULT_PER_PAGE = 20;

    public function __construct(LoggerInterface $logger)
    {
        $this->logger = $logger;
        self::$instanceCount++;
    }

    public function findById(int $id): Post
    {
        if (isset($this->cache[$id])) {
            return $this->cache[$id];
        }

        $post = Post::find($id);
        if ($post === null) {
            throw new NotFoundException("Post with ID {$id} not found");
        }

        $this->cache[$id] = $post;
        return $post;
    }

    public function findAll(int $page = 1, int $perPage = self::DEFAULT_PER_PAGE): array
    {
        $offset = ($page - 1) * $perPage;
        return Post::all(limit: $perPage, offset: $offset);
    }

    public function create(array $data): Post
    {
        $this->validateData($data);
        $post = new Post($data);
        $post->save();
        $this->logger->info('Post created', ['id' => $post->id]);
        return $post;
    }

    public function update(int $id, array $data): Post
    {
        $post = $this->findById($id);
        $this->validateData($data);
        $post->fill($data);
        $post->save();
        unset($this->cache[$id]);
        return $post;
    }

    public function delete(int $id): bool
    {
        $post = $this->findById($id);
        $result = $post->delete();
        unset($this->cache[$id]);
        $this->logger->info('Post deleted', ['id' => $id]);
        return $result;
    }

    protected function validateData(array $data): void
    {
        if (empty($data['title'])) {
            throw new ValidationException('Title is required');
        }
        if (strlen($data['title']) > self::MAX_TITLE_LENGTH) {
            throw new ValidationException('Title exceeds maximum length');
        }
    }

    private function clearCache(): void
    {
        $this->cache = [];
    }

    public static function getInstanceCount(): int
    {
        return self::$instanceCount;
    }
}

interface Publishable
{
    public function publish(): bool;
    public function unpublish(): bool;
    public function isPublished(): bool;
}

trait Timestamps
{
    private ?\DateTimeImmutable $createdAt = null;
    private ?\DateTimeImmutable $updatedAt = null;

    public function getCreatedAt(): ?\DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function touch(): void
    {
        $this->updatedAt = new \DateTimeImmutable();
    }
}

enum Status: string
{
    case Draft = 'draft';
    case Published = 'published';
    case Archived = 'archived';

    public function label(): string
    {
        return match($this) {
            Status::Draft => 'Draft',
            Status::Published => 'Published',
            Status::Archived => 'Archived',
        };
    }
}

abstract class BaseModel
{
    abstract public function save(): bool;
    abstract public function delete(): bool;

    public function toArray(): array
    {
        return get_object_vars($this);
    }

    public function toJson(): string
    {
        return json_encode($this->toArray(), JSON_THROW_ON_ERROR);
    }
}

function create_content_service(LoggerInterface $logger): ContentService
{
    return new ContentService($logger);
}
