import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { PersonNode, RelationshipEdge, RelationshipKind } from '../../models/family-graph.model';

const differentNodesValidator: ValidatorFn = (group) => {
  const source = group.get('sourceId')?.value;
  const target = group.get('targetId')?.value;
  if (source && target && source === target) {
    return { sameNode: true };
  }
  return null;
};

type RelationshipFormValue = {
  sourceId: string;
  targetId: string;
  kind: RelationshipKind;
  notes: string;
};

@Component({
  selector: 'app-relationship-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './relationship-form.component.html',
  styleUrl: './relationship-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RelationshipFormComponent implements OnChanges {
  private readonly fb = inject(FormBuilder);

  @Input() nodes: PersonNode[] = [];
  @Input() submitLabel = 'Registrar relación';
  @Output() relationshipSubmit = new EventEmitter<RelationshipEdge>();

  protected readonly relationshipKinds = Object.values(RelationshipKind);

  protected readonly form = this.fb.nonNullable.group(
    {
      sourceId: ['', Validators.required],
      targetId: ['', Validators.required],
      kind: [RelationshipKind.Parent, Validators.required],
      notes: ['']
    },
    { validators: differentNodesValidator }
  );

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['nodes'] && this.nodes.length) {
      this.ensureValidSelections();
    }
  }

  protected get controls() {
    return this.form.controls;
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue() as RelationshipFormValue;
    const edge: RelationshipEdge = {
      id: this.generateEdgeId(),
      sourceId: raw.sourceId,
      targetId: raw.targetId,
      kind: raw.kind,
      notes: this.cleanOptional(raw.notes)
    };

    this.relationshipSubmit.emit(edge);
  }

  protected resetForm(): void {
    this.form.reset({
      sourceId: '',
      targetId: '',
      kind: RelationshipKind.Parent,
      notes: ''
    });
  }

  protected nodeLabel(id: string): string {
    return this.nodes.find((node) => node.id === id)?.displayName ?? id;
  }

  protected hasSameNodeError(): boolean {
    return this.form.errors?.['sameNode'] ?? false;
  }

  private ensureValidSelections(): void {
    const validIds = new Set(this.nodes.map((node) => node.id));
    const current = this.form.value;

    if (current.sourceId && !validIds.has(current.sourceId)) {
      this.form.patchValue({ sourceId: '' });
    }

    if (current.targetId && !validIds.has(current.targetId)) {
      this.form.patchValue({ targetId: '' });
    }
  }

  private generateEdgeId(): string {
    const cryptoApi = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined;
    if (cryptoApi?.randomUUID) {
      return cryptoApi.randomUUID();
    }

    return `edge-${Date.now()}`;
  }

  private cleanOptional(value?: string | null): string | undefined {
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
  }
}
