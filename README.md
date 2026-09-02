# FamilyTree

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.0.4.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

## Navegación y estado

- `src/app/app.routes.ts` define rutas planas para Inicio, captura de miembros (`/members/new`), captura de relaciones (`/relationships/new`) y la vista del grafo (`/graph`). Esto facilita ubicar cada tarea principal en una URL predecible.
- `FamilyGraphService` (en `src/app/data/family-graph.service.ts`) actúa como un store ligero basado en señales. Expone `members()`, `relationships()` y `snapshot()` para leer datos y métodos `upsertMember()` / `addRelationship()` para actualizarlos.
- Las páginas de captura consumen directamente este servicio para guardar en memoria local y mostrar contadores sincronizados, por lo que cualquier desarrollador puede seguir el flujo sin efectos secundarios ocultos.
- La página del grafo solo necesita inyectar el servicio y enlazar `snapshot().nodes` / `snapshot().edges` hacia el componente `GraphViewport`, manteniendo la separación entre estado y presentación.
