import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { PersonNode } from '../../models/family-graph.model';

const OPTIONAL_URL_PATTERN = /^$|https?:\/\/.+/i;

type MemberFormValue = {
  id: string;
  displayName: string;
  birthDate: string;
  deathDate: string;
  birthplace: string;
  biography: string;
  photoUrl: string;
  tags: string;
};

@Component({
  selector: 'app-member-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './member-form.component.html',
  styleUrl: './member-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MemberFormComponent implements OnChanges {
  private readonly fb = inject(FormBuilder);

  @Input() member?: PersonNode | null;
  @Input() submitLabel = 'Guardar miembro';
  @Input() existingIds: string[] = [];
  @Output() memberSubmit = new EventEmitter<PersonNode>();

  private readonly uniqueIdValidator: ValidatorFn = (control) => {
    const value = (control.value ?? '').trim();
    if (!value) {
      return null;
    }
    const isCurrentMemberId = this.member?.id === value;
    if (!isCurrentMemberId && this.existingIds.includes(value)) {
      return { duplicateId: true };
    }
    return null;
  };

  protected readonly form = this.fb.nonNullable.group({
    id: ['', [Validators.required, Validators.minLength(3), this.uniqueIdValidator]],
    displayName: ['', [Validators.required, Validators.minLength(2)]],
    birthDate: [''],
    deathDate: [''],
    birthplace: [''],
    biography: [''],
    photoUrl: ['', [Validators.pattern(OPTIONAL_URL_PATTERN)]],
    tags: ['']
  });

  constructor() {
    this.applyValue();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['member']) {
      this.applyValue(changes['member'].currentValue);
    }
    if (changes['existingIds']) {
      this.controls.id.updateValueAndValidity();
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

    const raw = this.form.getRawValue();
    const node: PersonNode = {
      id: raw.id.trim(),
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
    this.applyValue();
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
    }

    this.form.setValue(value);
  }

  private createEmptyValue(): MemberFormValue {
    return {
      id: this.generateNodeId(),
      displayName: '',
      birthDate: '',
      deathDate: '',
      birthplace: '',
      biography: '',
      photoUrl: '',
      tags: ''
    };
  }

  private generateNodeId(): string {
    const cryptoApi = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined;
    if (cryptoApi?.randomUUID) {
      return cryptoApi.randomUUID();
    }

    return `person-${Date.now()}`;
  }

  private cleanOptional(value?: string | null): string | undefined {
    const cleaned = value?.trim();
    return cleaned ? cleaned : undefined;
  }
}
