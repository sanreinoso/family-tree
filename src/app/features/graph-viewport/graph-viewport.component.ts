import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { PersonNode, RelationshipEdge, RelationshipKind } from '../../models/family-graph.model';

type PositionedNode = {
  node: PersonNode;
  x: number;
  y: number;
  angle: number;
};

@Component({
  selector: 'app-graph-viewport',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './graph-viewport.component.html',
  styleUrl: './graph-viewport.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GraphViewportComponent implements OnChanges {
  @Input({ required: true }) nodes: PersonNode[] = [];
  @Input({ required: true }) edges: RelationshipEdge[] = [];
  @Input() zoom = 1;
  @Input() selectedNodeId: string | null = null;
  @Output() nodeSelect = new EventEmitter<PersonNode>();

  protected positionedNodes: PositionedNode[] = [];
  protected positionMap: Record<string, PositionedNode> = {};
  protected viewTransform = '';

  protected readonly relationshipColorMap: Record<RelationshipKind, string> = {
    [RelationshipKind.Parent]: '#2563eb',
    [RelationshipKind.Child]: '#7c3aed',
    [RelationshipKind.Spouse]: '#ec4899',
    [RelationshipKind.Sibling]: '#0ea5e9',
    [RelationshipKind.Grandparent]: '#f97316',
    [RelationshipKind.Grandchild]: '#22c55e'
  };

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['nodes']) {
      this.recalculateLayout();
    }
    this.viewTransform = this.buildTransform();
  }

  protected trackNode(_index: number, positioned: PositionedNode): string {
    return positioned.node.id;
  }

  protected trackEdge(_index: number, edge: RelationshipEdge): string {
    return edge.id;
  }

  protected colorFor(edge: RelationshipEdge): string {
    return this.relationshipColorMap[edge.kind] ?? '#94a3b8';
  }

  private recalculateLayout(): void {
    if (!this.nodes?.length) {
      this.positionedNodes = [];
      this.positionMap = {};
      this.viewTransform = '';
      return;
    }

    const count = this.nodes.length;
    const centerX = 320;
    const centerY = 220;
    // Keep every node (26px radius) plus its label within the 640x440 viewBox.
    const maxRadius = Math.min(centerX, centerY) - 50;
    const radius = Math.min(140 + count * 6, maxRadius);

    this.positionedNodes = this.nodes.map((node, index) => {
      const angle = (index / count) * Math.PI * 2 - Math.PI / 2;
      return {
        node,
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
        angle
      };
    });

    this.positionMap = this.positionedNodes.reduce<Record<string, PositionedNode>>((acc, entry) => {
      acc[entry.node.id] = entry;
      return acc;
    }, {});
  }

  protected onNodeActivate(node: PersonNode): void {
    this.nodeSelect.emit(node);
  }

  protected isSelected(nodeId: string): boolean {
    return !!this.selectedNodeId && this.selectedNodeId === nodeId;
  }

  private buildTransform(): string {
    const cx = 320;
    const cy = 220;
    return `translate(${cx} ${cy}) scale(${this.zoom}) translate(-${cx} -${cy})`;
  }
}
