export interface StudyMetrics {
  totalDocuments: number
  documentsOnReview: number
  rejectedDocuments: number
  archivedDocuments: number
}

export interface ReviewMetrics {
  pendingReviews: number
  avgReviewTimeDays: number
  rejectedRate: number
}

export interface UploadMetrics {
  uploadsThisWeek: number
  uploadsThisMonth: number
}

export interface SiteMetrics {
  siteId: string
  documents: number
}

export interface MetricsDashboard {
  study: StudyMetrics
  review: ReviewMetrics
  uploads: UploadMetrics
  sites: SiteMetrics[]
}