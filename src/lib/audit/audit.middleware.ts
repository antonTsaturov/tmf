// import { NextRequest, NextResponse } from 'next/server';
// import { AuditService } from './audit.service';
// import { AuditAction, AuditEntity, AuditStatus } from '@/types/types';

// export interface AuditConfig {
//   action: AuditAction;
//   entityType: AuditEntity;
//   getEntityId?: (req: NextRequest, body?: any) => number;
//   getSiteId?: (req: NextRequest, body?: any) => number | string;
//   getStudyId?: (req: NextRequest, body?: any) => number | string;
//   getOldValue?: (req: NextRequest, body?: any) => Promise<Record<string, unknown> | null>;
//   getNewValue?: (req: NextRequest, body?: any) => Record<string, unknown> | null;
//   skip?: (req: NextRequest) => boolean;
// }

// export function withAudit(config: AuditConfig) {
//   return async function auditMiddleware(
//     req: NextRequest,
//     handler: (preloadedData?: any) => Promise<NextResponse>,
//     preloadedData?: any
//   ) {
//     // Пропускаем аудит если нужно
//     if (config.skip?.(req)) {
//       return handler();
//     }

//     const metadata = AuditService.extractMetadata(req);
//     const user = AuditService.getUserFromRequest(req);
    
//     let oldValue: Record<string, unknown> | null = null;
//     let entityId: number = 0;
//     let siteId: string | number = '';
//     let studyId: string | number = '';
//     let requestBody: any = preloadedData || null;

//     // НЕ читаем request.json() здесь - ожидаем что данные переданы через handler
//     // или получаем из config.getEntityId/getStudyId/getSiteId

//     // Получаем ID сущности
//     if (config.getEntityId) {
//       entityId = config.getEntityId(req, requestBody);
//     } else {
//       const urlParts = req.nextUrl.pathname.split('/');
//       const lastPart = urlParts[urlParts.length - 1];
//       entityId = !isNaN(Number(lastPart)) ? Number(lastPart) : 0;
//     }

//     // Получаем site_id и study_id
//     if (config.getSiteId) {
//       siteId = config.getSiteId(req, requestBody);
//     }
    
//     if (config.getStudyId) {
//       studyId = config.getStudyId(req, requestBody);
//     }

//     // Получаем старое значение для UPDATE/DELETE
//     if (config.getOldValue && entityId) {
//       try {
//         oldValue = await config.getOldValue(req, requestBody);
//       } catch (error) {
//         console.error('Failed to get old value:', error);
//       }
//     }

//     // Выполняем основной обработчик
//     const startTime = Date.now();
//     let response: NextResponse;
//     let errorMessage = '';

//     try {
//       // Передаем requestBody в handler если он есть
//       response = await handler(requestBody);
      
//       if (response.status < 400) {
//         let newValue: Record<string, unknown> | null = null;
        
//         if (config.getNewValue) {
//           newValue = config.getNewValue(req, requestBody);
//         } else if (requestBody) {
//           newValue = requestBody;
//         }

//         //  Если это создание документа, пытаемся вытащить ID из тела ответа
//         if (config.action === 'CREATE' && entityId === 0) {
//           try {
//             const responseClone = response.clone();
//             const resBody = await responseClone.json();
//             if (resBody && (resBody.id || resBody.document_id)) {
//               entityId = resBody.id || resBody.document_id;
//             }
//           } catch (e) {
//             console.error('[AUDIT] Failed to extract ID from response:', e);
//           }
//         }        

//         // Приводим все поля к правильным типам
//         await AuditService.log({
//           // Преобразуем user поля в строки где нужно
//           user_id: user.user_id?.toString() || '',
//           user_email: user.user_email || '',
//           user_role: user.user_role || [],
          
//           ...metadata,
          
//           action: config.action,
//           entity_type: config.entityType,
//           entity_id: entityId.toString(), // Преобразуем number в string
//           old_value: oldValue,
//           new_value: newValue,
//           status: 'SUCCESS',
//           error_message: '',
//           reason: requestBody?.reason,
//           site_id: siteId,
//           study_id: studyId
//         });
//       } else {
//         let responseData;
//         try {
//           const clone = response.clone();
//           responseData = await clone.json();
//         } catch {
//           responseData = {};
//         }
        
//         errorMessage = responseData.error || 'Request failed';
        
//         await AuditService.log({
//           // Преобразуем user поля в строки где нужно
//           user_id: user.user_id?.toString() || '',
//           user_email: user.user_email || '',
//           user_role: user.user_role || [],
          
//           ...metadata,
          
//           action: config.action,
//           entity_type: config.entityType,
//           entity_id: entityId.toString(), // Преобразуем number в string
//           old_value: oldValue,
//           new_value: null,
//           status: 'FAILURE',
//           error_message: errorMessage,
//           reason: requestBody?.reason,
//           site_id: siteId,
//           study_id: studyId
//         });
//       }

//       return response;
//     } catch (error: any) {
//       errorMessage = error.message || 'Internal server error';
      
//       await AuditService.log({
//         // Преобразуем user поля в строки где нужно
//         user_id: user.user_id?.toString() || '',
//         user_email: user.user_email || '',
//         user_role: user.user_role || [],
        
//         ...metadata,
        
//         action: config.action,
//         entity_type: config.entityType,
//         entity_id: entityId.toString(), // Преобразуем number в string
//         old_value: oldValue,
//         new_value: null,
//         status: 'FAILURE',
//         error_message: errorMessage,
//         reason: requestBody?.reason,
//         site_id: siteId,
//         study_id: studyId
//       });

//       throw error;
//     } finally {
//       const duration = Date.now() - startTime;
//       console.log(`[AUDIT] ${config.action} ${config.entityType}:${entityId} - ${duration}ms - `);
//     }
//   };
// }

// GTP version
import { NextRequest, NextResponse } from "next/server";
import { AuditService } from "./audit.service";
import { AuditAction, AuditEntity } from "@/types/types";

export interface AuditContext {
  body?: any;
  formData?: FormData;
}

export interface AuditConfig {
  action: AuditAction;
  entityType: AuditEntity;

  getEntityId?: (ctx: AuditContext, req: NextRequest) => string | number | Promise<string | number>;
  getSiteId?: (ctx: AuditContext, req: NextRequest) => string | number | Promise<string | number>;
  getStudyId?: (ctx: AuditContext, req: NextRequest) => string | number | Promise<string | number>;
  
  getOldValue?: (ctx: AuditContext, req: NextRequest) => Promise<any>;
  getNewValue?: (ctx: AuditContext, req: NextRequest) => any;

  skip?: (req: NextRequest) => boolean;
}

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

      // читаем body только один раз
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
    let siteId = "";
    let studyId = "";

    if (config.getEntityId) {
      entityId = String((await config.getEntityId(ctx, req)) ?? "0");
    }

    if (config.getSiteId) {
      siteId = String((await config.getSiteId(ctx, req)) ?? "");
    }

    if (config.getStudyId) {
      studyId = String((await config.getStudyId(ctx, req)) ?? "");
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
        newValue = config.getNewValue(ctx, req);
      }

      await AuditService.log({
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
      });

      return response;

    } catch (error: any) {

      await AuditService.log({
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
      });

      throw error;

    } finally {

      const duration = Date.now() - start;

      console.log(
        `[AUDIT] ${config.action} ${config.entityType}:${entityId} ${duration}ms`
      );
    }
  };
}