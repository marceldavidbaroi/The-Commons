# API Contract: [Feature Name]

> **Document Type**: **A**pplication **P**rogramming **I**nterface (API) Specification & Contract  
> **Purpose**: Serves as the explicit contract between frontend and backend on endpoint signatures, Server Actions, request payloads, response JSON shapes, and error status codes.

---

## 1. Endpoints & Server Actions Overview

| Operation | Type | Function / Route | Description | Auth Required |
|---|---|---|---|---|
| **List Items** | Server Action / Query | `getItemsAction(filters)` | Fetch user's items | Required (`auth.uid()`) |
| **Get Item** | Server Action / Query | `getItemByIdAction(id)` | Fetch single record | Required (`auth.uid()`) |
| **Create Item** | Server Action / Mutation | `createItemAction(payload)` | Create new item | Required (`auth.uid()`) |
| **Update Item** | Server Action / Mutation | `updateItemAction(id, payload)` | Update item | Required (`auth.uid()`) |
| **Delete Item** | Server Action / Mutation | `deleteItemAction(id)` | Remove item | Required (`auth.uid()`) |

---

## 2. Request & Response Specifications

### `createItemAction`
- **Input Payload**:
  ```json
  {
    "title": "My New Entry",
    "status": "draft",
    "metadata": { "tags": ["personal"] }
  }
  ```
- **Success Response (200 / 201)**:
  ```json
  {
    "data": {
      "id": "a4f028fa-6821-4f10-911b-c466487e45ad",
      "userId": "d7486e92-e4fb-4b53-b08e-173f4d6d671f",
      "title": "My New Entry",
      "status": "draft",
      "metadata": { "tags": ["personal"] },
      "createdAt": "2026-09-17T12:00:00.000Z",
      "updatedAt": "2026-09-17T12:00:00.000Z"
    },
    "error": null
  }
  ```
- **Error Response (400 / 500)**:
  ```json
  {
    "data": null,
    "error": {
      "code": "VALIDATION_ERROR",
      "message": "Title is required",
      "details": [{ "field": "title", "message": "Expected string, received empty" }]
    }
  }
  ```
