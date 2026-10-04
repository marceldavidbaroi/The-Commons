# API Contract: Goals & Objectives Ledger

## 1. Overview & Protocol Standards
- **Data Access Layer**: Direct Supabase client queries with PostgreSQL Row Level Security (RLS) enforcing strict tenant isolation (`user_id = (select id from profiles where auth_user_id = auth.uid())`).
- **Identifier Strategy**: Goals use **Integer IDs (`id: bigint`)**. Tags use numeric identifiers (`BIGINT` / `number`).
- **Client Cache & State**: Managed exclusively via `@tanstack/react-query` v5 with optimistic updates and selective cache invalidation.
- **Hierarchy Handling**: Parent-child recursion is modeled via `parent_id REFERENCES goals(id) ON DELETE CASCADE`. Top-level goals have `parent_id IS NULL`.

---

## 2. API Operations Matrix

| Operation | Protocol / Method | Target | Scope | Description |
|---|---|---|---|---|
| **Fetch Goals Tree / List** | Direct `SELECT` | `goals` joined with `goal_tags(tags)` and child `goals` | User / Filters | Retrieves active goals, optionally filtered by status, priority, type, or parent ID. |
| **Fetch Goal By ID** | Direct `SELECT` | `goals` joined with `goal_tags(tags)` and recursive sub-goals | User / Goal ID | Retrieves a single goal with full description, audit timestamps, and child sub-goals. |
| **Create Goal** | Direct `INSERT` | `goals` + `goal_tags` | User | Creates a new root or sub-goal and associates selected tags. |
| **Update Goal** | Direct `UPDATE` | `goals` | User | Updates title, description, type, priority, or dates by integer `id`. |
| **Update Goal Status** | Direct `UPDATE` | `goals` | User | Transitions status; auto-stamps `achieved_at` or `cancelled_at` & `cancel_reason`. |
| **Delete Goal** | Direct `DELETE` | `goals` | User | Deletes goal and cascades deletion to child sub-goals and `goal_tags`. |
| **Sync Goal Tags** | Direct Batch | `goal_tags` | User | Atomically replaces or synchronizes numeric tag IDs assigned to a goal. |

---

## 3. Query & Mutation Details

### 3.1 Fetch Goals (Filtered & Tag-Joined)

#### Query
```typescript
let query = supabase
  .from("goals")
  .select(`
    *,
    tags:goal_tags(
      tag:tags(
        id,
        name,
        color,
        category:tag_categories(id, name, color)
      )
    ),
    subgoals:goals!parent_id(
      id,
      title,
      type,
      status,
      priority,
      due_date,
      created_at
    )
  `)
  .order("created_at", { ascending: false });

if (filters.parent_id !== undefined) {
  if (filters.parent_id === null) {
    query = query.is("parent_id", null);
  } else {
    query = query.eq("parent_id", filters.parent_id);
  }
}
if (filters.status) query = query.eq("status", filters.status);
if (filters.priority) query = query.eq("priority", filters.priority);
if (filters.type) query = query.eq("type", filters.type);

const { data, error } = await query;
```

#### Response Payload (`200 OK`)
```json
[
  {
    "id": 101,
    "user_id": 1,
    "parent_id": null,
    "title": "Establish Archival Library Index",
    "description": "Index all historical broadsides and citizen folios.",
    "type": "milestone",
    "status": "in_progress",
    "priority": "high",
    "start_date": "2026-10-01T00:00:00Z",
    "due_date": "2026-12-31T23:59:59Z",
    "achieved_at": null,
    "cancelled_at": null,
    "cancel_reason": null,
    "created_at": "2026-09-20T10:00:00Z",
    "updated_at": "2026-09-20T10:00:00Z",
    "tags": [
      {
        "tag": {
          "id": 101,
          "name": "Research",
          "color": "#3B82F6",
          "category": { "id": 1, "name": "Context", "color": "#3B82F6" }
        }
      }
    ],
    "subgoals": [
      {
        "id": 102,
        "title": "Catalogue Volume I",
        "type": "weekly",
        "status": "completed",
        "priority": "normal",
        "due_date": "2026-10-15T00:00:00Z",
        "created_at": "2026-09-20T11:00:00Z"
      }
    ]
  }
]
```

---

### 3.2 Create Goal with Tag Associations

#### Payload
```json
{
  "title": "Draft Constitution Preface",
  "description": "Formulate principles for citizen registry.",
  "parent_id": 101,
  "type": "monthly",
  "status": "draft",
  "priority": "critical",
  "start_date": "2026-10-05T09:00:00Z",
  "due_date": "2026-10-31T18:00:00Z",
  "tag_ids": [101, 104]
}
```

---

### 3.3 Status Transition Mutations

```typescript
export async function updateGoalStatus(
  goalId: number,
  status: GoalStatus,
  cancelReason?: string | null
): Promise<GoalRow> {
  const updates: Partial<GoalRow> = { status };

  if (status === "completed") {
    updates.achieved_at = new Date().toISOString();
    updates.cancelled_at = null;
    updates.cancel_reason = null;
  } else if (status === "cancelled") {
    updates.cancelled_at = new Date().toISOString();
    updates.cancel_reason = cancelReason ?? null;
  } else {
    updates.achieved_at = null;
    updates.cancelled_at = null;
    updates.cancel_reason = null;
  }

  const { data, error } = await supabase
    .from("goals")
    .update(updates)
    .eq("id", goalId)
    .select()
    .single();

  if (error) throw error;
  return data;
}
```

---

### 3.4 Sync Goal Tags

```typescript
export async function syncGoalTags(
  goalId: number,
  tagIds: number[]
): Promise<void> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .single();
  if (!profile) throw new Error("Unauthorized");

  // 1. Delete existing tags for goal
  const { error: deleteError } = await supabase
    .from("goal_tags")
    .delete()
    .eq("goal_id", goalId);

  if (deleteError) throw deleteError;

  // 2. Insert new tags
  if (tagIds.length > 0) {
    const rows = tagIds.map((tagId) => ({
      goal_id: goalId,
      tag_id: tagId,
      user_id: profile.id,
    }));

    const { error: insertError } = await supabase
      .from("goal_tags")
      .insert(rows);

    if (insertError) throw insertError;
  }
}
```
