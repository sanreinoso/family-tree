import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RelationshipFormComponent } from '../../features/relationship-form/relationship-form.component';
import { RelationshipEdge } from '../../models/family-graph.model';
import { FamilyGraphService } from '../../data/family-graph.service';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-relationship-capture-page',
  standalone: true,
  imports: [CommonModule, RelationshipFormComponent, RouterLink],
  templateUrl: './relationship-capture.page.html',
  styleUrl: './relationship-capture.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RelationshipCapturePageComponent {
  private readonly graph = inject(FamilyGraphService);
  protected readonly nodes = this.graph.members;
  protected readonly stats = computed(() => ({
    nodes: this.graph.members().length,
    edges: this.graph.relationships().length
  }));
  protected readonly canLink = computed(() => this.graph.members().length >= 2);
  protected readonly status = signal<'idle' | 'saved' | 'duplicate'>('idle');
  protected readonly lastSaved = this.graph.lastRelationshipMutation;

  protected handleSubmit(edge: RelationshipEdge): void {
    const added = this.graph.addRelationship(edge);
    this.status.set(added ? 'saved' : 'duplicate');
  }
}
