import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FamilyGraphService } from '../../data/family-graph.service';
import { PersonNode, RelationshipKind } from '../../models/family-graph.model';

type SandboxNode = {
  id: string;
  name: string;
  generation: string;
  role: string;
  x: number;
  y: number;
};

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './home.page.html',
  styleUrl: './home.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomePageComponent {
  private readonly router = inject(Router);
  private readonly graph = inject(FamilyGraphService);

  // Micro-Playground Interactive State
  protected readonly sandboxNodes = signal<SandboxNode[]>([
    { id: 'sb-abuelo', name: 'Antonio Morales', generation: 'Gen 1', role: 'Abuelo', x: 220, y: 30 },
    { id: 'sb-padre', name: 'Carlos Morales', generation: 'Gen 2', role: 'Padre', x: 120, y: 140 },
    { id: 'sb-hijo', name: 'Mateo Morales', generation: 'Gen 3', role: 'Hijo', x: 300, y: 250 }
  ]);

  protected readonly draggingNodeId = signal<string | null>(null);
  private dragOffset = { x: 0, y: 0 };

  // Onboarding "First-Spark" Wizard State
  protected readonly isSparkOpen = signal<boolean>(false);
  protected readonly sparkStep = signal<1 | 2 | 3>(1);
  protected readonly isSparkGenerating = signal<boolean>(false);

  // Spark Form Model
  protected sparkUser = {
    name: '',
    birthYear: '',
    birthplace: '',
    role: 'Tú'
  };

  protected sparkParents = {
    fatherName: '',
    motherName: '',
    parentsOrigin: ''
  };

  // Sandbox drag handlers
  protected startDrag(id: string, event: MouseEvent | TouchEvent): void {
    this.draggingNodeId.set(id);
    const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
    const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;
    const node = this.sandboxNodes().find((n) => n.id === id);
    if (node) {
      this.dragOffset = {
        x: clientX - node.x,
        y: clientY - node.y
      };
    }
  }

  protected onDrag(event: MouseEvent | TouchEvent): void {
    const activeId = this.draggingNodeId();
    if (!activeId) return;

    const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
    const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;

    const newX = Math.max(20, Math.min(520, clientX - this.dragOffset.x));
    const newY = Math.max(20, Math.min(300, clientY - this.dragOffset.y));

    this.sandboxNodes.update((nodes) =>
      nodes.map((n) => (n.id === activeId ? { ...n, x: newX, y: newY } : n))
    );
  }

  protected stopDrag(): void {
    this.draggingNodeId.set(null);
  }

  // Onboarding Wizard Actions
  protected openFirstSpark(): void {
    this.sparkStep.set(1);
    this.isSparkGenerating.set(false);
    this.sparkUser = { name: '', birthYear: '', birthplace: '', role: 'Tú' };
    this.sparkParents = { fatherName: '', motherName: '', parentsOrigin: '' };
    this.isSparkOpen.set(true);
  }

  protected closeFirstSpark(): void {
    this.isSparkOpen.set(false);
  }

  protected nextSparkStep(): void {
    if (this.sparkStep() === 1) {
      if (!this.sparkUser.name.trim()) return;
      this.sparkStep.set(2);
    } else if (this.sparkStep() === 2) {
      this.sparkStep.set(3);
      this.finishFirstSpark();
    }
  }

  protected prevSparkStep(): void {
    if (this.sparkStep() === 2) {
      this.sparkStep.set(1);
    }
  }

  private finishFirstSpark(): void {
    this.isSparkGenerating.set(true);

    const rootId = `person-${Date.now().toString(36)}`;
    const rootNode: PersonNode = {
      id: rootId,
      displayName: this.sparkUser.name.trim(),
      birthDate: this.sparkUser.birthYear ? `${this.sparkUser.birthYear}-01-01` : undefined,
      birthplace: this.sparkUser.birthplace.trim() || undefined,
      role: 'Tú (Raíz)',
      tags: ['raíz', 'onboarding'],
      position: { x: 300, y: 260 }
    };

    const newNodes: PersonNode[] = [rootNode];

    // Optional Father
    if (this.sparkParents.fatherName.trim()) {
      const fatherId = `father-${Date.now().toString(36)}`;
      const fatherNode: PersonNode = {
        id: fatherId,
        displayName: this.sparkParents.fatherName.trim(),
        birthplace: this.sparkParents.parentsOrigin.trim() || undefined,
        role: 'Padre',
        tags: ['padre'],
        position: { x: 180, y: 80 }
      };
      newNodes.push(fatherNode);
    }

    // Optional Mother
    if (this.sparkParents.motherName.trim()) {
      const motherId = `mother-${(Date.now() + 1).toString(36)}`;
      const motherNode: PersonNode = {
        id: motherId,
        displayName: this.sparkParents.motherName.trim(),
        birthplace: this.sparkParents.parentsOrigin.trim() || undefined,
        role: 'Madre',
        tags: ['madre'],
        position: { x: 440, y: 80 }
      };
      newNodes.push(motherNode);
    }

    // Clear previous graph and inject new lineage
    this.graph.clearAll();
    newNodes.forEach((node) => this.graph.upsertMember(node));

    // Connect parents to child
    if (newNodes.length > 1) {
      const father = newNodes.find((n) => n.role === 'Padre');
      const mother = newNodes.find((n) => n.role === 'Madre');

      if (father) {
        this.graph.addRelationship({
          id: `rel-${Date.now()}-f`,
          sourceId: father.id,
          targetId: rootId,
          kind: RelationshipKind.Parent
        });
      }
      if (mother) {
        this.graph.addRelationship({
          id: `rel-${Date.now()}-m`,
          sourceId: mother.id,
          targetId: rootId,
          kind: RelationshipKind.Parent
        });
      }
      if (father && mother) {
        this.graph.addRelationship({
          id: `rel-${Date.now()}-sp`,
          sourceId: father.id,
          targetId: mother.id,
          kind: RelationshipKind.Spouse
        });
      }
    }

    // Transition smoothly to graph view
    setTimeout(() => {
      this.isSparkOpen.set(false);
      this.router.navigate(['/graph']);
    }, 1200);
  }
}
