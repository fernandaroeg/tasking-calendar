# Feature Specification: Calendario Interactivo de Proyectos y Tareas

**Feature Branch**: `001-project-task-calendar`  
**Created**: 2026-06-23  
**Status**: Draft  
**Input**: User description: "quiero crear una web app en la que una lista de usuarios pre-aprobados inicien sesion con autenticacion de google y al entrar tengan acceso a una vista de calendario interactivo en la que se les asignan tareas. El calendario se muestra por día, semana o mes y durante el día se pueden agregar tareas y se les asignan a un usuario. Al darle click a las tareas se abre una visualización de titulo, fecha y descripcion de la tarea. Queiro que se pueda generar un calendario por proyecto y que los usuarios asignados a cierto calendario solo ven ese calendario, y un admin tiene vista a los calendarios de todos los proyectos y tiene el rol de asignar usuarios a tareas. Todos los usuarios pueden crear y borrar tareas dentro de los calendarios que tienen asignados. Esta app esta inspirada en los calendarios de asana pero con mas libertad de creacion y configuracion de las tareas."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Autenticación y Control de Acceso (Priority: P1)

Como usuario pre-aprobado, quiero iniciar sesión con mi cuenta de Google para poder acceder de forma segura a mis calendarios de proyectos.

**Why this priority**: Es la base de seguridad y control de la aplicación, asegurando que solo el personal autorizado pueda visualizar y gestionar la información.

**Independent Test**: Intentar iniciar sesión con un correo de Google que está en la lista de pre-aprobados y verificar que se redirige al dashboard. Intentar iniciar sesión con un correo de Google que no está en la lista y verificar que se muestra un mensaje de acceso no autorizado y se bloquea el ingreso.

**Acceptance Scenarios**:

1. **Given** un usuario con una cuenta de Google pre-aprobada en la lista de acceso, **When** hace clic en "Iniciar Sesión con Google" y completa la autenticación, **Then** ingresa al sistema y visualiza la interfaz principal con sus proyectos asignados.
2. **Given** un usuario con una cuenta de Google que no está en la lista de acceso, **When** hace clic en "Iniciar Sesión con Google" y completa la autenticación, **Then** el sistema le deniega el acceso, muestra un mensaje de error claro ("Acceso no autorizado") y permanece en la pantalla de inicio de sesión.

---

### User Story 2 - Visualización del Calendario Interactivo por Proyecto (Priority: P1)

Como usuario colaborador o administrador, quiero visualizar las tareas de un proyecto en un calendario interactivo en vistas de Día, Semana o Mes para entender la distribución del trabajo.

**Why this priority**: La vista de calendario es la interfaz principal de la aplicación y la forma en que los usuarios consumen la información de las tareas.

**Independent Test**: Cargar el dashboard del proyecto con datos de prueba, cambiar entre las vistas de Día, Semana y Mes, y verificar que las tareas se posicionen correctamente en la fecha y hora correspondientes.

**Acceptance Scenarios**:

1. **Given** que un usuario está asignado a un Proyecto A y un Proyecto B, **When** ingresa al dashboard y selecciona el Proyecto A, **Then** el sistema muestra solo las tareas correspondientes al Proyecto A.
2. **Given** la visualización de un calendario de proyecto, **When** el usuario hace clic en los botones de vista "Día", "Semana" o "Mes", **Then** el calendario cambia de escala temporal inmediatamente mostrando las tareas correspondientes a la escala seleccionada.
3. **Given** un usuario colaborador común, **When** intenta buscar o acceder a un Proyecto C al que no está asignado, **Then** el sistema no le muestra el proyecto en su lista y le prohíbe el acceso directo (mostrando error 404 o acceso denegado).

---

### User Story 3 - Gestión de Tareas (Creación, Detalle y Borrado) (Priority: P1)

Como usuario asignado a un proyecto, quiero crear tareas haciendo clic en un día del calendario y poder ver sus detalles o eliminarlas para mantener el calendario actualizado.

**Why this priority**: Permite la colaboración activa en el proyecto. Es la funcionalidad principal del flujo de trabajo de tareas.

**Independent Test**: En la vista del calendario, hacer clic en un día para abrir el formulario de creación, completar los campos requeridos, verificar que se muestra en el calendario, hacer clic en ella para ver los detalles y finalmente eliminarla, confirmando que desaparece del calendario.

**Acceptance Scenarios**:

1. **Given** que un usuario visualiza el calendario de su proyecto, **When** hace clic en un día específico, **Then** se despliega un formulario rápido para crear una tarea.
2. **Given** el formulario de creación de tarea, **When** el usuario ingresa un título, fecha y descripción y guarda, **Then** la tarea se crea y se renderiza en la fecha del calendario de inmediato.
3. **Given** una tarea visible en el calendario, **When** cualquier usuario asignado a ese proyecto hace clic sobre ella, **Then** se abre una ventana modal que muestra el título, fecha, descripción y el usuario asignado a la tarea.
4. **Given** la vista de detalles de una tarea, **When** un usuario asignado al proyecto hace clic en "Eliminar Tarea" y confirma la acción, **Then** la tarea se elimina permanentemente del proyecto y desaparece de la vista del calendario.

---

### User Story 4 - Asignación de Tareas y Gestión de Proyectos por el Administrador (Priority: P2)

Como administrador, quiero crear proyectos, asignar usuarios a proyectos y asignar colaboradores específicos a las tareas creadas para organizar el flujo de trabajo general.

**Why this priority**: Define el rol del administrador como gestor de recursos y tareas, permitiendo una correcta delegación y control de proyectos.

**Independent Test**: Iniciar sesión como administrador, crear un proyecto nuevo, agregar correos electrónicos de usuarios colaboradores al proyecto, y asignar un usuario a una tarea dentro de ese proyecto, verificando que los cambios se reflejen en la vista del colaborador.

**Acceptance Scenarios**:

1. **Given** que un administrador ha iniciado sesión, **When** accede al panel de administración y crea un nuevo proyecto, **Then** el proyecto se agrega a la lista global del sistema.
2. **Given** un proyecto existente, **When** el administrador añade usuarios de la lista pre-aprobada a dicho proyecto, **Then** dichos usuarios obtienen acceso al calendario de ese proyecto en su respectiva sesión.
3. **Given** una tarea en un calendario de proyecto, **When** el administrador edita la tarea para asignarla a un usuario específico del proyecto, **Then** el sistema guarda la asignación y notifica o visualiza al usuario asignado en la tarea.

---

### Edge Cases

- **Usuario retirado de la lista de pre-aprobados mientras tiene una sesión activa**: Si un administrador elimina a un usuario de la lista de pre-aprobados, la sesión actual del usuario debe invalidarse en su siguiente interacción con el servidor, redirigiéndolo al login.
- **Creación de tareas en fechas pasadas**: El sistema debe permitir la creación de tareas en el pasado (historial), pero debe requerir una confirmación o validación visual para evitar errores involuntarios del usuario.
- **Eliminación accidental de proyectos o tareas**: Al eliminar una tarea o un proyecto, el sistema debe solicitar confirmación explícita mediante una modal de advertencia antes de proceder con el borrado definitivo.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE autenticar a los usuarios a través del proveedor de identidad de Google (OAuth2).
- **FR-002**: El sistema DEBE validar la dirección de correo electrónico del usuario contra una lista de correos pre-aprobados antes de permitir el ingreso.
- **FR-003**: El sistema DEBE admitir dos roles de usuario diferenciados: Administrador (Admin) y Colaborador (User).
- **FR-004**: El sistema DEBE permitir a los Administradores crear proyectos y definir qué usuarios colaboradores están asignados a cada proyecto.
- **FR-005**: El sistema DEBE restringir la visibilidad de los proyectos de modo que un Colaborador sólo pueda ver y acceder a los calendarios de los proyectos a los que ha sido asignado explícitamente.
- **FR-006**: El sistema DEBE permitir que los Administradores visualicen todos los proyectos y sus respectivos calendarios.
- **FR-007**: El sistema DEBE proveer una interfaz de calendario interactiva con soporte para vistas diaria (Día), semanal (Semana) y mensual (Mes).
- **FR-008**: El sistema DEBE permitir a todos los usuarios asignados a un proyecto (tanto Admin como Colaboradores) crear y eliminar tareas dentro del calendario de ese proyecto.
- **FR-009**: El sistema DEBE habilitar exclusivamente al rol de Administrador la capacidad de asignar un usuario colaborador a una tarea específica.
- **FR-010**: El sistema DEBE permitir adjuntar a cada tarea la siguiente información base: Título, Fecha de Vencimiento, Descripción y Colaborador Asignado.
- **FR-011**: El sistema DEBE mostrar el detalle completo de una tarea (Título, Fecha, Descripción y Asignado) al hacer clic sobre ella en la interfaz de calendario.
- **FR-012**: El sistema DEBE permitir configurar en las tareas etiquetas personalizadas de colores, niveles de prioridad (Alta, Media, Baja), descripciones con soporte para formato de texto enriquecido y la creación de subtareas tipo checklist dentro del detalle de la tarea.
- **FR-013**: El sistema DEBE proveer un panel de administración web dentro de la aplicación donde el Administrador pueda gestionar (agregar, visualizar y eliminar) los correos electrónicos autorizados en la lista de usuarios pre-aprobados.

### Key Entities *(include if feature involves data)*

- **Usuario**: Representa a un individuo en el sistema.
  - Atributos: ID único, nombre, correo electrónico, rol (Admin/Colaborador), estado de aprobación.
- **Proyecto**: Representa un espacio de trabajo con su propio calendario.
  - Atributos: ID único, nombre del proyecto, descripción, lista de usuarios asignados.
- **Tarea**: Representa un ítem de trabajo programado dentro de un proyecto.
  - Atributos: ID único, ID del proyecto (relación), título, fecha/hora de vencimiento, descripción (formato enriquecido), ID del usuario asignado (relación, opcional), prioridad (Alta/Media/Baja), lista de etiquetas/colores asignadas, lista de subtareas (cada una con descripción y estado completado).


## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Los usuarios autenticados deben poder cambiar de vista de calendario (día, semana, mes) de forma fluida en menos de 300ms.
- **SC-002**: Un usuario colaborador asignado a múltiples proyectos debe poder filtrar y cargar el calendario de un proyecto específico en menos de 1 segundo tras seleccionarlo.
- **SC-003**: El sistema debe denegar el acceso al 100% de los intentos de inicio de sesión de usuarios cuyos correos electrónicos no estén incluidos en la lista de pre-aprobados.
- **SC-004**: Los usuarios deben poder crear una nueva tarea con menos de 3 clics desde la interfaz principal de calendario.

## Assumptions & Dependencies

### Assumptions
- **AS-001**: Los usuarios tienen cuentas de Google activas que corresponden exactamente a los correos electrónicos de la lista de pre-aprobación.
- **AS-002**: El sistema se utilizará principalmente en navegadores web modernos de escritorio y tablets con soporte completo para JavaScript.

### Dependencies
- **DE-001**: Dependencia del servicio externo de autenticación de Google (Google OAuth2) para el inicio de sesión.

