// app/api/documents/reviews/pending/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import { AuditService } from '@/lib/audit/audit.service'
import { logger } from '@/lib/utils/logger'

type SqlParam = string | number | boolean | null

export async function GET(request: NextRequest) {
  try {
    const pool = getPool()

    // user from session
    const user = AuditService.getUserFromRequest(request)
    const userId = user.user_id?.toString()
    const roles: string[] = user.user_role || []

    if (!userId) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      )
    }

    const canReview = roles.some(r =>
      ['study_manager'].includes(r)
    )

    if (!canReview) {
      return NextResponse.json(
        { error: 'User does not have permission to review documents' },
        { status: 403 }
      )
    }

    const params: SqlParam[] = [userId]
    const conditions = [
      `dv.review_status = 'submitted'`,
      `dv.review_submitted_to = $1`,
      `d.is_deleted = false`,
      `COALESCE(d.is_archived,false)=false`
    ]

    const search = request.nextUrl.searchParams

    const studyId = search.get('study_id')
    const siteId = search.get('site_id')
    const folderId = search.get('folder_id')

    const limit = Number(search.get('limit') ?? 50)
    const offset = Number(search.get('offset') ?? 0)

    if (studyId) {
      params.push(Number(studyId))
      conditions.push(`d.study_id = $${params.length}`)
    }

    if (siteId) {
      params.push(siteId)
      conditions.push(`d.site_id = $${params.length}`)
    }

    if (folderId) {
      params.push(folderId)
      conditions.push(`d.folder_id = $${params.length}`)
    }

    params.push(limit)
    params.push(offset)

    const query = `
      SELECT
        d.id,
        d.study_id,
        d.site_id,
        d.country,
        d.folder_id,
        d.folder_name,
        d.tmf_zone,
        d.tmf_artifact,
        d.created_at,

        dv.id AS version_id,
        dv.document_number,
        dv.document_name,
        dv.file_name,
        dv.file_type,
        dv.file_size,
        dv.uploaded_at,
        dv.change_reason,
        dv.review_status,
        dv.review_submitted_at,
        dv.review_comment,
        dv.checksum,

        uploader.name AS uploader_name,
        uploader.email AS uploader_email,

        submitter.name AS submitter_name,
        submitter.email AS submitter_email,
        submitter.role AS submitter_role,

        creator.name AS creator_name,
        creator.email AS creator_email,

        reviewer.id AS reviewer_id,
        reviewer.name AS reviewer_name,
        reviewer.email AS reviewer_email,
        reviewer.role AS reviewer_role,

        COUNT(*) OVER() AS total_count

      FROM document_version dv
      JOIN document d ON d.id = dv.document_id

      LEFT JOIN users uploader
        ON dv.uploaded_by = uploader.id

      LEFT JOIN users submitter
        ON dv.review_submitted_by = submitter.id

      LEFT JOIN users creator
        ON d.created_by = creator.id

      LEFT JOIN users reviewer
        ON dv.review_submitted_to = reviewer.id

      WHERE ${conditions.join(' AND ')}

      ORDER BY dv.review_submitted_at DESC

      LIMIT $${params.length - 1}
      OFFSET $${params.length}
    `

    const { rows } = await pool.query(query, params)

    const total = rows[0]?.total_count ?? 0

    const documents = rows.map(doc => ({
      id: doc.id,
      study_id: doc.study_id,
      site_id: doc.site_id,
      country: doc.country,
      folder_id: doc.folder_id,
      folder_name: doc.folder_name,
      created_at: doc.created_at,
      checksum: doc.checksum,
      file_size: doc.file_size,

      tmf_zone: doc.tmf_zone,
      tmf_artifact: doc.tmf_artifact,

      document_name: doc.document_name,
      document_number: doc.document_number,

      file_name: doc.file_name,
      file_type: doc.file_type,

      version_id: doc.version_id,

      status: 'in_review',
      review_status: doc.review_status,
      review_submitted_at: doc.review_submitted_at,
      review_comment: doc.review_comment,

      uploaded_at: doc.uploaded_at,
      change_reason: doc.change_reason,

      creator: doc.creator_name
        ? {
            name: doc.creator_name,
            email: doc.creator_email
          }
        : null,

      uploader: doc.uploader_name
        ? {
            name: doc.uploader_name,
            email: doc.uploader_email
          }
        : null,

      review_submitter: doc.submitter_name
        ? {
            name: doc.submitter_name,
            email: doc.submitter_email,
            role: String(doc.submitter_role)
          }
        : null,

      current_version: {
        ...doc,
        assigned_reviewer: doc.reviewer_id
          ? {
              id: doc.reviewer_id,
              name: doc.reviewer_name,
              email: doc.reviewer_email,
              role: doc.reviewer_role
            }
          : null
      }
    }))

    return NextResponse.json({
      documents,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    })

  } catch (error) {
    logger.error('Error fetching pending reviews:', error)

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}