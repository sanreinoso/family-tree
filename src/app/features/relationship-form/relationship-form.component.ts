import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output
} from '@angular/core';
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

@Component({
  selector: 'app-relationship-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './relationship-form.component.html',
  styleUrl: './relationship-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RelationshipFormComponent {
  private readonly fb = inject(FormBuilder);

  readonly nodes = input<PersonNode[]>([]);
  readonly submitLabel = input<string>('Registrar relación');
  readonly relationshipSubmit = output<RelationshipEdge>();

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

  constructor() {
    effect(() => {
      const currentNodes = this.nodes();
      if (currentNodes.length >= 2) {
        this.ensureValidSelections(currentNodes);
      }
    });
  }

  protected get controls() {
    return this.form.controls;
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const edge: RelationshipEdge = {
      id: '',
      sourceId: raw.sourceId,
      targetId: raw.targetId,
      kind: raw.kind,
      notes: raw.notes.trim() ? raw.notes.trim() : undefined
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
    this.ensureValidSelections(this.nodes());
  }

  private ensureValidSelections(nodeList: PersonNode[]): void {
    const ids = nodeList.map((n) => n.id);
    const { sourceId, targetId } = this.form.getRawValue();

    if (!ids.includes(sourceId)) {
      this.controls.sourceId.setValue(ids[0] ?? '');
    }

    if (!ids.includes(targetId)) {
      const fallbackTarget = ids.find((id) => id !== this.controls.sourceId.value) ?? ids[1] ?? '';
      this.controls.targetId.setValue(fallbackTarget);
    }
  }

  protected nodeLabel(id: string): string {
    return this.nodes().find((node) => node.id === id)?.displayName ?? id;
  }

  protected hasSameNodeError(): boolean {
    return this.form.errors?.['sameNode'] ?? false;
  }
}
