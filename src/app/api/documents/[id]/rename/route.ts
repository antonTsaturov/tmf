// app/api/documents/[id]/rename/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db/index';
import { withAudit } from '@/lib/audit/audit.middleware';
import { AuditContext } from '@/lib/audit/audit.middleware';
import { Tables } from '@/lib/db/schema';
import { logger } from '@/lib/logger';

// Function to get document with its current version for audit
export async function getDocumentForAudit(documentId: string) {
  const client = getPool();
  try {
    const { rows } = await client.query(`
      SELECT 
        d.*,
        dv.document_name,
        dv.document_number,
        dv.file_name,
        dv.file_type,
        dv.file_size
      FROM ${Tables.DOCUMENT} d
      LEFT JOIN ${Tables.DOCUMENT_VERSION} dv ON d.current_version_id = dv.id
      WHERE d.id = $1
    `, [documentId]);
    return rows[0] || null;
  } catch (error) {
    logger.error('Error fetching document for audit:', error);
    return null;
  }
}

// Function to get full document object with all relations
async function getFullDocument(documentId: string) {
  const client = getPool();
  try {
    const { rows } = await client.query(`
      SELECT
        d.*,
        dv.id as current_version_id,
        dv.document_number,
        dv.document_name,
        dv.file_name,
        dv.file_path,
        dv.file_type,
        dv.file_size,
        dv.checksum,
        dv.uploaded_by,
        dv.uploaded_at,
        dv.review_status,
        dv.review_submitted_by,
        dv.review_submitted_at,
        dv.review_submitted_to,
        dv.reviewed_by,
        dv.reviewed_at,
        dv.review_comment,
        dv.change_reason,
        creator.name as creator_name,
        creator.email as creator_email,
        uploader.name as uploader_name,
        uploader.email as uploader_email,
        reviewer.name as reviewer_name,
        reviewer.email as reviewer_email,
        approver.name as approver_name,
        approver.email as approver_email,
        assigned.name as assigned_name,
        assigned.email as assigned_email
      FROM ${Tables.DOCUMENT} d
      LEFT JOIN ${Tables.DOCUMENT_VERSION} dv ON d.current_version_id = dv.id
      LEFT JOIN users creator ON d.created_by = creator.id
      LEFT JOIN users uploader ON dv.uploaded_by = uploader.id
      LEFT JOIN users reviewer ON dv.review_submitted_by = reviewer.id
      LEFT JOIN users approver ON dv.reviewed_by = approver.id
      LEFT JOIN users assigned ON dv.review_submitted_to = assigned.id
      WHERE d.id = $1
    `, [documentId]);
    return rows[0] || null;
  } catch (error) {
    logger.error('Error fetching full document:', error);
    return null;
  }
}

// Handler for renaming document
export async function renameHandler(
  request: NextRequest,
  ctx: AuditContext
) {
  const client = getPool();

  try {
    // Get document ID from URL
    const segments = request.nextUrl.pathname.split('/');
    const id = segments[segments.indexOf('documents') + 1];

    if (!id) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      );
    }

    const { newTitle, userId } = ctx.body || {};

    // Validate required fields
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Validate new title
    if (!newTitle || newTitle.trim().length < 3) {
      return NextResponse.json(
        { error: 'Document title is required and must be at least 3 characters long' },
        { status: 400 }
      );
    }

    if (newTitle.trim().length > 200) {
      return NextResponse.json(
        { error: 'Document title cannot exceed 200 characters' },
        { status: 400 }
      );
    }

    // Get document for audit (before changes)
    const document = await getDocumentForAudit(id);

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Check if document is deleted
    if (document.is_deleted) {
      return NextResponse.json(
        { error: 'Cannot rename deleted document' },
        { status: 400 }
      );
    }

    // Check if document has a current version
    if (!document.current_version_id) {
      return NextResponse.json(
        { error: 'Document has no version to rename' },
        { status: 400 }
      );
    }

    const oldDocumentName = document.document_name;

    // Update document_name in document_version table
    const { rowCount } = await client.query(`
      UPDATE ${Tables.DOCUMENT_VERSION}
      SET
        document_name = $1
      WHERE id = $2
    `, [newTitle.trim(), document.current_version_id]);

    if (rowCount === 0) {
      return NextResponse.json(
        { error: 'Failed to rename document' },
        { status: 500 }
      );
    }

    // Fetch updated document with all relations
    const updatedDocument = await getFullDocument(id);

    // Build enriched document object
    const enrichedDocument = updatedDocument ? {
      ...updatedDocument,
      status: updatedDocument.review_status === 'approved' ? 'approved' : 
              updatedDocument.review_status === 'submitted' ? 'in_review' : 'draft',
      document_status: updatedDocument.review_status === 'approved' ? 'approved' : 
                       updatedDocument.review_status === 'submitted' ? 'in_review' : 'draft',
      creator: updatedDocument.creator_name ? {
        id: updatedDocument.created_by,
        name: updatedDocument.creator_name,
        email: updatedDocument.creator_email
      } : null,
      last_uploader: updatedDocument.uploader_name ? {
        id: updatedDocument.uploaded_by,
        name: updatedDocument.uploader_name,
        email: updatedDocument.uploader_email
      } : null,
      reviewer: updatedDocument.reviewer_name ? {
        id: updatedDocument.review_submitted_by,
        name: updatedDocument.reviewer_name,
        email: updatedDocument.reviewer_email
      } : null,
      approver: updatedDocument.approver_name ? {
        id: updatedDocument.reviewed_by,
        name: updatedDocument.approver_name,
        email: updatedDocument.approver_email
      } : null,
      assigned_reviewer: updatedDocument.assigned_name ? {
        id: updatedDocument.review_submitted_to,
        name: updatedDocument.assigned_name,
        email: updatedDocument.assigned_email
      } : null
    } : null;

    // Return result with audit data
    return NextResponse.json({
      success: true,
      document: enrichedDocument,
      _auditData: {
        oldValue: {
          ...document,
          document_name: oldDocumentName
        },
        newValue: {
          document_name: newTitle.trim()
        },
        studyId: document.study_id,
        siteId: document.site_id,
        userId: userId
      }
    });

  } catch (error) {
    logger.error('Error renaming document:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

const getDocId = (req: NextRequest) =>
  req.nextUrl.pathname.split('/').filter(Boolean)[2];


export const PUT = withAudit(
  {
    action: "UPDATE",
    entityType: "document",

    getEntityId: (_, req) =>
      req.nextUrl.pathname.split("/")[3],

    loadEntity: async (id) => {
      return getDocumentForAudit(id);
    },

    getSiteId: (ctx) => ctx.entity?.site_id ?? "",

    getStudyId: (ctx) => ctx.entity?.study_id ?? "",

    getOldValue: async (ctx) => ({
      document_name: ctx.entity?.document_name
    }),

    getNewValue: async (ctx) => ({
      document_name: ctx.body?.newTitle
    })
  },
  renameHandler
);
