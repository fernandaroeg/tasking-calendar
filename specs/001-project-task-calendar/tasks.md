# Tasks: Interactive Project Task Calendar

**Input**: Design documents from `/specs/001-project-task-calendar/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Unit and integration tests are required for all application phases. We use Vitest and React Testing Library.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root
- Paths shown below assume single project - adjust based on plan.md structure

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Initialize React-TypeScript project with Vite at root `c:\Users\fer_r\Documents\Antigravity\calendario_ibermex\calendario_ibermex`
- [x] T002 Install dependencies (firebase, lucide-react, vitest, jsdom, @testing-library/react, @testing-library/jest-dom) in `package.json`
- [x] T003 [P] Setup Vitest configuration in `vite.config.ts`
- [x] T004 [P] Configure HTML root page at `index.html`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T005 Create Firebase service initialization in `src/services/firebase.ts`
- [x] T006 Create global CSS rules, HSL variables, and dark theme colors in `src/index.css`
- [x] T007 Create environment variables template in `.env.example`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Autenticación y Control de Acceso (Priority: P1) 🎯 MVP

**Goal**: User authentication with Google, validating emails against `pre_approved_users` whitelist in Firestore.

**Independent Test**: Render App, mock Firebase Auth, test successful login with whitelisted mail, test blocked login for others.

### Tests for User Story 1 (Required)

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T008 [P] [US1] Create unit tests for login logic and pre-approval check in `src/services/__tests__/auth.test.ts`

### Implementation for User Story 1

- [x] T009 [US1] Implement Google Login, Logout, and state change subscriber in `src/services/firebase.ts`
- [x] T010 [US1] Implement root component routing, Google Sign-in button, and unauthorized page in `src/App.tsx`

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Visualización del Calendario Interactivo por Proyecto (Priority: P1)

**Goal**: Render calendar in Day/Week/Month view for assigned projects.

**Independent Test**: Mock project and task data, render CalendarGrid, switch views, click calendar cells.

### Tests for User Story 2 (Required)

- [x] T011 [P] [US2] Create unit tests for calendar view switching and date calculations in `src/components/__tests__/CalendarGrid.test.ts`

### Implementation for User Story 2

- [x] T012 [US2] Implement helper methods for fetching projects and subscribing to real-time task changes in `src/services/firebase.ts`
- [x] T013 [US2] Implement `CalendarGrid` UI component with Day, Week, and Month grids in `src/components/CalendarGrid.tsx`
- [x] T014 [US2] Integrate Project selection and Calendar views in main dashboard layout in `src/App.tsx`

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Gestión de Tareas (Creación, Detalle y Borrado) (Priority: P1)

**Goal**: Create, view details of, and delete tasks within assigned project calendars. Include support for rich text description, checklist subtasks, colored labels, and priority levels.

**Independent Test**: Create task on calendar cell, view details modal with checklist/labels, edit details, and delete task.

### Tests for User Story 3 (Required)

- [x] T015 [P] [US3] Create unit tests for task details modal, checklist status, and rich text editor in `src/components/__tests__/TaskDetailModal.test.ts`

### Implementation for User Story 3

- [x] T016 [US3] Implement Firestore write/delete operations for tasks in `src/services/firebase.ts`
- [x] T017 [US3] Implement markdown/rich-text editor input in `src/components/RichTextEditor.tsx`
- [x] T018 [US3] Implement task popup dialog with fields, labels selection, checklist items list, and delete button in `src/components/TaskDetailModal.tsx`
- [x] T019 [US3] Connect calendar cell click and task item click to open the details modal in `src/components/CalendarGrid.tsx`

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: User Story 4 - Asignación de Tareas y Gestión de Proyectos por el Administrador (Priority: P2)

**Goal**: Allow Admins to manage pre-approved whitelist emails, create projects, assign users, and assign task owners.

**Independent Test**: Login as Admin, open Admin dashboard, add email, create project, assign task to collaborator, verify only Admin can assign tasks.

### Tests for User Story 4 (Required)

- [x] T020 [P] [US4] Create unit and integration tests for admin panel operations and permission restrictions in `src/components/__tests__/AdminDashboard.test.ts`

### Implementation for User Story 4

- [x] T021 [US4] Implement Firestore helper methods to manage pre-approved emails whitelist and assign task collaborators in `src/services/firebase.ts`
- [x] T022 [US4] Implement `AdminDashboard` component to add/remove whitelisted emails and create projects with assigned users in `src/components/AdminDashboard.tsx`
- [x] T023 [US4] Update task assignment select field to be enabled only for Admins in `src/components/TaskDetailModal.tsx`
- [x] T024 [US4] Add navigation tab or access button to the Admin Dashboard for users with role `"admin"` in `src/App.tsx`

**Checkpoint**: Admin features are fully operational and verified

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T025 Configure Firestore security rules file at `src/services/firebase.rules`
- [x] T026 Apply clean visual CSS transitions, glassmorphism card designs, and dark mode tweaks to all components in `src/index.css`
- [x] T027 Update project documentation and verify setup steps in `specs/001-project-task-calendar/quickstart.md`
- [x] T028 Run all unit and integration tests to verify test suites pass in the repository.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - May integrate with US1 but should be independently testable
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - May integrate with US1/US2 but should be independently testable

### Within Each User Story

- Tests (if included) MUST be written and FAIL before implementation
- Models before services
- Services before endpoints
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, all user stories can start in parallel (if team capacity allows)
- All tests for a user story marked [P] can run in parallel
- Models within a story marked [P] can run in parallel

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: "T008 [P] [US1] Create unit tests for login logic and pre-approval check in src/services/__tests__/auth.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Each story adds value without breaking previous stories
