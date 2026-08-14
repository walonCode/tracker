/** The 4 fixed, seeded-once domains. No domain-creation UI/path exists — see AGENTS/task brief. */
export type DomainKey = "daily" | "finance" | "projects" | "others";

export interface Domain {
  id: number;
  key: DomainKey;
  label: string;
  color: string;
  icon: string | null;
  sortOrder: number;
  isSystem: boolean;
  createdAt: string;
}
