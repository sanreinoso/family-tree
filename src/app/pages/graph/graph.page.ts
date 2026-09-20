import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  viewChild
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as htmlToImage from 'html-to-image';
import { GraphViewportComponent } from '../../features/graph-viewport/graph-viewport.component';
import { FamilyGraphService } from '../../data/family-graph.service';
import { PersonNode, RelationshipEdge, RelationshipKind } from '../../models/family-graph.model';

@Component({
  selector: 'app-graph-page',
  standalone: true,
  imports: [CommonModule, FormsModule, GraphViewportComponent, DatePipe],
  templateUrl: './graph.page.html',
  styleUrl: './graph.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GraphPageComponent {
  private readonly graph = inject(FamilyGraphService);
  protected readonly viewport = viewChild(GraphViewportComponent);

  protected readonly snapshot = this.graph.snapshot;
  protected readonly members = this.graph.members;
  protected readonly relationships = this.graph.relationships;

  protected readonly stats = computed(() => ({
    nodeCount: this.members().length,
    edgeCount: this.relationships().length,
    updatedAt: this.snapshot().updatedAt
  }));

  // UI state signals
  protected readonly selectedNodeId = signal<string | null>(null);
  protected readonly isDrawerOpen = signal<boolean>(false);
  protected readonly isCreatingNew = signal<boolean>(false);
  protected readonly showMinimap = signal<boolean>(true);
  protected readonly isExporting = signal<boolean>(false);
  protected readonly exportSuccess = signal<string | null>(null);

  // Form signals for drawer
  protected readonly formId = signal<string>('');
  protected readonly formDisplayName = signal<string>('');
  protected readonly formRole = signal<string>('Familiar');
  protected readonly formBirthDate = signal<string>('');
  protected readonly formDeathDate = signal<string>('');
  protected readonly formBirthplace = signal<string>('');
  protected readonly formBiography = signal<string>('');
  protected readonly formTags = signal<string>('');

  // Quick link signals
  protected readonly linkTargetId = signal<string>('');
  protected readonly linkKind = signal<RelationshipKind>(RelationshipKind.Parent);

  protected readonly selectedNode = computed<PersonNode | null>(() => {
    const id = this.selectedNodeId();
    if (!id) return null;
    return this.members().find((node) => node.id === id) ?? null;
  });

  // Direct relationships for currently selected node
  protected readonly selectedNodeRelationships = computed(() => {
    const id = this.selectedNodeId();
    if (!id) return [];
    const membersMap = new Map(this.members().map((m) => [m.id, m.displayName]));
    return this.relationships()
      .filter((edge) => edge.sourceId === id || edge.targetId === id)
      .map((edge) => {
        const isSource = edge.sourceId === id;
        const otherId = isSource ? edge.targetId : edge.sourceId;
        const otherName = membersMap.get(otherId) ?? otherId;
        let relationLabel = '';
        if (edge.kind === RelationshipKind.Parent) {
          relationLabel = isSource ? `Progenitor de ${otherName}` : `Hijo/a de ${otherName}`;
        } else if (edge.kind === RelationshipKind.Spouse) {
          relationLabel = `Pareja / Cónyuge de ${otherName}`;
        } else if (edge.kind === RelationshipKind.Sibling) {
          relationLabel = `Hermano/a de ${otherName}`;
        } else {
          relationLabel = `${edge.kind}: ${otherName}`;
        }

        return {
          id: edge.id,
          label: relationLabel,
          kind: edge.kind
        };
      });
  });

  // Available candidate members to link with
  protected readonly otherMembers = computed(() => {
    const currentId = this.selectedNodeId();
    return this.members().filter((m) => m.id !== currentId);
  });

  protected handleNodeSelect(node: PersonNode): void {
    this.selectedNodeId.set(node.id);
    this.isCreatingNew.set(false);
    this.populateForm(node);
    this.isDrawerOpen.set(true);
  }

  protected handleQuickAddRelative(parent: PersonNode): void {
    this.openNewMemberDrawer(parent.id);
  }

  protected handleNodePositionChange(evt: { id: string; position: { x: number; y: number } }): void {
    this.graph.updateMemberPosition(evt.id, evt.position);
  }

  protected handleConnectRelationship(evt: {
    sourceId: string;
    targetId: string;
    kind: RelationshipKind;
  }): void {
    this.graph.addRelationship({
      id: '',
      sourceId: evt.sourceId,
      targetId: evt.targetId,
      kind: evt.kind
    });
  }

  protected openNewMemberDrawer(relativeToId?: string): void {
    this.selectedNodeId.set(null);
    this.isCreatingNew.set(true);
    this.formId.set(`p-${Date.now().toString(36)}`);
    this.formDisplayName.set('');
    this.formRole.set('Hijo/a');
    this.formBirthDate.set('');
    this.formDeathDate.set('');
    this.formBirthplace.set('');
    this.formBiography.set('');
    this.formTags.set('');

    if (relativeToId) {
      this.linkTargetId.set(relativeToId);
      this.linkKind.set(RelationshipKind.Parent);
    } else {
      this.linkTargetId.set('');
    }

    this.isDrawerOpen.set(true);
  }

  protected closeDrawer(): void {
    this.isDrawerOpen.set(false);
  }

  protected saveDrawerMember(): void {
    const name = this.formDisplayName().trim();
    if (!name) return;

    const id = this.formId() || `p-${Date.now().toString(36)}`;
    const currentPos = this.selectedNode()?.position;

    const person: PersonNode = {
      id,
      displayName: name,
      role: this.formRole().trim() || 'Familiar',
      birthDate: this.formBirthDate().trim() || undefined,
      deathDate: this.formDeathDate().trim() || undefined,
      birthplace: this.formBirthplace().trim() || undefined,
      biography: this.formBiography().trim() || undefined,
      tags: this.formTags()
        ? this.formTags()
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
        : [],
      position: currentPos ?? {
        x: 180 + Math.random() * 200,
        y: 120 + Math.random() * 200
      }
    };

    this.graph.upsertMember(person);

    // If creating new with a predefined relative link
    if (this.isCreatingNew() && this.linkTargetId()) {
      this.graph.addRelationship({
        id: '',
        sourceId: this.linkTargetId(),
        targetId: id,
        kind: this.linkKind()
      });
    }

    this.selectedNodeId.set(id);
    this.isCreatingNew.set(false);
  }

  protected deleteCurrentMember(): void {
    const id = this.selectedNodeId();
    if (!id) return;
    if (confirm('¿Eliminar este familiar del árbol genealógico?')) {
      this.graph.deleteMember(id);
      this.closeDrawer();
      this.selectedNodeId.set(null);
    }
  }

  protected addDirectLink(): void {
    const currentId = this.selectedNodeId();
    const targetId = this.linkTargetId();
    if (!currentId || !targetId || currentId === targetId) return;

    this.graph.addRelationship({
      id: '',
      sourceId: currentId,
      targetId,
      kind: this.linkKind()
    });

    this.linkTargetId.set('');
  }

  protected removeRelationship(edgeId: string): void {
    this.graph.deleteRelationship(edgeId);
  }

  // Floating canvas actions
  protected fitView(): void {
    this.viewport()?.fitView();
  }

  protected zoomIn(): void {
    this.viewport()?.zoomIn();
  }

  protected zoomOut(): void {
    this.viewport()?.zoomOut();
  }

  protected resetZoom(): void {
    this.viewport()?.resetZoom();
  }

  protected toggleMinimap(): void {
    this.showMinimap.update((v) => !v);
  }

  // Export / Import
  protected async exportAsPng(): Promise<void> {
    const container = this.viewport()?.viewportContainer()?.nativeElement;
    if (!container) return;

    this.isExporting.set(true);
    try {
      const dataUrl = await htmlToImage.toPng(container, {
        backgroundColor: '#fdfbf7',
        pixelRatio: 2
      });

      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `family-tree-${new Date().toISOString().slice(0, 10)}.png`;
      a.click();
      this.showToast('Imagen PNG exportada con éxito');
    } catch (err) {
      console.error('Error exportando PNG', err);
      alert('No se pudo generar la imagen PNG.');
    } finally {
      this.isExporting.set(false);
    }
  }

  protected downloadJsonSnapshot(): void {
    const jsonStr = this.graph.exportJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `family-tree-snapshot-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.showToast('Respaldo JSON descargado');
  }

  protected onJsonFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      const content = reader.result as string;
      const success = this.graph.importJson(content);
      if (success) {
        this.showToast('Árbol restaurado desde JSON');
        setTimeout(() => this.fitView(), 100);
      } else {
        alert('El archivo JSON no tiene un formato de árbol válido.');
      }
      input.value = '';
    };
    reader.readAsText(file);
  }

  protected resetDemo(): void {
    if (confirm('¿Restablecer el árbol con los datos de muestra iniciales?')) {
      this.graph.resetToDemo();
      this.selectedNodeId.set(null);
      this.closeDrawer();
      setTimeout(() => this.fitView(), 100);
    }
  }

  private populateForm(node: PersonNode): void {
    this.formId.set(node.id);
    this.formDisplayName.set(node.displayName);
    this.formRole.set(node.role ?? 'Familiar');
    this.formBirthDate.set(node.birthDate ?? '');
    this.formDeathDate.set(node.deathDate ?? '');
    this.formBirthplace.set(node.birthplace ?? '');
    this.formBiography.set(node.biography ?? '');
    this.formTags.set(node.tags ? node.tags.join(', ') : '');
    this.linkTargetId.set('');
  }

  private showToast(msg: string): void {
    this.exportSuccess.set(msg);
    setTimeout(() => this.exportSuccess.set(null), 3000);
  }
}
