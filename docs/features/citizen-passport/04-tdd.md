# Technical Design Document: Citizen Passport

## 1. System Architecture

```mermaid
graph TD
    PassportPage[/citizen-passport] --> Hook[usePassportProfileQuery]
    Hook --> SupabaseClient[Supabase Profiles Table]
    SettingsPage[/settings] --> Mutation[useUpdateProfileMutation]
    Mutation --> Toast[Feedback Notification]
```

## 2. Component Hierarchy & File Mapping

```text
src/
├── app/
│   ├── citizen-passport/
│   │   └── page.tsx                   # Visual passport page
│   └── settings/
│       └── page.tsx                   # User settings & preferences
├── components/
│   └── passport/
│       ├── PassportCard.tsx           # Passport identity card
│       └── PassportSkeleton.tsx       # Skeleton loading card
└── hooks/
    └── queries/
        └── use-profile.ts             # Profile TanStack query hooks
```
