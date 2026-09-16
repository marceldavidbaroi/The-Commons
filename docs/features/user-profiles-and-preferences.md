# Feature: User Profiles & Sorting Preferences

## Overview
Every registered user in **The Commons** has an isolated profile linked directly to `auth.users`. All user-generated content and data views are sorted according to individual user preferences stored as structured JSONB objects.

---

## Data Model

### Profile Table (`public.profiles`)
- **`id`** (`uuid`): Primary key, foreign key referencing `auth.users(id) on delete cascade`.
- **`email`** (`text`): User's primary email address.
- **`full_name`** (`text`): User's display name.
- **`username`** (`text`, unique): Unique handle.
- **`avatar_url`** (`text`): Profile image URL.
- **`sort_preferences`** (`jsonb`):
  ```json
  {
    "default_sort_by": "created_at",
    "default_sort_order": "desc",
    "filter_favorites_first": true,
    "pinned_items": [],
    "custom_order": []
  }
  ```
- **`email_preferences`** (`jsonb`):
  ```json
  {
    "marketing": false,
    "transactional": true,
    "newsletter": true,
    "product_updates": true,
    "digest_frequency": "weekly"
  }
  ```
- **`display_settings`** (`jsonb`):
  ```json
  {
    "theme": "system",
    "density": "comfortable",
    "view_mode": "grid"
  }
  ```

---

## Key RPC Functions
- `public.get_sorted_user_items(p_status, p_sort_by, p_ascending)`: Dynamically retrieves user-scoped data ordered by preferences.
- `public.reorder_user_items(p_item_ids)`: Atomically updates manual sort order positions.
- `public.update_sort_preferences(p_sort_by, p_sort_order, p_filter_favorites_first)`: Updates the user's default sorting configuration.

---

## Security (RLS)
- Profiles and user data are protected by strict Row Level Security policies using `auth.uid() = id` / `auth.uid() = user_id`.
