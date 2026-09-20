import { Injectable, computed, effect, signal } from '@angular/core';
import { FamilyGraphSnapshot, PersonNode, RelationshipEdge, RelationshipKind } from '../models/family-graph.model';

const demoNodes: PersonNode[] = [
  {
    id: 'p-ana',
    displayName: 'Ana Martínez',
    birthDate: '1965-05-24',
    birthplace: 'Guadalajara, MX',
    role: 'Matriarca',
    tags: ['generación-2', 'matriarca'],
    position: { x: 180, y: 80 }
  },
  {
    id: 'p-camilo',
    displayName: 'Camilo Ortega',
    birthDate: '1962-09-03',
    birthplace: 'Guadalajara, MX',
    role: 'Patriarca',
    tags: ['generación-2'],
    position: { x: 460, y: 80 }
  },
  {
    id: 'p-sol',
    displayName: 'Sol Hernández',
    birthDate: '1988-03-11',
    birthplace: 'CDMX, MX',
    role: 'Hija mayor',
    tags: ['generación-3'],
    position: { x: 180, y: 280 }
  },
  {
    id: 'p-valentina',
    displayName: 'Valentina Ortega',
    birthDate: '1992-07-18',
    birthplace: 'CDMX, MX',
    role: 'Hija menor',
    tags: ['generación-3'],
    position: { x: 460, y: 280 }
  }
];

const demoEdges: RelationshipEdge[] = [
  {
    id: 'rel-1',
    sourceId: 'p-ana',
    targetId: 'p-sol',
    kind: RelationshipKind.Parent
  },
  {
    id: 'rel-2',
    sourceId: 'p-camilo',
    targetId: 'p-valentina',
    kind: RelationshipKind.Parent
  },
  {
    id: 'rel-3',
    sourceId: 'p-ana',
    targetId: 'p-camilo',
    kind: RelationshipKind.Spouse
  },
  {
    id: 'rel-4',
    sourceId: 'p-sol',
    targetId: 'p-valentina',
    kind: RelationshipKind.Sibling
  }
];

const STORAGE_KEY = 'family_tree_graph_data_v1';

function loadInitialState(): { nodes: PersonNode[]; edges: RelationshipEdge[]; updatedAt: number } {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { nodes: demoNodes, edges: demoEdges, updatedAt: Date.now() };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.nodes) && Array.isArray(parsed?.edges)) {
        return {
          nodes: parsed.nodes,
          edges: parsed.edges,
          updatedAt: parsed.updatedAt ?? Date.now()
        };
      }
    }
  } catch {
    // Ignore parse error and fall back to demo
  }
  return { nodes: demoNodes, edges: demoEdges, updatedAt: Date.now() };
}

@Injectable({ providedIn: 'root' })
export class FamilyGraphService {
  private readonly initial = loadInitialState();
  private readonly nodesState = signal<PersonNode[]>(this.initial.nodes);
  private readonly edgesState = signal<RelationshipEdge[]>(this.initial.edges);
  private readonly updatedAt = signal<number>(this.initial.updatedAt);
  private readonly lastMember = signal<PersonNode | null>(null);
  private readonly lastRelationship = signal<RelationshipEdge | null>(null);

  constructor() {
    // Keep localStorage synchronized whenever state signals update
    if (typeof window !== 'undefined' && window.localStorage) {
      effect(() => {
        const snapshot = this.snapshot();
        try {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
        } catch (e) {
          console.warn('Could not persist family tree snapshot to localStorage', e);
        }
      });
    }
  }

  readonly snapshot = computed<FamilyGraphSnapshot>(() => ({
    nodes: this.nodesState(),
    edges: this.edgesState(),
    updatedAt: this.updatedAt()
  }));

  readonly members = computed(() => this.nodesState());
  readonly relationships = computed(() => this.edgesState());
  readonly memberIds = computed(() => this.nodesState().map((node) => node.id));
  readonly lastMemberMutation = computed(() => this.lastMember());
  readonly lastRelationshipMutation = computed(() => this.lastRelationship());

  upsertMember(node: PersonNode): void {
    this.nodesState.update((nodes) => {
      const index = nodes.findIndex((existing) => existing.id === node.id);
      if (index === -1) {
        return [...nodes, node];
      }
      const copy = [...nodes];
      copy[index] = { ...copy[index], ...node };
      return copy;
    });

    this.lastMember.set(node);
    this.touch();
  }

  /**
   * Adds a relationship edge. Returns `true` when a new edge was created, or
   * `false` when an identical relationship already existed and nothing changed.
   */
  addRelationship(edge: RelationshipEdge): boolean {
    if (!this.nodeExists(edge.sourceId) || !this.nodeExists(edge.targetId)) {
      throw new Error('Both nodes must exist before linking them.');
    }

    if (edge.sourceId === edge.targetId) {
      throw new Error('Cannot relate a node with itself.');
    }

    const normalizedEdge = edge.id ? edge : { ...edge, id: this.generateId('rel') };

    let added = false;
    this.edgesState.update((edges) => {
      const alreadyExists = edges.some(
        (item) =>
          item.sourceId === normalizedEdge.sourceId &&
          item.targetId === normalizedEdge.targetId &&
          item.kind === normalizedEdge.kind
      );

      if (alreadyExists) {
        return edges;
      }

      added = true;
      return [...edges, normalizedEdge];
    });

    if (added) {
      this.lastRelationship.set(normalizedEdge);
      this.touch();
    }

    return added;
  }

  clearAll(): void {
    this.nodesState.set([]);
    this.edgesState.set([]);
    this.touch();
  }

  deleteMember(nodeId: string): void {
    this.nodesState.update((nodes) => nodes.filter((n) => n.id !== nodeId));
    this.edgesState.update((edges) => edges.filter((e) => e.sourceId !== nodeId && e.targetId !== nodeId));
    if (this.lastMember()?.id === nodeId) {
      this.lastMember.set(null);
    }
    this.touch();
  }

  deleteRelationship(edgeId: string): void {
    this.edgesState.update((edges) => edges.filter((e) => e.id !== edgeId));
    if (this.lastRelationship()?.id === edgeId) {
      this.lastRelationship.set(null);
    }
    this.touch();
  }

  updateMemberPosition(nodeId: string, position: { x: number; y: number }): void {
    this.nodesState.update((nodes) =>
      nodes.map((node) => (node.id === nodeId ? { ...node, position } : node))
    );
    this.touch();
  }

  exportJson(): string {
    return JSON.stringify(this.snapshot(), null, 2);
  }

  importJson(jsonContent: string): boolean {
    try {
      const data = JSON.parse(jsonContent);
      if (Array.isArray(data?.nodes) && Array.isArray(data?.edges)) {
        this.nodesState.set(data.nodes);
        this.edgesState.set(data.edges);
        this.touch();
        return true;
      }
    } catch (e) {
      console.error('Failed to parse graph JSON', e);
    }
    return false;
  }

  resetToDemo(): void {
    this.nodesState.set(demoNodes);
    this.edgesState.set(demoEdges);
    this.touch();
  }

  private nodeExists(id: string): boolean {
    return this.nodesState().some((node) => node.id === id);
  }

  private touch(): void {
    this.updatedAt.set(Date.now());
  }

  private generateId(prefix: string): string {
    const cryptoApi = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined;
    if (cryptoApi?.randomUUID) {
      return cryptoApi.randomUUID();
    }
    return `${prefix}-${Date.now()}`;
  }
}
