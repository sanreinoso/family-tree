import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MemberFormComponent } from '../../features/member-form/member-form.component';
import { PersonNode } from '../../models/family-graph.model';
import { FamilyGraphService } from '../../data/family-graph.service';

@Component({
  selector: 'app-member-capture-page',
  standalone: true,
  imports: [CommonModule, MemberFormComponent],
  templateUrl: './member-capture.page.html',
  styleUrl: './member-capture.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MemberCapturePageComponent {
  private readonly graph = inject(FamilyGraphService);
  protected readonly status = signal<'idle' | 'saved'>('idle');
  protected readonly stats = computed(() => ({
    nodes: this.graph.members().length,
    edges: this.graph.relationships().length
  }));
  protected readonly lastSaved = this.graph.lastMemberMutation;
  protected readonly existingIds = this.graph.memberIds;

  protected handleSubmit(node: PersonNode): void {
    this.graph.upsertMember(node);
    this.status.set('saved');
  }
}
