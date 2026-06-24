# Data Model Specification: Interactive Project Task Calendar

This document defines the schemas and validation rules for our Firestore database collections.

## Firestore Schema Design

### 1. `pre_approved_users` (Collection)
Contains the emails of users authorized to log in.

- **Document ID**: Email address (e.g., `user@example.com` - lowercased).
- **Fields**:
  - `addedAt`: Timestamp
  - `role`: String (`"admin"` | `"user"`)

*Validation Rules*:
- Email must be valid.
- Role must be either `"admin"` or `"user"`.

---

### 2. `users` (Collection)
Stores profiles of authenticated users. Created on first login.

- **Document ID**: Firebase Auth User UID.
- **Fields**:
  - `uid`: String (same as ID)
  - `email`: String (lowercased)
  - `displayName`: String
  - `photoURL`: String (optional)
  - `role`: String (`"admin"` | `"user"`) - synchronized from `pre_approved_users` on login.
  - `createdAt`: Timestamp
  - `lastLogin`: Timestamp

*Validation Rules*:
- Role must match the role defined in `pre_approved_users`.

---

### 3. `projects` (Collection)
Represents project workspaces.

- **Document ID**: Auto-generated string.
- **Fields**:
  - `id`: String (same as ID)
  - `name`: String (min 1, max 100 characters)
  - `description`: String (optional)
  - `assignedUsers`: Array of Strings (User UIDs or email addresses, depending on preference. Using UIDs is standard. Let's use UIDs).
  - `createdBy`: String (UID of the creator admin)
  - `createdAt`: Timestamp

*Validation Rules*:
- `name` cannot be empty.
- `assignedUsers` must contain valid user UIDs.
- Collaborators can only see documents where their UID is in `assignedUsers`. Admins can see all.

---

### 4. `tasks` (Collection)
Represents tasks scheduled within a project.

- **Document ID**: Auto-generated string.
- **Fields**:
  - `id`: String (same as ID)
  - `projectId`: String (references `projects.id`)
  - `title`: String (min 1, max 150 characters)
  - `dueDate`: Timestamp (or ISO String for calendar alignment)
  - `description`: String (HTML/rich text formatted)
  - `assignedTo`: String (UID of assigned user, optional)
  - `priority`: String (`"high"` | `"medium"` | `"low"`)
  - `labels`: Array of Objects:
    - `text`: String
    - `color`: String (Hex code, e.g., `#FF5733`)
  - `checklist`: Array of Objects:
    - `id`: String
    - `text`: String
    - `completed`: Boolean
  - `createdBy`: String (UID of user who created the task)
  - `createdAt`: Timestamp
  - `updatedAt`: Timestamp

*Validation Rules*:
- `projectId` must reference an existing project.
- `title` cannot be empty.
- `priority` must be one of: `"high"`, `"medium"`, `"low"`.
- User creating/updating/deleting must be assigned to the corresponding project (or be an Admin).
- Only Admins can modify the `assignedTo` field.

---

## Firestore Security Rules (Access Contract)

These rules define the server-side access control contract:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function getUserRole() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role;
    }

    function isAdmin() {
      return isAuthenticated() && getUserRole() == 'admin';
    }

    function isApproved() {
      return isAuthenticated() && 
        exists(/databases/$(database)/documents/pre_approved_users/$(request.auth.token.email));
    }

    // Pre-approved list rules
    match /pre_approved_users/{email} {
      allow read: if isAuthenticated() && isApproved();
      allow write: if isAdmin();
    }

    // User profiles rules
    match /users/{userId} {
      allow read: if isAuthenticated() && isApproved();
      allow create: if isAuthenticated() && 
        exists(/databases/$(database)/documents/pre_approved_users/$(request.auth.token.email)) &&
        request.resource.data.role == get(/databases/$(database)/documents/pre_approved_users/$(request.auth.token.email)).data.role;
      allow update: if isAuthenticated() && (request.auth.uid == userId || isAdmin());
    }

    // Projects rules
    match /projects/{projectId} {
      allow read: if isAdmin() || (isAuthenticated() && isApproved() && request.auth.uid in resource.data.assignedUsers);
      allow write: if isAdmin();
    }

    // Tasks rules
    match /tasks/{taskId} {
      // Helper to check project membership
      function isMemberOfProject(projId) {
        return request.auth.uid in get(/databases/$(database)/documents/projects/$(projId)).data.assignedUsers;
      }

      allow read: if isAdmin() || (isAuthenticated() && isApproved() && isMemberOfProject(resource.data.projectId));
      
      allow create: if isAdmin() || (isAuthenticated() && isApproved() && isMemberOfProject(request.resource.data.projectId));
      
      allow update: if isAdmin() || (isAuthenticated() && isApproved() && isMemberOfProject(resource.data.projectId));
      
      allow delete: if isAdmin() || (isAuthenticated() && isApproved() && isMemberOfProject(resource.data.projectId));
    }
  }
}
```
