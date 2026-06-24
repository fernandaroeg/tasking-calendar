# Research: Interactive Project Task Calendar

This document outlines the technical research and architecture decisions for the Interactive Project Task Calendar application.

## 1. Frontend Framework & Tooling

### Decision
Use **React (TypeScript)** initialized via **Vite**.

### Rationale
- **Interactive State**: A calendar with drag/click capabilities, view switching (Day, Week, Month), and task detail modals requires robust, reactive state management. React handles state synchronization across views exceptionally well.
- **TypeScript**: Provides compile-time type safety for complex data models (Users, Tasks, Projects), reducing runtime errors.
- **Fast Build Times**: Vite provides instant hot-reloading (HMR) and fast build speeds, accelerating development.

### Alternatives Considered
- **Vanilla HTML/JS**: Rejected due to the high complexity of manually updating the DOM across three calendar views (Day/Week/Month), modal popups, and real-time database sync.
- **Next.js**: Rejected because this app functions as a single-page interactive application (SPA) with no SEO requirements for its authenticated dashboard. Next.js adds unnecessary build and deployment complexity compared to a static SPA deployed to Firebase Hosting.

---

## 2. Database and Real-time Sync

### Decision
Use **Firebase (Cloud Firestore)**.

### Rationale
- **Real-Time Data Flow**: Task updates (creation, deletion, assignment changes) will automatically synchronize across all active users immediately.
- **Serverless Client Integration**: Firestore can be queried securely directly from the client using security rules, eliminating the need to build a custom backend API layer.
- **Speed of Development**: Firebase is extremely fast to set up and provides ready-to-use SDKs.

### Alternatives Considered
- **Supabase (PostgreSQL)**: A great alternative, but Firebase is chosen due to the availability of the dedicated `firebase-mcp-server` tools which will streamline workspace integrations, testing, and deployment.
- **Node.js Express + SQLite/PostgreSQL**: Rejected because creating a custom REST API and hosting a server would double the development time and maintenance overhead.

---

## 3. User Authentication

### Decision
Use **Firebase Authentication (Google Auth Provider)**.

### Rationale
- **Secure Google Sign-In**: Handles the entire OAuth2 flow securely.
- **Seamless Integration with Firestore**: Firebase Auth tokens integrate natively with Firestore Security Rules to secure data based on user emails and roles.
- **Pre-Approved List Enforcement**: We can implement a firestore-based security rule and client-side check that validates the authenticated user's email against the `pre-approved-users` Firestore collection before granting database access.

### Alternatives Considered
- **Custom JWT Auth Server**: Rejected as it is less secure, takes longer to implement, and requires a dedicated database for user credential storage.

---

## 4. Calendar Layout and Styling

### Decision
Use **Vanilla CSS** with a custom CSS Grid/Flexbox calendar layout, following a premium dark-mode/glassmorphism design.

### Rationale
- **Visual Control**: CSS Grid makes it trivial to render calendars (7 columns for Week/Month, time slots for Day view).
- **Design Guidelines Compliance**: Vanilla CSS allows us to implement harmonious colors, smooth micro-animations, custom scrollbars, and premium aesthetics without utility class bloat.
- **Lightweight**: Avoids heavy third-party calendar libraries which are difficult to style.

### Alternatives Considered
- **FullCalendar.js**: A powerful calendar library, but it is heavily styled out-of-the-box and customizing it to fit a premium, modern design is often more difficult than building a custom grid in React.
- **Tailwind CSS**: Avoided in favor of Vanilla CSS to maintain maximum control and styling flexibility as per the guidelines.
