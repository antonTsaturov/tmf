// lib/security/permissions.ts

import { ActionRoleMap } from "@/domain/document/document.policy";
import { DocumentAction } from "@/types/document";
import { UserAccess, UserRole } from "@/types/user";
import { logger } from "../utils/logger";

export class ForbiddenError extends Error {
  constructor() {
    super("FORBIDDEN");
  }
}

export function hasPermission(
  roles: UserRole[] = [],
  action: DocumentAction
): boolean {

  const normalizedRoles = roles.map(r => r.toUpperCase());

  const allowedRoles = (ActionRoleMap[action] || [])
    .map(r => r.toUpperCase());

  return normalizedRoles.some(role =>
    allowedRoles.includes(role)
  );
}

export function requirePermission(
  roles: UserRole[] = [],
  action: DocumentAction
) {

  const allowed = hasPermission(roles, action);

  if (!allowed) {
    logger.info("[requirePermission]: FORBIDDEN");
    throw new Error("FORBIDDEN");
  }
}

export function assertCountryAccess(
  user: UserAccess,
  studyId: number,
  country?: string | null
) {

  if (!country) return;

  if (user.role.includes(UserRole.ADMIN)) {
    return;
  }

  const map = user.assigned_country_by_study || {};

  const allowedCountries = map[Number(studyId)] || [];

  if (!allowedCountries.includes(country)) {
    logger.info("[assertCountryAccess]: FORBIDDEN");
    throw new ForbiddenError();
  }
}

export function assertSiteAccess(
  user: UserAccess,
  siteId?: number | null
) {

  if (!siteId) return;

  if (user.role.includes("admin")) {
    return;
  }

  const allowedSites = user.assigned_site_id || [];

  if (!allowedSites.includes(siteId)) {
    logger.info("[assertSiteAccess]: FORBIDDEN");
    throw new ForbiddenError();
  }
}

export function assertStudyAccess(
  user: UserAccess,
  studyId: number
) {

  // ADMIN видит всё
  if (user.role.includes("admin")) {
    return;
  }

  const allowedStudies = user.assigned_study_id || [];

  if (!allowedStudies.includes(studyId)) {
    logger.info("[assertStudyAccess]: FORBIDDEN");
    throw new ForbiddenError();
  }
}