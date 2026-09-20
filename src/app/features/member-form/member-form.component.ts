import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { PersonNode } from '../../models/family-graph.model';

const OPTIONAL_URL_PATTERN = /^$|https?:\/\/.+/i;

@Component({
  selector: 'app-member-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './member-form.component.html',
  styleUrl: './member-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MemberFormComponent {
  private readonly fb = inject(FormBuilder);

  readonly member = input<PersonNode | null>(null);
  readonly submitLabel = input<string>('Guardar miembro');
  readonly existingIds = input<string[]>([]);
  readonly memberSubmit = output<PersonNode>();

  protected readonly form = this.fb.nonNullable.group({
    id: [''],
    displayName: ['', [Validators.required, Validators.minLength(2)]],
    birthDate: [''],
    deathDate: [''],
    birthplace: [''],
    biography: [''],
    photoUrl: ['', [Validators.pattern(OPTIONAL_URL_PATTERN)]],
    tags: ['']
  });

  constructor() {
    effect(() => {
      const currentMember = this.member();
      this.applyValue(currentMember);
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
    const finalId = raw.id.trim() || this.member()?.id || `p-${Date.now().toString(36)}`;
    const node: PersonNode = {
      id: finalId,
      displayName: raw.displayName.trim(),
      birthDate: this.cleanOptional(raw.birthDate),
      deathDate: this.cleanOptional(raw.deathDate),
      birthplace: this.cleanOptional(raw.birthplace),
      biography: this.cleanOptional(raw.biography),
      photoUrl: this.cleanOptional(raw.photoUrl)
    };

    const tags = raw.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);

    if (tags.length) {
      node.tags = tags;
    }

    this.memberSubmit.emit(node);
  }

  protected resetForm(): void {
    this.applyValue(this.member());
  }

  private applyValue(node?: PersonNode | null): void {
    const value = this.createEmptyValue();

    if (node) {
      value.id = node.id;
      value.displayName = node.displayName;
      value.birthDate = node.birthDate ?? '';
      value.deathDate = node.deathDate ?? '';
      value.birthplace = node.birthplace ?? '';
      value.biography = node.biography ?? '';
      value.photoUrl = node.photoUrl ?? '';
      value.tags = (node.tags ?? []).join(', ');
    } else {
      value.id = `p-${Date.now().toString(36)}`;
    }

    this.form.reset(value);
  }

  private createEmptyValue() {
    return {
      id: '',
      displayName: '',
      birthDate: '',
      deathDate: '',
      birthplace: '',
      biography: '',
      photoUrl: '',
      tags: ''
    };
  }

  private cleanOptional(value?: string | null): string | undefined {
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
  }
}
