import { NextRequest, NextResponse } from 'next/server';
import { AuditService } from './audit.service';
import { AuditAction, AuditEntity, AuditStatus } from '@/types/types';

export interface AuditConfig {
  action: AuditAction;
  entityType: AuditEntity;
  getEntityId?: (req: NextRequest, body?: any) => number;
  getSiteId?: (req: NextRequest, body?: any) => number | string;
  getStudyId?: (req: NextRequest, body?: any) => number | string;
  getOldValue?: (req: NextRequest, body?: any) => Promise<Record<string, unknown> | null>;
  getNewValue?: (req: NextRequest, body?: any) => Record<string, unknown> | null;
  skip?: (req: NextRequest) => boolean;
}

export function withAudit(config: AuditConfig) {
  return async function auditMiddleware(
    req: NextRequest,
    handler: (preloadedData?: any) => Promise<NextResponse>
  ) {
    // Пропускаем аудит если нужно
    if (config.skip?.(req)) {
      return handler();
    }

    const metadata = AuditService.extractMetadata(req);
    const user = AuditService.getUserFromRequest(req);
    
    let oldValue: Record<string, unknown> | null = null;
    let entityId: number = 0;
    let siteId: string | number = '';
    let studyId: string | number = '';
    let requestBody: any = null;

    // НЕ читаем request.json() здесь - ожидаем что данные переданы через handler
    // или получаем из config.getEntityId/getStudyId/getSiteId

    // Получаем ID сущности
    if (config.getEntityId) {
      entityId = config.getEntityId(req, requestBody);
    } else {
      const urlParts = req.nextUrl.pathname.split('/');
      const lastPart = urlParts[urlParts.length - 1];
      entityId = !isNaN(Number(lastPart)) ? Number(lastPart) : 0;
    }

    // Получаем site_id и study_id
    if (config.getSiteId) {
      siteId = config.getSiteId(req, requestBody);
    }
    
    if (config.getStudyId) {
      studyId = config.getStudyId(req, requestBody);
    }

    // Получаем старое значение для UPDATE/DELETE
    if (config.getOldValue && entityId) {
      try {
        oldValue = await config.getOldValue(req, requestBody);
      } catch (error) {
        console.error('Failed to get old value:', error);
      }
    }

    // Выполняем основной обработчик
    const startTime = Date.now();
    let response: NextResponse;
    let errorMessage = '';

    try {
      // Передаем requestBody в handler если он есть
      response = await handler(requestBody);
      
      if (response.status < 400) {
        let newValue: Record<string, unknown> | null = null;
        
        if (config.getNewValue) {
          newValue = config.getNewValue(req, requestBody);
        } else if (requestBody) {
          newValue = requestBody;
        }

        // Приводим все поля к правильным типам
        await AuditService.log({
          // Преобразуем user поля в строки где нужно
          user_id: user.user_id?.toString() || '',
          user_email: user.user_email || '',
          user_role: user.user_role || [],
          
          ...metadata,
          
          action: config.action,
          entity_type: config.entityType,
          entity_id: entityId.toString(), // Преобразуем number в string
          old_value: oldValue,
          new_value: newValue,
          status: 'SUCCESS',
          error_message: '',
          reason: requestBody?.reason,
          site_id: siteId,
          study_id: studyId
        });
      } else {
        let responseData;
        try {
          const clone = response.clone();
          responseData = await clone.json();
        } catch {
          responseData = {};
        }
        
        errorMessage = responseData.error || 'Request failed';
        
        await AuditService.log({
          // Преобразуем user поля в строки где нужно
          user_id: user.user_id?.toString() || '',
          user_email: user.user_email || '',
          user_role: user.user_role || [],
          
          ...metadata,
          
          action: config.action,
          entity_type: config.entityType,
          entity_id: entityId.toString(), // Преобразуем number в string
          old_value: oldValue,
          new_value: null,
          status: 'FAILURE',
          error_message: errorMessage,
          reason: requestBody?.reason,
          site_id: siteId,
          study_id: studyId
        });
      }

      return response;
    } catch (error: any) {
      errorMessage = error.message || 'Internal server error';
      
      await AuditService.log({
        // Преобразуем user поля в строки где нужно
        user_id: user.user_id?.toString() || '',
        user_email: user.user_email || '',
        user_role: user.user_role || [],
        
        ...metadata,
        
        action: config.action,
        entity_type: config.entityType,
        entity_id: entityId.toString(), // Преобразуем number в string
        old_value: oldValue,
        new_value: null,
        status: 'FAILURE',
        error_message: errorMessage,
        reason: requestBody?.reason,
        site_id: siteId,
        study_id: studyId
      });

      throw error;
    } finally {
      const duration = Date.now() - startTime;
      console.log(`[AUDIT] ${config.action} ${config.entityType}:${entityId} - ${duration}ms - `);
    }
  };
}