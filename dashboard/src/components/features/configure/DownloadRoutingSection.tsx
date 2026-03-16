import { useEffect, useMemo, useState } from 'react';
import { Check, Folder, FolderPlus, Pencil, Trash2, X } from 'lucide-react';
import ReactFlow, {
  Background,
  BaseEdge,
  Controls,
  EdgeLabelRenderer,
  Handle,
  Position,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  getSmoothStepPath,
  type Connection,
  type Edge,
  type EdgeProps,
  type Node,
  type NodeProps,
  type ProOptions,
} from 'reactflow';
import 'reactflow/dist/style.css';
import type { FileCategory, RoutingFolder } from '@/api/downloads.api';
import { FileIcon } from '@/components/ui/FileIcon';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { OnOffToggle } from './OnOffToggle';
import './DownloadRoutingSection.css';

interface DownloadRoutingSectionProps {
  routingEnabled: boolean;
  routingFolders: RoutingFolder[];
  isLoading?: boolean;
  isDisabled?: boolean;
  onRoutingEnabledChange: (next: boolean) => void;
  onRoutingFoldersChange: (next: RoutingFolder[]) => void;
}

interface CategoryNodeData {
  category: FileCategory;
  label: string;
  isInteractive: boolean;
}

interface FolderNodeData {
  folder: RoutingFolder;
  connectedLabel: string | null;
  isInteractive: boolean;
  isEditing: boolean;
  isDeleteConfirming: boolean;
  draftName: string;
  onEditStart: (folderId: string, folderName: string) => void;
  onDraftNameChange: (value: string) => void;
  onEditCommit: (folderId: string) => void;
  onEditCancel: () => void;
  onDeleteStart: (folderId: string) => void;
  onDeleteConfirm: (folderId: string) => void;
  onDeleteCancel: () => void;
}

interface RoutingEdgeData {
  folderId: string;
  canDelete: boolean;
  onDisconnect: (folderId: string) => void;
}

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

const CATEGORY_NODE_POSITIONS: Array<{ x: number; y: number }> = [
  { x: -120, y: 36 },
  { x: 130, y: 36 },
  { x: -120, y: 130 },
  { x: 130, y: 130 },
  { x: -120, y: 224 },
  { x: 130, y: 224 },
  { x: -120, y: 318 },
  { x: 130, y: 318 },
  { x: -120, y: 412 },
];

const INVALID_FOLDER_CHARS_REGEX = /[\\/:*?"<>|]/g;
const FLOW_OPTIONS: ProOptions = { hideAttribution: true };

function createDraftRoutingFolderId(): string {
  return `draft-folder-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function sanitizeFolderName(input: string): string {
  return input
    .replace(INVALID_FOLDER_CHARS_REGEX, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function getNextDefaultFolderName(folders: RoutingFolder[]): string {
  const base = 'New Folder';
  const existing = new Set(folders.map((folder) => folder.folderName.toLowerCase()));

  if (!existing.has(base.toLowerCase())) {
    return base;
  }

  let index = 2;
  while (existing.has(`${base} ${index}`.toLowerCase())) {
    index += 1;
  }

  return `${base} ${index}`;
}

function CategoryNode({ data }: NodeProps<CategoryNodeData>) {
  return (
    <div className={[
      'group flex w-[206px] items-center gap-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2.5 shadow-sm transition-all duration-200',
      data.isInteractive ? 'hover:-translate-y-[1px] hover:border-[var(--color-primary)]' : 'opacity-70',
    ].join(' ')}>
      <div className="rounded-lg bg-[var(--color-primary-light)]/50 p-1">
        <FileIcon category={data.category} size="sm" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-[var(--color-text-heading)]">{data.label}</p>
        <p className="mt-0.5 text-[10px] text-[var(--color-text-muted)]">Default Downloads/ when not connected</p>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        isConnectable={data.isInteractive}
        className="!h-3 !w-3 !border-2 !border-[var(--color-primary)] !bg-[var(--color-bg-card)] transition-transform duration-200 group-hover:!scale-110"
      />
    </div>
  );
}

function FolderNode({ data }: NodeProps<FolderNodeData>) {
  const isInteractive = data.isInteractive;

  return (
    <div className={[
      'w-[220px] rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2.5 shadow-sm transition-all duration-200',
      isInteractive ? 'hover:-translate-y-[1px] hover:shadow-md' : 'opacity-70',
    ].join(' ')}>
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={isInteractive}
        className="!h-3 !w-3 !border-2 !border-[var(--color-primary)] !bg-[var(--color-bg-card)]"
      />

      {data.isDeleteConfirming ? (
        <div>
          <p className="text-sm font-semibold text-[var(--color-text-heading)]">
            Delete &quot;{data.folder.folderName}&quot;?
          </p>
          <p className="mt-1 text-[11px] text-[var(--color-text-muted)]">
            Connected category will be disconnected.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                data.onDeleteConfirm(data.folder._id);
              }}
              className="inline-flex h-7 items-center justify-center rounded-lg border border-[var(--color-danger)] px-3 text-xs font-medium text-[var(--color-danger)] hover:bg-red-50"
            >
              Delete
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                data.onDeleteCancel();
              }}
              className="inline-flex h-7 items-center justify-center rounded-lg border border-[var(--color-border)] px-3 text-xs font-medium text-[var(--color-text-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : data.isEditing ? (
        <div>
          <div className="flex items-center gap-2">
            <Folder className="h-4 w-4 text-[var(--color-primary)]" />
            <input
              value={data.draftName}
              autoFocus
              onChange={(event) => data.onDraftNameChange(event.target.value)}
              onClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  data.onEditCommit(data.folder._id);
                }
                if (event.key === 'Escape') {
                  event.preventDefault();
                  data.onEditCancel();
                }
              }}
              className="h-8 flex-1 rounded-lg border border-[var(--color-primary)] bg-white px-2.5 text-sm text-[var(--color-text-heading)] outline-none"
            />
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                data.onEditCommit(data.folder._id);
              }}
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary-light)]"
              aria-label="Save folder name"
            >
              <Check className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                data.onEditCancel();
              }}
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
              aria-label="Cancel rename"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Folder className="h-4 w-4 text-[var(--color-primary)]" />
                <p className="truncate text-[13px] font-semibold text-[var(--color-text-heading)]">
                  {data.folder.folderName}
                </p>
              </div>
              <p className="mt-1.5 text-[10px] text-[var(--color-text-muted)]">
                {data.connectedLabel ? `Connected: ${data.connectedLabel}` : 'Unrouted'}
              </p>
              <p className="mt-1 text-[10px] font-medium text-[var(--color-primary)]">
                Downloads/{data.folder.folderName}/
              </p>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={!isInteractive}
                onClick={(event) => {
                  event.stopPropagation();
                  data.onEditStart(data.folder._id, data.folder.folderName);
                }}
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--color-border)] text-[var(--color-primary)] hover:bg-[var(--color-primary-light)] disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Rename folder"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                disabled={!isInteractive}
                onClick={(event) => {
                  event.stopPropagation();
                  data.onDeleteStart(data.folder._id);
                }}
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--color-border)] text-[var(--color-danger)] hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Delete folder"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RoutingEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}: EdgeProps<RoutingEdgeData>) {
  const [path, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 18,
  });

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        style={{ stroke: 'var(--color-primary)', strokeWidth: 2 }}
      />
      {data?.canDelete ? (
        <EdgeLabelRenderer>
          <button
            type="button"
            onClick={() => data.onDisconnect(data.folderId)}
            className="nodrag nopan inline-flex h-6 w-6 items-center justify-center rounded-full border border-[var(--color-primary)] bg-white text-[var(--color-primary)] shadow-sm hover:bg-[var(--color-primary-light)]"
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'all',
            }}
            aria-label="Disconnect route"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}

export function DownloadRoutingSection({
  routingEnabled,
  routingFolders,
  isLoading = false,
  isDisabled = false,
  onRoutingEnabledChange,
  onRoutingFoldersChange,
}: DownloadRoutingSectionProps) {
  const [newFolderName, setNewFolderName] = useState('');
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState('');
  const [deleteConfirmFolderId, setDeleteConfirmFolderId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flowNodes, setFlowNodes, onFlowNodesChange] = useNodesState<CategoryNodeData | FolderNodeData>([]);
  const [flowEdges, setFlowEdges, onFlowEdgesChange] = useEdgesState<RoutingEdgeData>([]);
  const nodeTypes = useMemo(() => ({
    categoryNode: CategoryNode,
    folderNode: FolderNode,
  }), []);
  const edgeTypes = useMemo(() => ({
    routingEdge: RoutingEdge,
  }), []);

  const isInteractive = routingEnabled && !isDisabled;
  const isAtLimit = routingFolders.length >= 10;

  const connectedLabelByFolderId = useMemo(() => {
    const map = new Map<string, string>();

    for (const folder of routingFolders) {
      if (!folder.category) continue;
      const label = CATEGORY_META.find((item) => item.category === folder.category)?.label;
      if (label) {
        map.set(folder._id, label);
      }
    }

    return map;
  }, [routingFolders]);

  const computedNodes = useMemo<Array<Node<CategoryNodeData | FolderNodeData>>>(() => {
    const categoryNodes: Array<Node<CategoryNodeData>> = CATEGORY_META.map((item, index) => ({
      id: `category:${item.category}`,
      type: 'categoryNode',
      position: CATEGORY_NODE_POSITIONS[index] ?? { x: 32, y: 36 + index * 84 },
      draggable: isInteractive,
      selectable: false,
      data: {
        category: item.category,
        label: item.label,
        isInteractive,
      },
    }));

    const folderNodes: Array<Node<FolderNodeData>> = routingFolders.map((folder, index) => ({
      id: `folder:${folder._id}`,
      type: 'folderNode',
      position: { x: 700, y: 28 + index * 132 },
      draggable: isInteractive,
      selectable: false,
      data: {
        folder,
        connectedLabel: connectedLabelByFolderId.get(folder._id) ?? null,
        isInteractive,
        isEditing: editingFolderId === folder._id,
        isDeleteConfirming: deleteConfirmFolderId === folder._id,
        draftName: editingFolderId === folder._id ? editingFolderName : folder.folderName,
        onEditStart: (folderId: string, folderName: string) => {
          setDeleteConfirmFolderId(null);
          setEditingFolderId(folderId);
          setEditingFolderName(folderName);
          setError(null);
        },
        onDraftNameChange: (value: string) => {
          setEditingFolderName(value);
          setError(null);
        },
        onEditCommit: (folderId: string) => {
          const sanitized = sanitizeFolderName(editingFolderName);

          if (!sanitized) {
            setError('Folder name cannot be empty');
            return;
          }

          if (sanitized.length > 50) {
            setError('Folder name must be 50 characters or fewer');
            return;
          }

          onRoutingFoldersChange(
            routingFolders.map((item) =>
              item._id === folderId ? { ...item, folderName: sanitized } : item,
            ),
          );
          setEditingFolderId(null);
          setEditingFolderName('');
          setError(null);
        },
        onEditCancel: () => {
          setEditingFolderId(null);
          setEditingFolderName('');
          setError(null);
        },
        onDeleteStart: (folderId: string) => {
          setEditingFolderId(null);
          setDeleteConfirmFolderId(folderId);
          setError(null);
        },
        onDeleteConfirm: (folderId: string) => {
          onRoutingFoldersChange(routingFolders.filter((item) => item._id !== folderId));
          setDeleteConfirmFolderId(null);
          setError(null);
        },
        onDeleteCancel: () => {
          setDeleteConfirmFolderId(null);
        },
      },
    }));

    return [...categoryNodes, ...folderNodes];
  }, [
    connectedLabelByFolderId,
    deleteConfirmFolderId,
    editingFolderId,
    editingFolderName,
    isInteractive,
    onRoutingFoldersChange,
    routingFolders,
  ]);

  const computedEdges = useMemo<Array<Edge<RoutingEdgeData>>>(() => {
    return routingFolders
      .filter((folder) => folder.category)
      .map((folder) => ({
        id: `edge:${folder._id}`,
        source: `category:${folder.category}`,
        target: `folder:${folder._id}`,
        type: 'routingEdge',
        data: {
          folderId: folder._id,
          canDelete: isInteractive,
          onDisconnect: (folderId: string) => {
            onRoutingFoldersChange(
              routingFolders.map((item) =>
                item._id === folderId ? { ...item, category: null } : item,
              ),
            );
          },
        },
      }));
  }, [isInteractive, onRoutingFoldersChange, routingFolders]);

  useEffect(() => {
    setFlowNodes((previous) => {
      const previousById = new Map(previous.map((node) => [node.id, node]));

      return computedNodes.map((node) => {
        const existing = previousById.get(node.id);
        if (!existing) {
          return node;
        }

        return {
          ...node,
          position: existing.position,
        };
      });
    });
  }, [computedNodes, setFlowNodes]);

  useEffect(() => {
    setFlowEdges(computedEdges);
  }, [computedEdges, setFlowEdges]);

  const handleConnect = (connection: Connection) => {
    if (!isInteractive) return;

    const source = connection.source;
    const target = connection.target;

    if (!source?.startsWith('category:') || !target?.startsWith('folder:')) {
      return;
    }

    const category = source.replace('category:', '') as FileCategory;
    const folderId = target.replace('folder:', '');

    onRoutingFoldersChange(
      routingFolders.map((folder) => {
        if (folder._id === folderId) {
          return { ...folder, category };
        }

        if (folder.category === category) {
          return { ...folder, category: null };
        }

        return folder;
      }),
    );
  };

  const handleCreateFolder = (allowDefaultName = false) => {
    const typedName = sanitizeFolderName(newFolderName);
    const sanitized = typedName || (allowDefaultName ? getNextDefaultFolderName(routingFolders) : '');

    if (!sanitized) {
      setError('Folder name cannot be empty');
      return;
    }

    if (sanitized.length > 50) {
      setError('Folder name must be 50 characters or fewer');
      return;
    }

    if (isAtLimit) {
      setError('Maximum 10 folders reached. Delete a folder to create a new one.');
      return;
    }

    onRoutingFoldersChange([
      ...routingFolders,
      {
        _id: createDraftRoutingFolderId(),
        folderName: sanitized,
        category: null,
      },
    ]);

    setNewFolderName('');
    setError(null);
  };

  if (isLoading) {
    return (
      <section>
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-[var(--color-text-heading)]">
            Download routing
          </h3>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            Map file categories to subfolders in your Downloads directory.
          </p>
        </div>
        <div className="card-metric-glass mt-4 p-5">
          <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <div className="skeleton h-4 w-44 rounded" />
              <div className="skeleton mt-2 h-3 w-64 rounded" />
            </div>
            <div className="skeleton h-[24px] w-[44px] rounded-full" />
          </div>
          <div className="skeleton mt-4 h-[420px] w-full rounded-2xl" />
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-[var(--color-text-heading)]">
          Download routing
        </h3>
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          Map file categories to subfolders in your Downloads directory.
        </p>
      </div>

      <div className="card-metric-glass mt-4 p-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="text-sm font-semibold text-[var(--color-text-heading)]">Auto-route Downloads</p>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              Automatically sort files into subfolders inside your Downloads directory.
            </p>
          </div>

          <OnOffToggle
            checked={routingEnabled}
            disabled={isDisabled}
            label="Auto-route downloads"
            onChange={onRoutingEnabledChange}
          />
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <TextField
            label="Folder name"
            showLabel={false}
            value={newFolderName}
            onChange={(value) => {
              setNewFolderName(value);
              if (error) setError(null);
            }}
            onClear={() => {
              setNewFolderName('');
              if (error) setError(null);
            }}
            placeholder="Create a folder, e.g. Media"
            className="h-8 rounded-lg border py-1.5 text-xs"
            containerClassName="!space-y-0"
            autoComplete="off"
          />
          {!isAtLimit ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => handleCreateFolder(false)}
              disabled={!isInteractive || !newFolderName.trim()}
              className="w-full lg:w-auto [&>span]:h-8 [&>span]:px-4 [&>span]:py-1.5"
            >
              <span className="inline-flex items-center gap-2">
                <FolderPlus className="h-3.5 w-3.5" />
                New Folder
              </span>
            </Button>
          ) : null}
        </div>

        {error ? <p className="mt-2 text-xs text-[var(--color-danger)]">{error}</p> : null}
        {isAtLimit ? (
          <p className="mt-2 text-xs text-[var(--color-text-muted)]">
            Maximum 10 folders reached. Delete a folder to create a new one.
          </p>
        ) : null}
        {!routingEnabled ? (
          <p className="mt-2 text-xs text-[var(--color-text-muted)]">
            Routing is off. The graph is visible for review, but connections and edits are disabled.
          </p>
        ) : null}

        {routingFolders.length === 0 ? (
          <div className="mt-4 flex h-[420px] items-center justify-center rounded-2xl border border-dashed border-[var(--color-border)] bg-white/70 px-6 text-center">
            <div>
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-primary-light)]/60 text-[var(--color-primary)]">
                <Folder className="h-5 w-5" />
              </div>
              <p className="mt-4 text-sm font-semibold text-[var(--color-text-heading)]">No folders yet</p>
              <p className="mt-2 text-xs text-[var(--color-text-muted)]">
                No folders yet. Add one using the field above to start routing your downloads.
              </p>
            </div>
          </div>
        ) : (
          <div className={[
            'mt-4 h-[540px] overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white/70',
            !routingEnabled ? 'opacity-65' : '',
          ].join(' ')}>
            <ReactFlowProvider>
              <div className="relative h-full w-full">
                <div className="pointer-events-none absolute inset-y-4 left-1/2 z-10 w-px -translate-x-1/2 bg-[var(--color-border)]/80" />

                <ReactFlow
                  className="sb-routing-canvas"
                  nodes={flowNodes}
                  edges={flowEdges}
                  onNodesChange={onFlowNodesChange}
                  onEdgesChange={onFlowEdgesChange}
                  onConnect={handleConnect}
                  nodeTypes={nodeTypes}
                  edgeTypes={edgeTypes}
                  fitView
                  fitViewOptions={{ padding: 0.26 }}
                  nodesDraggable={isInteractive}
                  nodesConnectable={isInteractive}
                  elementsSelectable={false}
                  zoomOnScroll
                  zoomOnPinch
                  panOnDrag={isInteractive}
                  minZoom={0.5}
                  maxZoom={1.8}
                  proOptions={FLOW_OPTIONS}
                  defaultEdgeOptions={{ type: 'routingEdge' }}
                >
                  <Controls showInteractive={false} fitViewOptions={{ padding: 0.26 }} />
                  <Background color="rgba(8, 145, 178, 0.08)" gap={18} />
                </ReactFlow>
              </div>
            </ReactFlowProvider>
          </div>
        )}
      </div>
    </section>
  );
}