/**
 * Document Type: TypeScript Type Definitions & Function Stubs
 * Purpose: Provides concrete TypeScript type targets and declared function headers
 * so code can be written with 100% type safety without guessing object shapes.
 */

// When implementing, import generated database types:
// import type { Database } from "@/types/supabase";

// 1. Database Row & Insert Types
export type FeatureRow = Record<string, unknown>; // Replace with: Database["public"]["Tables"]["<table_name>"]["Row"];
export type FeatureInsert = Record<string, unknown>; // Replace with: Database["public"]["Tables"]["<table_name>"]["Insert"];
export type FeatureUpdate = Record<string, unknown>; // Replace with: Database["public"]["Tables"]["<table_name>"]["Update"];

// 2. Client UI Filter & Store State
export interface FeatureUIState {
  searchQuery: string;
  isCreateModalOpen: boolean;
  activeFilter: "all" | "active" | "archived";
  setSearchQuery: (query: string) => void;
  setCreateModalOpen: (isOpen: boolean) => void;
  setActiveFilter: (filter: "all" | "active" | "archived") => void;
}

// 3. API Response Container
export interface ApiResponse<T> {
  data: T | null;
  error: {
    code: string;
    message: string;
    details?: unknown;
  } | null;
}

// 4. Data Layer Function Signatures (To be implemented)
export declare function fetchFeatureItems(userId: string): Promise<ApiResponse<FeatureRow[]>>;
export declare function createFeatureItem(payload: FeatureInsert): Promise<ApiResponse<FeatureRow>>;
export declare function updateFeatureItem(id: string, payload: FeatureUpdate): Promise<ApiResponse<FeatureRow>>;
export declare function deleteFeatureItem(id: string): Promise<ApiResponse<void>>;
