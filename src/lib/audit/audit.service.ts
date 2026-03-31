// lib/audit/audit.service.ts

import { randomUUID } from "crypto";
import { NextRequest } from "next/server";
import { getPool } from "@/lib/db";
import { AuditLogEntry } from '@/types/audit';
import { PoolClient } from "pg";
import { logger } from '@/lib/logger';


const MAX_JSON_SIZE = 20000; // защита от огромных payload


export class AuditService {

  // безопасный JSON stringify
  private static safeJson(value: any) {

    if (!value) return null;

    try {

      const json = JSON.stringify(value);

      if (json.length > MAX_JSON_SIZE) {
        return JSON.stringify({
          truncated: true
        });
      }

      return json;

    } catch {
      return JSON.stringify({
        error: "serialization_failed"
      });
    }
  }

  static async log(entry: AuditLogEntry) {

    let client;

    try {

      client = getPool();

      const query = `
        INSERT INTO audit (
          audit_id,
          created_at,
          user_id,
          user_email,
          user_role,
          action,
          entity_type,
          entity_id,
          old_value,
          new_value,
          ip_address,
          user_agent,
          session_id,
          status,
          error_message,
          site_id,
          study_id
        )
        VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17
        )
      `;

      const values = [
        randomUUID(),
        new Date(),

        entry.user_id,
        entry.user_email,

        this.safeJson(entry.user_role),

        entry.action,
        entry.entity_type,
        entry.entity_id,

        this.safeJson(entry.old_value),
        this.safeJson(entry.new_value),

        entry.ip_address,
        entry.user_agent,
        entry.session_id,

        entry.status,
        entry.error_message || null,

        entry.site_id || null,
        entry.study_id || null
      ];

      await client.query(query, values);

    } catch (error) {
      logger.error('[AUDIT] insert failed', error);
    } 
  }

  static extractMetadata(req: NextRequest) {

    const forwardedFor = req.headers.get("x-forwarded-for");
    const realIp = req.headers.get("x-real-ip");

    let ip = "0.0.0.0";

    if (forwardedFor) {
      ip = forwardedFor.split(",")[0].trim();
    } else if (realIp) {
      ip = realIp;
    }

    return {
      ip_address: ip,
      user_agent: req.headers.get("user-agent") || "unknown",
      session_id:
        req.cookies.get("session-id")?.value ||
        randomUUID()
    };
  }

  static getUserFromRequest(req: NextRequest) {

    const userId = req.headers.get("x-user-id");
    const email = req.headers.get("x-user-email");
    const roles = req.headers.get("x-user-roles");

    let parsedRoles: any[] = [];

    try {
      parsedRoles = roles ? JSON.parse(roles) : [];
    } catch {
      parsedRoles = [];
    }

    return {
      user_id: userId || "",
      user_email: email || "",
      user_role: parsedRoles
    };
  }

  // Массовая запись логов в рамках одной транзакции  
  static async bulkLog(client: PoolClient, entries: AuditLogEntry[]) {
    if (entries.length === 0) return;

    const values: any[] = [];
    const placeholders = entries.map((entry, index) => {
      const offset = index * 17; // 17 полей в таблице audit
      values.push(
        randomUUID(),
        new Date(),
        entry.user_id,
        entry.user_email,
        this.safeJson(entry.user_role),
        entry.action,
        entry.entity_type,
        entry.entity_id,
        this.safeJson(entry.old_value),
        this.safeJson(entry.new_value),
        entry.ip_address,
        entry.user_agent,
        entry.session_id,
        entry.status,
        entry.error_message || null,
        entry.site_id || null,
        entry.study_id || null
      );

      // Формируем ($1, $2, ... $17), ($18, ... $34) и т.д.
      return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12}, $${offset + 13}, $${offset + 14}, $${offset + 15}, $${offset + 16}, $${offset + 17})`;
    }).join(',');

    const query = `
      INSERT INTO audit (
        audit_id, created_at, user_id, user_email, user_role,
        action, entity_type, entity_id, old_value, new_value,
        ip_address, user_agent, session_id, status, error_message,
        site_id, study_id
      )
      VALUES ${placeholders}
    `;

    await client.query(query, values);
  }
}