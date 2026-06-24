# Quickstart Guide: Interactive Project Task Calendar

This guide details how to set up, configure, and run the Interactive Project Task Calendar application locally.

## Prerequisites

Ensure you have the following installed on your machine:
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

---

## 1. Local Development Setup

We initialize the React app using Vite inside the `calendario_ibermex` directory.

### Initialize Project
To create the boilerplate project, run:
```bash
npx -y create-vite@latest ./ --template react-ts
npm install
```

### Install Dependencies
Install the required Firebase SDK, styling icons, and routing packages:
```bash
npm install firebase lucide-react
```

---

## 2. Configuration & Environment Variables

Create a `.env` file in the root of the project to store your Firebase client SDK credentials:

```env
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain_here
VITE_FIREBASE_PROJECT_ID=your_project_id_here
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket_here
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id_here
VITE_FIREBASE_APP_ID=your_app_id_here
```

### Firebase Project Initialization
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Create a new Firebase project (or use an existing one).
3. Enable **Google Authentication** in the **Authentication** section.
4. Enable **Cloud Firestore** database.
5. Create a Web App within your Firebase project settings to obtain the config keys for your `.env` file.
6. Deploy the security rules defined in `data-model.md` to secure your Firestore collections.

---

## 3. Directory Layout

The application code resides in the following directories:

```text
src/
├── components/          # Reusable UI components
│   ├── AdminDashboard.tsx # Panel to manage pre-approved list & projects
│   ├── CalendarGrid.tsx   # Custom Grid Calendar Component
│   ├── TaskDetailModal.tsx # Modal for creating, viewing, and deleting tasks
│   └── RichTextEditor.tsx # Rich text input for task descriptions
├── services/
│   └── firebase.ts      # Firebase configuration & database query methods
├── App.tsx              # Application layout and routing
├── index.css            # Premium custom CSS properties, base styles, and themes
└── main.tsx             # Entry point
```

---

## 4. Running the Dev Server

To run the application locally in development mode:

```bash
npm run dev
```

The application will run by default on `http://localhost:5173`. Open this URL in your web browser.

---

## 5. Bootstrap Data

To log in for the first time as an Admin:
1. Manually add your test Google email to the `pre_approved_users` Firestore collection using the Firebase Console.
2. Set the `role` field on that document to `"admin"`.
3. Log in via Google Sign-In inside the app. Your profile will be created automatically, and you will have access to the Admin features to manage projects and add additional pre-approved users.
