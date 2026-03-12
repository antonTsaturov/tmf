import * as repo from "./metrics.repository"
import { MetricsDashboard } from "@/types/metrics"

export async function getStudyDashboard(
  studyId:number
):Promise<MetricsDashboard>{

  const [
    totalDocuments,
    documentsOnReview,
    rejectedDocuments,
    uploadsThisWeek
  ] = await Promise.all([
    repo.getTotalDocuments(studyId),
    repo.getDocumentsOnReview(studyId),
    repo.getRejectedDocuments(studyId),
    repo.getUploadsThisWeek(studyId)
  ])

  return {
    study:{
      totalDocuments,
      documentsOnReview,
      rejectedDocuments,
      archivedDocuments:0
    },

    review:{
      pendingReviews:documentsOnReview,
      avgReviewTimeDays:0,
      rejectedRate: rejectedDocuments/Math.max(totalDocuments,1)
    },

    uploads:{
      uploadsThisWeek,
      uploadsThisMonth:0
    },

    sites:[]
  }
}