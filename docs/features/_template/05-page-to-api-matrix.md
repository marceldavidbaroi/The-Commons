# Page-to-API Matrix: [Feature Name]

> [!NOTE]
> This matrix provides an exhaustive, 1-to-1 mapping between every Page Route, UI View, Tab, Component, and the underlying API/RPC endpoint, Server Action, TanStack Query hook, and in-memory cache synchronization behavior for **[Feature Name]**.

---

## 🗺️ 1. Page-to-API Mapping Matrix

| Page Route | View / Tab | Component | User Trigger / Event | Target API / RPC / Action | Method | TanStack Query Hook / Store Action | Cache & Store Strategy (Zero-Redundant-Calls) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `/[feature-root]` | **Primary List / Gallery** | `[Feature]ListPage`<br/>`[Feature]ListHeader` | Page Mount (Initial Load) | `get_[feature]_list(p_limit, p_offset)` or `get_[feature]_overview()` | `POST` (RPC) / `GET` | `use[Feature]Overview()` or `use[Feature]ListQuery()` | Fetches initial collection + summary aggregates in **1 unified call**. Cached under `['[feature]', 'overview']`. |
| `/[feature-root]` | **Pagination / Infinite Scroll** | `[Feature]LoadMoreButton` | Click "Load More" / Scroll Trigger | `get_[feature]_list(limit, nextOffset)` | `POST` (RPC) / `GET` | `useInfinite[Feature]Query.fetchNextPage()` | Appends next page items to cache pages array without re-fetching summary analytics. |
| `/[feature-root]` | **Item Creation Modal** | `Create[Item]Modal` | Submit New Item Form | `create_[item](payload)` | `POST` (RPC / Table) | `useCreate[Item]Mutation()` | **Zero refetch**. Optimistically creates in Zustand store, calls API, and directly prepends to `['[feature]', 'overview']` cache via `setQueryData`. |
| `/[feature-root]` | **Item Quick Edit** | `Edit[Item]Modal` | Submit Edit Form | `supabase.from('[items]').update(...)` | `PATCH` (Table) | `useUpdate[Item]Mutation()` | **Zero refetch**. Surgically updates matching item in-place across cached lists and local store in `setQueryData`. |
| `/[feature-root]` | **Item Deletion** | `Delete[Item]Dialog` | Confirm Item Deletion | `supabase.from('[items]').delete().eq('id', id)` | `DELETE` (Table) | `useDelete[Item]Mutation()` | **Zero refetch**. Filters out deleted item across cached pages, decrements total count in memory. |
| `/[feature-root]` | **Drag & Drop Reorder** | `[Feature]Grid` | Drag & Drop Item Card | `reorder_[items](p_item_ids)` | `POST` (RPC) | `useReorder[Items]Mutation()` | Optimistically reorders array in cache and Zustand; persists array of UUIDs via batch RPC. |
| `/[feature-root]/[id]` | **Item Details View** | `[Feature]DetailsPage` | Page Mount / Tab Select | `supabase.from('[items]').select('*').eq('id', id)` | `GET` (Table) | `use[Item]DetailsQuery(id)` | Fetches complete record metadata. Cached under `['[feature]', 'detail', id]`. |
| `/[feature-root]/[id]` | **Interactive Tab Switch** | `[Feature]Tabs` | Click Tab (e.g. Overview \| Content \| History) | None (In-memory or isolated sub-query) | Client / `GET` | `setActiveTab(tab)` / `use[SubResource]Query(id)` | Tab state managed in Zustand; sub-resource queries isolated to prevent re-fetching main entity. |
| `/[feature-root]/[id]` | **Real-time / Debounced Autosave** | `[Feature]EditorCanvas` | Debounced text/input edit | `supabase.from('[items]').update(updates)` | `PATCH` (Table) | `useSave[Item]Mutation(id)` | **Zero refetch**. In-place updates active entity in `setQueryData`, sets `isDirty: false` on resolve. |
| `/[feature-root]/[id]` | **Toggle Bookmark / Favorite** | `[Feature]DetailsPage` | Click Star/Heart Icon | `supabase.from('[items]').update({ is_favorite })` | `PATCH` (Table) | `useToggleFavoriteMutation(id)` | **Zero refetch**. In-place toggles `isFavorite` flag across details and overview list caches. |
| `/[feature-root]/[id]` | **Child Item Addition** | `AddChildModal` / Button | Click "Add Child / Step" | `create_[child_item](payload)` | `POST` (RPC / Table) | `useCreateChildMutation(id)` | Appends new child to active item's children cache; increments child count badge. |
| `/[feature-root]/[id]` | **Child Item Deletion** | `ChildItemRow` | Click Delete on child | `supabase.from('[child_items]').delete().eq('id', childId)` | `DELETE` (Table) | `useDeleteChildMutation(id)` | Removes child row from cache array; decrements child count in parent stats. |

---

## 🔄 2. Client State & Store Matrix (Zustand: `use[Feature]Store`)

| Store State Variable | Modifying Action | Affected Views | Purpose |
| :--- | :--- | :--- | :--- |
| `items` | `setItems(items)`<br/>`addItem(item)`<br/>`updateItem(id, updates)`<br/>`removeItem(id)` | List/Gallery views, Search bars | In-memory reactive collection with local storage persistence fallback. |
| `activeItemId` | `setActiveItemId(id: string \| null)` | Details views, Navigation sidebars | Tracks currently selected active item for navigation and breadcrumbs. |
| `activeTab` | `setActiveTab(tab: string)` | Detail tabs, Sub-panels | Controls active panel without unmounting or discarding cached query data. |
| `isDirty` | `setIsDirty(boolean)` | Autosave status indicator | Displays "Saving..." while editing and "Saved" on mutation resolution. |
| `searchQuery` | `setSearchQuery(string)` | List/Table search bar | Real-time client-side substring filter for instant search feedback. |
| `activeFilter` | `setActiveFilter(filter: string)` | Filter pill bar | Quick-filter category or status selector. |
| `sortBy` | `setSortBy(sortOption)` | List header, Sort dropdown | Controls active sorting order (newest, alphabetical, priority). |
| `viewMode` | `setViewMode('grid' \| 'list')` | Gallery layout | Toggles between card grid and compact table/list views. |
| `isCreateModalOpen` | `setCreateModalOpen(boolean)` | Create item modal | Controls visibility of creation dialog. |
| `isEditModalOpen` | `setEditModalOpen(boolean, id)` | Edit item modal | Controls visibility of editing dialog. |
| `isDeleteDialogOpen` | `setDeleteDialogOpen(boolean, id)` | Delete confirmation modal | Controls visibility of deletion prompt. |

---

## ⚡ 3. Cache & Store Synchronization Guidelines

1. **Zero Redundant Refetches**: Never execute `queryClient.invalidateQueries` for simple CRUD operations. Always perform in-place cache updates via `queryClient.setQueryData` or `queryClient.setQueriesData`.
2. **Unified Key Factories**: Keep query keys predictable using an exported key factory:
   ```typescript
   export const featureKeys = {
     all: ['[feature]'] as const,
     overview: () => [...featureKeys.all, 'overview'] as const,
     lists: () => [...featureKeys.all, 'list'] as const,
     detail: (id: string) => [...featureKeys.all, 'detail', id] as const,
   };
   ```
3. **Atomic Zustand Selectors**: Always extract state using fine-grained selectors (e.g. `const isDirty = useFeatureStore((s) => s.isDirty)`) to avoid redundant component re-renders.
