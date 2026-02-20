import { DocumentAction } from "@/types/document";
import { UserRole } from "@/types/types";

// Маппинг: для каждого действия список разрешенных ролей
export const ActionRoleMap: Record<DocumentAction, UserRole[]> = {
    [DocumentAction.SUBMIT_FOR_REVIEW]: [
        UserRole.MONITOR,
        UserRole.ADMIN
    ],

    [DocumentAction.APPROVE]: [
        UserRole.STUDY_MANAGER,
        UserRole.ADMIN
    ],

    [DocumentAction.REJECT]: [
        UserRole.STUDY_MANAGER,
        UserRole.ADMIN
    ],

    [DocumentAction.SOFT_DELETE]: [
        UserRole.STUDY_MANAGER,
        UserRole.ADMIN
    ],

    [DocumentAction.RESTORE]: [
        UserRole.ADMIN
    ],

    [DocumentAction.ARCHIVE]: [
        UserRole.STUDY_MANAGER,
        UserRole.ADMIN
    ],

    [DocumentAction.UNARCHIVE]: [
        UserRole.ADMIN
    ],

    [DocumentAction.UPLOAD_NEW_VERSION]: [
        UserRole.MONITOR,
        UserRole.ADMIN
    ],

    [DocumentAction.VIEW]: [
        UserRole.ADMIN,
        UserRole.STUDY_MANAGER,
        UserRole.MONITOR,
        UserRole.DATA_MANAGER,
        UserRole.INVESTIGATOR,
        UserRole.COORDINATOR,
        UserRole.AUDITOR,
        UserRole.QUALITY_ASSURANCE,
        UserRole.READ_ONLY
    ],

    [DocumentAction.DOWNLOAD]: [
        UserRole.ADMIN,
        UserRole.STUDY_MANAGER,
        UserRole.MONITOR,
        UserRole.DATA_MANAGER,
        UserRole.INVESTIGATOR,
        UserRole.COORDINATOR,
        UserRole.AUDITOR,
        UserRole.QUALITY_ASSURANCE,
        UserRole.READ_ONLY
    ],
    [DocumentAction.CREATE_DOCUMENT]: [
        UserRole.ADMIN,
        UserRole.STUDY_MANAGER,
        UserRole.MONITOR,
        UserRole.DATA_MANAGER,
        UserRole.INVESTIGATOR,
        UserRole.COORDINATOR,
    ]
};