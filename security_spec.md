# Security Spec: World Explorer

## Data Invariants
1. A location must have a valid name, description, image URL, and continent.
2. A location must be associated with a valid user ID.
3. Users can only update or delete locations they created.
4. Timestamps (createdAt, updatedAt) must be set by the server.
5. All IDs and strings must be size-constrained to prevent "Denial of Wallet" attacks.

## The "Dirty Dozen" Payloads (Denial Tests)
1. Creating a location without being signed in.
2. Creating a location with a `userId` that doesn't match the authenticated user.
3. Updating a location created by a different user.
4. Updating immutable fields like `createdAt` or `userId`.
5. Injecting a massive string (e.g., 2MB) into the `description` field.
6. Using an invalid continent name (e.g., "Middle Earth").
7. Setting `createdAt` to a client-side timestamp instead of `request.time`.
8. Updating `updatedAt` to a past timestamp.
9. Deleting a location without being signed in.
10. Deleting a location created by another user.
11. Bypassing `isValidId` and using a 2KB string as a document ID.
12. Creating a location with missing required fields (e.g., no `imageUrl`).

## Rules Implementation Strategy
- Use `isValidLocation` helper for all writes.
- Use `isValidId` for document ID protection.
- Enforce `affectedKeys().hasOnly()` for updates to prevent shadow field injection.
- Split update logic into "Edit Content" action.
- Deny all by default.
