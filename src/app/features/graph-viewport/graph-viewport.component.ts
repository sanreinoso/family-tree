import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  input,
  output,
  viewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  Connection,
  Edge,
  Node,
  NodeChange,
  Vflow,
  VflowComponent,
  createEdges,
  createNodes
} from 'ngx-vflow';
import { PersonNode, RelationshipEdge, RelationshipKind } from '../../models/family-graph.model';

@Component({
  selector: 'app-graph-viewport',
  standalone: true,
  imports: [CommonModule, Vflow],
  templateUrl: './graph-viewport.component.html',
  styleUrl: './graph-viewport.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GraphViewportComponent {
  readonly nodes = input.required<PersonNode[]>();
  readonly edges = input.required<RelationshipEdge[]>();
  readonly selectedNodeId = input<string | null>(null);
  readonly showMinimap = input<boolean>(true);

  readonly nodeSelect = output<PersonNode>();
  readonly nodePositionChange = output<{ id: string; position: { x: number; y: number } }>();
  readonly connectRelationship = output<{
    sourceId: string;
    targetId: string;
    kind: RelationshipKind;
  }>();
  readonly quickAddRelative = output<PersonNode>();

  readonly vflowRef = viewChild<VflowComponent>('flow');
  readonly viewportContainer = viewChild<ElementRef<HTMLElement>>('viewportContainer');

  readonly vflowNodes = computed<Node<PersonNode>[]>(() => {
    const rawNodes = this.nodes();
    return createNodes<PersonNode>(
      rawNodes.map((person, index) => ({
        id: person.id,
        point: person.position ?? {
          x: 100 + (index % 3) * 260,
          y: 80 + Math.floor(index / 3) * 180
        },
        type: 'html-template',
        width: 220,
        height: 105,
        data: person
      }))
    );
  });

  readonly vflowEdges = computed<Edge[]>(() => {
    const rawEdges = this.edges();
    return createEdges(
      rawEdges.map((rel) => {
        const isSpouse = rel.kind === RelationshipKind.Spouse;
        return {
          id: rel.id,
          source: rel.sourceId,
          target: rel.targetId,
          sourceHandle: isSpouse ? 'partner-right' : 'descendant-source',
          targetHandle: isSpouse ? 'partner-left' : 'ancestor-target',
          curve: 'bezier',
          markers: {
            end: {
              type: 'arrow-closed',
              color: isSpouse ? '#4a6b5b' : '#c86d51',
              width: 12,
              height: 12
            }
          }
        };
      })
    );
  });

  protected onNodeClick(node: PersonNode, event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
    }
    this.nodeSelect.emit(node);
  }

  protected onAddRelativeClick(node: PersonNode, event: MouseEvent): void {
    event.stopPropagation();
    this.quickAddRelative.emit(node);
  }

  protected onNodesChange(changes: NodeChange[]): void {
    for (const change of changes) {
      if (change.type === 'position' && change.point) {
        this.nodePositionChange.emit({
          id: change.id,
          position: change.point
        });
      }
    }
  }

  protected onConnect(connection: Connection): void {
    if (!connection.source || !connection.target || connection.source === connection.target) {
      return;
    }

    const isSpouse =
      connection.sourceHandle?.includes('partner') ||
      connection.targetHandle?.includes('partner');

    this.connectRelationship.emit({
      sourceId: connection.source,
      targetId: connection.target,
      kind: isSpouse ? RelationshipKind.Spouse : RelationshipKind.Parent
    });
  }

  public fitView(): void {
    this.vflowRef()?.fitView({ padding: 40 });
  }

  public zoomIn(): void {
    const vflow = this.vflowRef();
    if (vflow) {
      const current = vflow.viewport().zoom;
      vflow.zoomTo(Math.min(2.5, current + 0.2));
    }
  }

  public zoomOut(): void {
    const vflow = this.vflowRef();
    if (vflow) {
      const current = vflow.viewport().zoom;
      vflow.zoomTo(Math.max(0.4, current - 0.2));
    }
  }

  public resetZoom(): void {
    const vflow = this.vflowRef();
    if (vflow) {
      vflow.zoomTo(1);
      vflow.fitView({ padding: 30 });
    }
  }

  protected getInitials(name: string): string {
    return (name || '')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join('');
  }

  protected formatDates(node: PersonNode): string {
    const birth = node.birthDate ? node.birthDate.slice(0, 4) : '';
    const death = node.deathDate ? node.deathDate.slice(0, 4) : '';
    if (!birth && !death) return 'Fechas no registradas';
    if (birth && !death) return `b. ${birth} – Presente`;
    return `${birth || '?'} – ${death}`;
  }
}
