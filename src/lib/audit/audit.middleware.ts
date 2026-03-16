// lib/audit/audit.middleware.ts

// цепочка выполнения withAudit()
//  
//  ├─ подготовка ctx
//  ├─ loadEntity()
//  ├─ getOldValue()
//  ├─ restoreHandler()
//  │     └─ UPDATE document ...
//  ├─ getNewValue()
//  └─ AuditService.log(...)
import { NextRequest, NextResponse } from "next/server";
import { AuditService } from "./audit.service";
import { AuditAction, AuditEntity } from "@/types/audit";

export type AuditContext = {
  body?: any;
  formData?: FormData;

  entity?: any;   // entity из БД
  result?: any;   // результат операции
};

type AuditConfig = {
  action: AuditAction;
  entityType: AuditEntity;

  skip?: (req: NextRequest) => boolean;

  getEntityId?: (ctx: AuditContext, req: NextRequest) => Promise<string> | string;

  loadEntity?: (entityId: string, ctx: AuditContext) => Promise<any>;

  getSiteId?: (ctx: AuditContext, req: NextRequest) => Promise<string | null> | string | null;
  getStudyId?: (ctx: AuditContext, req: NextRequest) => Promise<string | null> | string | null;

  getOldValue?: (ctx: AuditContext, req: NextRequest) => Promise<any> | any;
  getNewValue?: (ctx: AuditContext, req: NextRequest) => Promise<any> | any;
};

export function withAudit(
  config: AuditConfig,
  handler: (req: NextRequest, ctx: AuditContext) => Promise<NextResponse>
) {
  return async function (req: NextRequest) {

    if (config.skip?.(req)) {
      return handler(req, {});
    }

    const metadata = AuditService.extractMetadata(req);
    const user = AuditService.getUserFromRequest(req);

    const ctx: AuditContext = {};

    const contentType = req.headers.get("content-type") || "";

    try {
      if (contentType.includes("application/json")) {
        ctx.body = await req.json();
      }

      if (contentType.includes("multipart/form-data")) {
        ctx.formData = await req.formData();
      }
    } catch {
      // body optional
    }

    let entityId = "0";
    let siteId: string | null = null;
    let studyId: string | null = null;

    if (config.getEntityId) {
      entityId = String((await config.getEntityId(ctx, req)) ?? "0");
    }

    // 🔹 ONE DB QUERY
    if (config.loadEntity) {
      ctx.entity = await config.loadEntity(entityId, ctx);
    }

    if (config.getSiteId) {
      siteId = await config.getSiteId(ctx, req);
    }

    if (config.getStudyId) {
      studyId = await config.getStudyId(ctx, req);
    }

    let oldValue = null;

    if (config.getOldValue) {
      try {
        oldValue = await config.getOldValue(ctx, req);
      } catch (err) {
        console.error("Audit oldValue error", err);
      }
    }

    const start = Date.now();

    try {

      const response = await handler(req, ctx);

      let newValue = null;

      if (config.getNewValue) {
        newValue = await config.getNewValue(ctx, req);
      }

      // 🔹 fire-and-forget audit
      void AuditService.log({
        user_id: user.user_id?.toString() || "",
        user_email: user.user_email || "",
        user_role: user.user_role || [],

        ...metadata,

        action: config.action,
        entity_type: config.entityType,
        entity_id: entityId,

        old_value: oldValue,
        new_value: newValue,

        status: response.status < 400 ? "SUCCESS" : "FAILURE",
        error_message: "",

        site_id: siteId,
        study_id: studyId,
      }).catch(console.error);

      return response;

    } catch (error: any) {

      void AuditService.log({
        user_id: user.user_id?.toString() || "",
        user_email: user.user_email || "",
        user_role: user.user_role || [],

        ...metadata,

        action: config.action,
        entity_type: config.entityType,
        entity_id: entityId,

        old_value: oldValue,
        new_value: null,

        status: "FAILURE",
        error_message: error.message || "Unknown error",

        site_id: siteId,
        study_id: studyId,
      }).catch(console.error);

      throw error;

    } finally {

      const duration = Date.now() - start;

      console.log(
        `[AUDIT] ${config.action} ${config.entityType}:${entityId} ${duration}ms`
      );
    }
  };
}