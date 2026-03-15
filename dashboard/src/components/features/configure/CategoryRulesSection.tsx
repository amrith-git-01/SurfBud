import { useMemo } from 'react';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  closestCorners,
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { useCategories } from '@/api/useDownloads';
import type { CategoryRule, CategoryStat, FileCategory, DownloadRuleValue } from '@/api/downloads.api';
import { FileIcon } from '@/components/ui/FileIcon';

interface CategoryRulesSectionProps {
  categoryRules: CategoryRule[];
  isLoading?: boolean;
  isDisabled?: boolean;
  onCategoryRulesChange: (next: CategoryRule[]) => void;
}

type BucketId = 'track_keep' | 'track_remove' | 'dont_track';

interface BucketConfig {
  id: BucketId;
  title: string;
  description: string;
  mappedRule: DownloadRuleValue;
}

interface CategoryCardData {
  category: FileCategory;
  label: string;
  stats: CategoryStat | null;
}

const BUCKETS: BucketConfig[] = [
  {
    id: 'track_keep',
    title: 'Track and Don\'t Remove',
    description: 'Track duplicates for this category, but never auto-remove them.',
    mappedRule: 'track_keep',
  },
  {
    id: 'track_remove',
    title: 'Track and Remove',
    description: 'Track files and apply the global auto-remove behavior.',
    mappedRule: 'track_remove',
  },
  {
    id: 'dont_track',
    title: 'Dont Track',
    description: 'Downloads from this category are ignored.',
    mappedRule: 'dont_track',
  },
];

const CATEGORY_META: Array<{ category: FileCategory; label: string }> = [
  { category: 'document', label: 'Document' },
  { category: 'video', label: 'Video' },
  { category: 'audio', label: 'Audio' },
  { category: 'archive', label: 'Archive' },
  { category: 'code', label: 'Code' },
  { category: 'image', label: 'Image' },
  { category: 'text', label: 'Text' },
  { category: 'executable', label: 'Executable' },
  { category: 'other', label: 'Other' },
];

function createDraftCategoryRuleId(): string {
  return `draft-cat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function toBucketByRule(rule: DownloadRuleValue | null): BucketId {
  // Default: track but never auto-remove (the "Track and Don't Remove" bucket)
  if (rule === 'track_keep') return 'track_keep';
  if (rule === 'track_remove') return 'track_remove';
  if (rule === 'dont_track') return 'dont_track';
  return 'track_keep';
}

function toRuleByBucket(bucketId: BucketId): DownloadRuleValue {
  return BUCKETS.find((bucket) => bucket.id === bucketId)?.mappedRule ?? 'track_remove';
}

const collisionDetection: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args);

  if (pointerCollisions.length > 0) {
    return pointerCollisions;
  }

  const cornerCollisions = closestCorners(args);

  if (cornerCollisions.length > 0) {
    return cornerCollisions;
  }

  return rectIntersection(args);
};

function CategoryCard({ item, isDragging }: { item: CategoryCardData; isDragging?: boolean }) {
  return (
    <div
      className={[
        'rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] px-2.5 py-2 transition-all duration-200',
        isDragging ? 'shadow-md scale-[1.01]' : 'hover:border-[var(--color-primary)]',
      ].join(' ')}
    >
      <div className="flex items-center gap-2">
        <FileIcon category={item.category} size="sm" />
        <p className="text-xs font-semibold text-[var(--color-text-heading)]">{item.label}</p>
      </div>
    </div>
  );
}

function DraggableCategoryCard({ item }: { item: CategoryCardData }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: item.category,
    data: { category: item.category },
  });

  return (
    <div
      ref={setNodeRef}
      className={[
        'cursor-grab active:cursor-grabbing',
        isDragging ? 'opacity-30' : '',
      ].join(' ')}
      {...listeners}
      {...attributes}
    >
      <CategoryCard item={item} />
    </div>
  );
}

function Bucket({
  bucket,
  items,
}: {
  bucket: BucketConfig;
  items: CategoryCardData[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: bucket.id });

  return (
    <div
      ref={setNodeRef}
      className={[
        'flex flex-col rounded-xl border p-2.5 min-h-[190px] transition-colors duration-200',
        isOver ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)]/40' : 'border-[var(--color-border)]',
      ].join(' ')}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-heading)]">
        {bucket.title}
      </p>
      <p className="mt-1 text-[11px] text-[var(--color-text-muted)]">{bucket.description}</p>

      <div className="mt-2.5 flex flex-1 flex-col">
        {items.length === 0 ? (
          <div className="flex flex-1 items-center justify-center">
            <p className="text-[11px] text-[var(--color-text-muted)]">Drop categories here</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 content-start">
            {items.map((item) => (
              <DraggableCategoryCard key={item.category} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function CategoryRulesSection({
  categoryRules,
  isLoading = false,
  isDisabled = false,
  onCategoryRulesChange,
}: CategoryRulesSectionProps) {
  const { data: categories = [], isLoading: isCategoriesLoading } = useCategories();
  const [activeCategory, setActiveCategory] = useState<FileCategory | null>(null);

  const statsByCategory = useMemo(() => {
    const map = new Map<FileCategory, CategoryStat>();
    for (const category of categories) {
      map.set(category.category as FileCategory, category);
    }
    return map;
  }, [categories]);

  const allCards = useMemo<CategoryCardData[]>(
    () =>
      CATEGORY_META.map((meta) => ({
        ...meta,
        stats: statsByCategory.get(meta.category) ?? null,
      })),
    [statsByCategory],
  );

  const bucketByCategory = useMemo(() => {
    const map = new Map<FileCategory, BucketId>();
    for (const meta of CATEGORY_META) {
      const rule = categoryRules.find((item) => item.category === meta.category);
      map.set(meta.category, toBucketByRule(rule?.rule ?? null));
    }
    return map;
  }, [categoryRules]);

  const bucketsWithItems = useMemo(() => {
    return BUCKETS.map((bucket) => ({
      bucket,
      items: allCards.filter((item) => bucketByCategory.get(item.category) === bucket.id),
    }));
  }, [allCards, bucketByCategory]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const moveCategoryToBucket = (category: FileCategory, bucketId: BucketId) => {
    const targetRule = toRuleByBucket(bucketId);
    const existing = categoryRules.find((rule) => rule.category === category);

    // Default bucket is "Track and Don't Remove" (rule: track_keep).
    // We don't store a rule for that case (it is the implicit default).
    if (targetRule === 'track_keep') {
      if (!existing) return;
      onCategoryRulesChange(categoryRules.filter((rule) => rule.category !== category));
      return;
    }

    if (existing) {
      if (existing.rule === targetRule) return;
      onCategoryRulesChange(
        categoryRules.map((rule) =>
          rule.category === category ? { ...rule, rule: targetRule } : rule,
        ),
      );
      return;
    }

    onCategoryRulesChange([
      ...categoryRules,
      {
        _id: createDraftCategoryRuleId(),
        category,
        rule: targetRule,
      },
    ]);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    try {
      if (isDisabled) return;

      const category = event.active.id as FileCategory;
      const overId = event.over?.id as BucketId | undefined;
      if (!category || !overId) return;

      moveCategoryToBucket(category, overId);
    } finally {
      setActiveCategory(null);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveCategory(event.active.id as FileCategory);
  };

  const activeCard =
    activeCategory
      ? allCards.find((card) => card.category === activeCategory) ?? null
      : null;

  const handleDragCancel = () => {
    setActiveCategory(null);
  };

  if (isLoading) {
    return (
      <section>
        <p className="section-label">FILE CATEGORY RULES</p>
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          Drag categories between buckets to define tracking behavior.
        </p>
        <div className="card-metric-glass p-4 mt-3">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {[0, 1, 2].map((key) => (
              <div key={key} className="rounded-xl border border-[var(--color-border)] p-2.5 min-h-[190px]">
                <div className="skeleton h-4 w-28 rounded" />
                <div className="skeleton h-3 w-40 rounded mt-2" />
                <div className="skeleton h-12 w-full rounded mt-3" />
                <div className="skeleton h-12 w-full rounded mt-2" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section>
      <p className="section-label">FILE CATEGORY RULES</p>
      <p className="mt-1 text-xs text-[var(--color-text-muted)]">
        Drag categories between buckets to define tracking behavior.
      </p>

      <div className={['card-metric-glass p-4 mt-3', isDisabled ? 'pointer-events-none opacity-60' : ''].join(' ')}>

        {isCategoriesLoading ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {[0, 1, 2].map((key) => (
              <div key={key} className="rounded-xl border border-[var(--color-border)] p-2.5 min-h-[190px]">
                <div className="skeleton h-4 w-28 rounded" />
                <div className="skeleton h-3 w-40 rounded mt-2" />
                <div className="skeleton h-12 w-full rounded mt-3" />
                <div className="skeleton h-12 w-full rounded mt-2" />
              </div>
            ))}
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={collisionDetection}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {bucketsWithItems.map(({ bucket, items }) => (
                <Bucket key={bucket.id} bucket={bucket} items={items} />
              ))}
            </div>

            {createPortal(
              <DragOverlay zIndex={1300}>
                {activeCard ? <CategoryCard item={activeCard} isDragging /> : null}
              </DragOverlay>,
              document.body,
            )}
          </DndContext>
        )}
      </div>
    </section>
  );
}
