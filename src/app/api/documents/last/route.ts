// src/app/api/documents/last/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { buildLastDocumentsQuery } from "@/lib/utils/search";
import { ViewLevel } from "@/types/types";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const depth = Number(searchParams.get("depth") || 10);
    const studyId = Number(searchParams.get("studyId"));
    const viewLevel = searchParams.get("viewLevel") as ViewLevel;

    const country = searchParams.get("country");
    const siteId = searchParams.get("siteId");

    if (!studyId || !viewLevel) {
      return NextResponse.json(
        { error: "studyId and viewLevel required" },
        { status: 400 }
      );
    }

    const { query, values } = buildLastDocumentsQuery({
      studyId,
      depth,
      viewLevel,
      country,
      siteId,
    });

    const clietn = getPool();
    const { rows } = await clietn.query(query, values);

    const data = rows.map((row) => ({
      id: row.id,
      document_name: row.document_name,
      folder_id: row.folder_id,
      country: row.country,
      uploaded_at: row.uploaded_at,
      uploaded_by: row.uploaded_by,
      status: row.review_status,

      study: {
        id: row.study_id,
        title: row.study_title,
        protocol: row.study_protocol,
        status: row.study_status,
      },

      site: row.site_id
        ? {
            id: row.site_id,
            name: row.site_name,
            country: row.site_country,
            city: row.site_city,
            status: row.site_status,
          }
        : null,
    }));

    return NextResponse.json(data);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Internal error" },
      { status: 500 }
    );
  }
}