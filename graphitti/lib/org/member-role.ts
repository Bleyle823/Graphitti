export type OrgRole = "owner" | "admin" | "member";

const ROLE_RANK: Record<OrgRole, number> = {
  member: 0,
  admin: 1,
  owner: 2,
};

export function isOrgRole(value: string | null | undefined): value is OrgRole {
  return value === "owner" || value === "admin" || value === "member";
}

export function hasMinimumOrgRole(
  role: string | null | undefined,
  minimum: OrgRole
): boolean {
  if (!isOrgRole(role)) {
    return false;
  }
  return ROLE_RANK[role] >= ROLE_RANK[minimum];
}

export function canManageTreasury(role: string | null | undefined): boolean {
  return hasMinimumOrgRole(role, "admin");
}

export function canApproveIntents(role: string | null | undefined): boolean {
  return hasMinimumOrgRole(role, "admin");
}
