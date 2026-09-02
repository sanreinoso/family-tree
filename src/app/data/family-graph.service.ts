import { Injectable, computed, signal } from '@angular/core';
import { FamilyGraphSnapshot, PersonNode, RelationshipEdge, RelationshipKind } from '../models/family-graph.model';

const demoNodes: PersonNode[] = [
  {
    id: 'p-ana',
    displayName: 'Ana Martínez',
    birthDate: '1965-05-24',
    birthplace: 'Guadalajara, MX',
    tags: ['generación-2', 'matriarca']
  },
  {
    id: 'p-camilo',
    displayName: 'Camilo Ortega',
    birthDate: '1962-09-03',
    birthplace: 'Guadalajara, MX',
    tags: ['generación-2']
  },
  {
    id: 'p-sol',
    displayName: 'Sol Hernández',
    birthDate: '1988-03-11',
    birthplace: 'CDMX, MX',
    tags: ['generación-3']
  },
  {
    id: 'p-valentina',
    displayName: 'Valentina Ortega',
    birthDate: '1992-07-18',
    birthplace: 'CDMX, MX',
    tags: ['generación-3']
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

@Injectable({ providedIn: 'root' })
export class FamilyGraphService {
  private readonly nodesState = signal<PersonNode[]>(demoNodes);
  private readonly edgesState = signal<RelationshipEdge[]>(demoEdges);
  private readonly updatedAt = signal<number>(Date.now());
  private readonly lastMember = signal<PersonNode | null>(null);
  private readonly lastRelationship = signal<RelationshipEdge | null>(null);

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
