# API Contract: Citizen Passport

## 1. Passport Operations

| Operation | Method / Action | Purpose | Auth |
|---|---|---|---|
| **Get Passport Profile** | `GET /api/passport` or `getPassportAction()` | Returns current user's citizen metadata | Required |
| **Update Passport** | `PATCH /api/passport` or `updatePassportAction(payload)` | Updates user profile and bio | Required |

---

## 2. Payload Shapes

### `updatePassportAction`
- **Request Body**:
  ```json
  {
    "fullName": "Marcus Aurelius",
    "bio": "Philosopher and seeker of quiet sanctuaries.",
    "citizenTitle": "Archival Chronicler"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "data": {
      "id": "c1f727c2-...",
      "fullName": "Marcus Aurelius",
      "bio": "Philosopher and seeker of quiet sanctuaries.",
      "citizenTitle": "Archival Chronicler",
      "folioNumber": "COM-0421",
      "updatedAt": "2026-09-17T12:00:00Z"
    },
    "error": null
  }
  ```
