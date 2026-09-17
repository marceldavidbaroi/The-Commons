/**
 * Stub definitions for Citizen Passport & Member Profile
 */

export interface CitizenPassportData {
  id: string;
  fullName: string | null;
  email: string;
  avatarUrl: string | null;
  citizenTitle: string;
  bio: string;
  folioNumber: string;
  citizenshipTier: "Standard" | "Archivist" | "Founder";
  badges: Array<{ id: string; name: string; icon: string; earnedAt: string }>;
  joinedAt: string;
}

export declare function getPassportProfile(userId: string): Promise<CitizenPassportData | null>;
export declare function updatePassportProfile(userId: string, data: Partial<CitizenPassportData>): Promise<CitizenPassportData>;
