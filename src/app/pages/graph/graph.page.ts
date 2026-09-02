import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { GraphViewportComponent } from '../../features/graph-viewport/graph-viewport.component';
import { FamilyGraphService } from '../../data/family-graph.service';
import { PersonNode } from '../../models/family-graph.model';

@Component({
  selector: 'app-graph-page',
  standalone: true,
  imports: [CommonModule, GraphViewportComponent, DatePipe],
  templateUrl: './graph.page.html',
  styleUrl: './graph.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GraphPageComponent {
  private readonly graph = inject(FamilyGraphService);
  protected readonly snapshot = this.graph.snapshot;
  protected readonly stats = computed(() => ({
    nodeCount: this.graph.members().length,
    edgeCount: this.graph.relationships().length,
    updatedAt: this.graph.snapshot().updatedAt
  }));

  protected readonly zoom = signal(1);
  protected readonly selectedNodeId = signal<string | null>(null);

  private readonly zoomStep = 0.15;
  private readonly minZoom = 0.6;
  private readonly maxZoom = 1.8;

  protected readonly selectedNode = computed<PersonNode | null>(() => {
    const id = this.selectedNodeId();
    if (!id) return null;
    return this.snapshot().nodes.find((node) => node.id === id) ?? null;
  });

  protected zoomOut(): void {
    this.zoom.update((current) => Math.max(this.minZoom, this.toFixed(current - this.zoomStep)));
  }

  protected zoomIn(): void {
    this.zoom.update((current) => Math.min(this.maxZoom, this.toFixed(current + this.zoomStep)));
  }

  protected resetZoom(): void {
    this.zoom.set(1);
  }

  protected onZoomSliderChange(value: string): void {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) {
      this.zoom.set(this.toFixed(parsed));
    }
  }

  protected handleNodeSelect(node: PersonNode): void {
    this.selectedNodeId.set(node.id);
  }

  protected clearSelection(): void {
    this.selectedNodeId.set(null);
  }

  private toFixed(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
