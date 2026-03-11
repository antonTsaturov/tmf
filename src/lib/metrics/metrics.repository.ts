import { connectDB } from "@/lib/db"

export async function getTotalDocuments(studyId: number) {
  const client = await connectDB()

  const result = await client.query(`
    SELECT COUNT(*) 
    FROM document
    WHERE study_id=$1
    AND is_deleted = false
  `,[studyId])

  client.release()

  return Number(result.rows[0].count)
}

export async function getDocumentsOnReview(studyId: number) {
  const client = await connectDB()

  const result = await client.query(`
    SELECT COUNT(*)
    FROM document_version dv
    JOIN document d ON d.id = dv.document_id
    WHERE d.study_id = $1
    AND dv.review_status = 'on_review'
  `,[studyId])

  client.release()

  return Number(result.rows[0].count)
}

export async function getRejectedDocuments(studyId:number){
  const client = await connectDB()

  const result = await client.query(`
    SELECT COUNT(*)
    FROM document_version dv
    JOIN document d ON d.id = dv.document_id
    WHERE d.study_id=$1
    AND dv.review_status='rejected'
  `,[studyId])

  client.release()

  return Number(result.rows[0].count)
}

export async function getUploadsThisWeek(studyId:number){
  const client = await connectDB()

  const result = await client.query(`
    SELECT COUNT(*)
    FROM document_version dv
    JOIN document d ON d.id = dv.document_id
    WHERE d.study_id=$1
    AND dv.uploaded_at > NOW() - INTERVAL '7 days'
  `,[studyId])

  client.release()

  return Number(result.rows[0].count)
}