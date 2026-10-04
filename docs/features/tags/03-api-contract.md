# API Contract: Tag Categories & Universal Tagging System

## 1. Overview & Protocol Standards
- **Data Access Layer**: Direct Supabase client queries with PostgreSQL Row Level Security (RLS) for standard CRUD operations and entity junction mutations.
- **Identifier Strategy**: Tag Categories and Tags use **Numeric Identifiers (`BIGINT` / `number`)**, while system entities (documents, diary entries, users) use UUIDs.
- **Client Cache & State**: Managed exclusively via `@tanstack/react-query` v5 hooks with zero redundant network refetches (no Zustand stores).
- **Authentication**: JWT Bearer token supplied automatically via `@supabase/ssr` with active session isolation (`auth.uid() = user_id`).
- **Feature Scoping**: Tag categories support a `feature` dimension (e.g. `'diary'`, `'document'`, `'general'`) allowing features to organize and declare their tag spaces.

---

## 2. API Endpoints & Operations Matrix

| Operation | Protocol / Method | Target | Scope | Description |
|---|---|---|---|---|
| **Fetch All Grouped Tags** | Direct `SELECT` | `tag_categories` joined with `tags` | User / Feature | Loads all categories and their child tags ordered by `display_order`, optionally filtered by `feature`. |
| **Create Tag Category** | Direct `INSERT` | `tag_categories` | User | Creates a new custom tag category with auto-generated numeric ID and target feature scope. |
| **Update Tag Category** | Direct `UPDATE` | `tag_categories` | User | Updates category name, color, display order, or feature by numeric `id`. |
| **Delete Tag Category** | Direct `DELETE` | `tag_categories` | User | Deletes category with cascade deletion of child tags by numeric `id`. |
| **Create Tag** | Direct `INSERT` | `tags` | User | Creates a new tag under a specific numeric `category_id`. |
| **Update Tag** | Direct `UPDATE` | `tags` | User | Updates tag name, color override, or category assignment by numeric `id` (non-system tags only; enforced by RLS). |
| **Delete Tag** | Direct `DELETE` | `tags` | User | Deletes tag and cascades removal from all junction tables by numeric `id` (non-system tags only; enforced by RLS). |
| **Fetch Entity Tags** | Direct `SELECT` | `diary_entry_tags` / `document_tags` joined with `tags` | User | Retrieves all tags assigned to a specific diary entry or document. |
| **Assign Tag to Entity** | Direct `INSERT` | `diary_entry_tags` / `document_tags` | User | Assigns a numeric tag ID to an entity UUID. |
| **Remove Tag from Entity** | Direct `DELETE` | `diary_entry_tags` / `document_tags` | User | Unassigns a tag from an entity UUID. |
| **Sync Entity Tags** | Direct Batch | `diary_entry_tags` / `document_tags` | User | Atomically replaces or syncs the complete numeric tag list for an entity. |
| **Provision Feature Tag Categories** | Database `RPC` | `provision_feature_tag_categories(p_feature)` | User | On-demand provisioning RPC called when a feature requests its tag categories. |

---

## 3. Detailed Request & Response Formats

### 3.1 Fetch Grouped Tag Categories & Tags

#### Query
```typescript
let query = supabase
  .from("tag_categories")
  .select("*, tags(*)")
  .order("display_order", { ascending: true })
  .order("name", { foreignTable: "tags", ascending: true });

if (feature) {
  query = query.eq("feature", feature);
}
const { data, error } = await query;
```

#### Success Response (`200 OK`)
```json
[
  {
    "id": 1,
    "user_id": "9f26cf9d-25f0-45fa-b6ea-73ecdb3cf286",
    "feature": "diary",
    "name": "Context",
    "color": "#3B82F6",
    "display_order": 1,
    "is_system": false,
    "created_at": "2026-09-20T10:00:00Z",
    "updated_at": "2026-09-20T10:00:00Z",
    "tags": [
      {
        "id": 101,
        "category_id": 1,
        "user_id": "9f26cf9d-25f0-45fa-b6ea-73ecdb3cf286",
        "name": "Deep Work",
        "color": null,
        "created_at": "2026-09-20T10:00:00Z",
        "updated_at": "2026-09-20T10:00:00Z"
      },
      {
        "id": 102,
        "category_id": 1,
        "user_id": "9f26cf9d-25f0-45fa-b6ea-73ecdb3cf286",
        "name": "Meetings",
        "color": "#60A5FA",
        "created_at": "2026-09-20T10:00:00Z",
        "updated_at": "2026-09-20T10:00:00Z"
      }
    ]
  }
]
```

---

### 3.2 Create Category

#### Request Payload
```json
{
  "feature": "diary",
  "name": "Energy Level",
  "color": "#10B981",
  "display_order": 2
}
```

#### Response (`201 Created`)
```json
{
  "id": 2,
  "user_id": "9f26cf9d-25f0-45fa-b6ea-73ecdb3cf286",
  "feature": "diary",
  "name": "Energy Level",
  "color": "#10B981",
  "display_order": 2,
  "is_system": false,
  "created_at": "2026-09-20T11:00:00Z",
  "updated_at": "2026-09-20T11:00:00Z"
}
```

---

### 3.3 Create Tag Under Category

#### Request Payload
```json
{
  "category_id": 2,
  "name": "High Vitality",
  "color": "#34D399"
}
```

#### Response (`201 Created`)
```json
{
  "id": 201,
  "category_id": 2,
  "user_id": "9f26cf9d-25f0-45fa-b6ea-73ecdb3cf286",
  "name": "High Vitality",
  "color": "#34D399",
  "created_at": "2026-09-20T11:05:00Z",
  "updated_at": "2026-09-20T11:05:00Z"
}
```

---

### 3.4 Sync Entity Tags

#### Request Payload
```json
{
  "entity_id": "8b515b6d-a2f2-498c-9c02-e22eef8dc084",
  "entity_type": "diary_entry",
  "tag_ids": [101, 201]
}
```

#### Response (`200 OK`)
```json
{
  "success": true
}
```

---

### 3.5 Provision Feature Tag Categories RPC (`provision_feature_tag_categories`)

#### Query / Call
```typescript
const { data, error } = await supabase.rpc("provision_feature_tag_categories", {
  p_feature: "diary",
});
```

#### Response (`200 OK`)
```json
{
  "success": true,
  "feature": "diary",
  "provisioned": true
}
```

---

## 4. Error Code Dictionary

| HTTP Code | Error Code | Description | Mitigation Strategy |
|---|---|---|---|
| `400 Bad Request` | `23505 (unique_violation)` | Duplicate category name or tag name within category. | Display inline validation error message to the user. |
| `401 Unauthorized` | `42501 (insufficient_privilege)` | User is not logged in. | Redirect user to `/login` via auth middleware. |
| `404 Not Found` | `PGRST116` | Tag or category not found or belongs to another user. | Show toast notification indicating the item no longer exists. |
| `409 Conflict` | `23503 (foreign_key_violation)` | Attempted to assign non-existent numeric tag ID. | Re-fetch categories before mutation. |
