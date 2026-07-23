# Calendario Ibermex - Sistema de Gestión de Tareas y Proyectos

Este repositorio contiene la plataforma web de **Calendario Ibermex**, una aplicación moderna, fluida y responsiva desarrollada en React, TypeScript y Vite para administrar tareas, proyectos, colaboradores y métricas de desempeño de forma centralizada en tiempo real.

---

## 🎯 Objetivo del Proyecto

El objetivo principal es proporcionar a la organización un panel centralizado donde los administradores y colaboradores puedan coordinar actividades, dar seguimiento a fechas de entrega, adjuntar documentación relevante de Google Drive y monitorear el progreso a través de indicadores de productividad.

---

## 🛠️ Tecnologías Utilizadas

* **Frontend**: React 18, TypeScript, Vite.
* **Estilos**: Vanilla CSS con variables CSS personalizadas y diseño responsivo adaptado para dispositivos móviles y escritorio.
* **Base de Datos y Autenticación**: Firebase (Firestore para base de datos en tiempo real y Firebase Auth para inicio de sesión con cuentas de Google).
* **Iconografía**: Lucide React.
* **Pruebas**: Vitest y React Testing Library.

---

## ⚙️ ¿Cómo Funciona?

La aplicación está estructurada en componentes modulares que interactúan reactivamente con los servicios de Firebase:

### 1. Control de Accesos y Whitelist (Lista de Pre-aprobados)
* El acceso al sistema está restringido. Solo los usuarios cuyos correos electrónicos de Google han sido agregados a la colección `pre_approved_users` en Firestore por un administrador pueden iniciar sesión.
* Existen tres roles en la plataforma:
  - **Master Admin**: Acceso total al panel de administración, gestión de whitelist de accesos, creación de proyectos y visualización de todas las métricas.
  - **Admin**: Puede administrar tareas y asignar colaboradores a proyectos específicos.
  - **User (Colaborador)**: Puede visualizar sus tareas asignadas, marcar el estado de completado y acceder a sus enlaces de Drive asociados.
* **Asignación a Usuarios no Registrados**: Es posible asignar tareas a correos pre-aprobados que aún no han completado su primer inicio de sesión. El sistema genera perfiles temporales dinámicos en base a su correo electrónico para que aparezcan en los listados del proyecto y avatares del calendario inmediatamente.

### 2. Panel de Administración y Dashboard de Métricas
* Permite autorizar nuevos correos electrónicos y definir sus roles.
* Permite crear proyectos y asociar colaboradores específicos a cada uno.
* Integra un **Dashboard de Métricas en Tiempo Real** que calcula de forma dinámica:
  - Total de tareas registradas.
  - Tareas completadas vs. pendientes.
  - Porcentaje general de avance.
  - Desglose y gráfico de rendimiento por colaborador, mostrando cuántas tareas tiene asignadas y su tasa de completitud.

### 3. Calendario Dinámico y Vista Global ("Mi Calendario")
El calendario cuenta con tres vistas principales: **Mes**, **Semana** y **Día**.
* **Vista Global ("Mi Calendario")**: Seleccionada por defecto al iniciar sesión. Filtra automáticamente y muestra de forma transversal todas las tareas asignadas al usuario activo dentro de cualquiera de los proyectos a los que pertenece.
* **Vistas de Proyecto Específico**: Al dar clic en un proyecto de la lista, el calendario muestra únicamente las tareas asociadas a ese proyecto, y la modal de creación filtra el dropdown de responsables únicamente para mostrar los colaboradores de ese proyecto.
* **Diseño Responsivo en Móvil**:
  - En móviles, la cabecera del calendario se adapta apilando la navegación y el título del mes en dos líneas para evitar el corte del texto.
  - Las vistas de Mes y Semana tienen un ancho mínimo de `950px` con desplazamiento horizontal táctil suave para que las columnas sean legibles (`135px` cada una).
  - Los títulos de las tareas en Mes y Semana se truncan limpiamente en una sola línea con puntos suspensivos para una visualización ordenada, mientras que en la vista de Día se permite la envoltura en múltiples líneas.

### 4. Modal de Detalle de Tarea (Estilo Asana) y Tareas Recurrentes
Al dar clic en una tarea se abre una ventana modal interactiva de edición:
* **Checkbox de Completado**: Permite marcar las tareas directamente tanto desde la cuadrícula del calendario como desde la modal.
* **Adjuntos**: Permite asociar múltiples enlaces de Google Drive/documentos externos a una misma tarea.
* **Editor de Descripción**: Incluye un editor de texto enriquecido (Rich Text) simplificado y adaptado al ancho completo de la modal.
* **Recurrencia de Tareas**:
  - Permite configurar tareas para que se repitan en días seleccionados de la semana (por ejemplo: Lunes, Miércoles y Viernes) entre una fecha de inicio y una fecha de fin.
  - **Completado Individual**: Marcar como completada una tarea recurrente de la serie es un proceso individual (no afecta al resto de las tareas recurrentes de la serie).
  - **Menú Kebab (Eliminación Inteligente)**: En tareas recurrentes, el menú de opciones ofrece tres alternativas de borrado:
    1. *Eliminar*: Borra únicamente la instancia seleccionada de ese día.
    2. *Eliminar todas*: Borra la serie completa de tareas recurrentes.
    3. *Eliminar hacia delante*: Borra la tarea seleccionada y todas las repeticiones futuras a partir de ese día, conservando el histórico anterior.

---

## 🚀 Instalación y Desarrollo Local

### Requisitos Previos
* Node.js (versión 18 o superior).
* Una cuenta de Firebase configurada con Firestore y Authentication (Google Sign-In).

### Pasos para Ejecutar
1. **Clonar el repositorio** e instalar dependencias:
   ```bash
   npm install
   ```
2. **Configurar Variables de Entorno**:
   Crea un archivo `.env` en la raíz del proyecto (o edita el de tu entorno) con tus credenciales de Firebase:
   ```env
   VITE_FIREBASE_API_KEY=tu_api_key
   VITE_FIREBASE_AUTH_DOMAIN=tu_auth_domain
   VITE_FIREBASE_PROJECT_ID=tu_project_id
   VITE_FIREBASE_STORAGE_BUCKET=tu_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=tu_messaging_sender_id
   VITE_FIREBASE_APP_ID=tu_app_id
   ```
3. **Iniciar el servidor de desarrollo**:
   ```bash
   npm run dev
   ```
   La aplicación se abrirá en `http://localhost:5173`.

4. **Construir para producción**:
   ```bash
   npm run build
   ```

5. **Ejecutar Pruebas**:
   Para correr la suite completa de pruebas unitarias y de integración:
   ```bash
   npm run test
   ```
   o bien:
   ```bash
   npx vitest run
   ```
