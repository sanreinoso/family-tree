/**
 * Core graph primitives shared across the application. This remains framework-agnostic
 * so components, services, and persistence utilities can reason about people and
 * relationships without duplicating shape definitions.
 */
export type NodeId = string;

export enum RelationshipKind {
  Parent = 'parent',
  Child = 'child',
  Spouse = 'spouse',
  Sibling = 'sibling',
  Grandparent = 'grandparent',
  Grandchild = 'grandchild'
}

export interface PersonNode {
  id: NodeId;
  displayName: string;
  birthDate?: string;
  deathDate?: string;
  birthplace?: string;
  biography?: string;
  photoUrl?: string;
  role?: string;
  tags?: string[];
  position?: { x: number; y: number };
  metadata?: Record<string, string>;
}

export interface RelationshipEdge {
  id: string;
  sourceId: NodeId;
  targetId: NodeId;
  kind: RelationshipKind;
  notes?: string;
  confidence?: number;
}

export interface FamilyGraphSnapshot {
  nodes: PersonNode[];
  edges: RelationshipEdge[];
  updatedAt: number;
}

export interface GraphMutation<TPayload = unknown> {
  id: string;
  createdAt: number;
  actor: string;
  payload: TPayload;
}

export type RelationshipMatrix = Record<NodeId, Partial<Record<NodeId, RelationshipKind>>>;

export const RECIPROCAL_RELATIONSHIP: Record<RelationshipKind, RelationshipKind | null> = {
  [RelationshipKind.Parent]: RelationshipKind.Child,
  [RelationshipKind.Child]: RelationshipKind.Parent,
  [RelationshipKind.Spouse]: RelationshipKind.Spouse,
  [RelationshipKind.Sibling]: RelationshipKind.Sibling,
  [RelationshipKind.Grandparent]: RelationshipKind.Grandchild,
  [RelationshipKind.Grandchild]: RelationshipKind.Grandparent
};
