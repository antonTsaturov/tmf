
// Enum для статусов исследования
export enum StudyStatus {
  PLANNED = 'planned',
  ONGOING = 'ongoing',
  COMPLETED = 'completed',
  TERMINATED = 'terminated',
  ARCHIVED = 'archived'
}

export interface Study {
  id: number;
  title: string;
  protocol: string;
  sponsor: string;
  cro: string;
  countries: string[];
  status: StudyStatus;
  users: any[] | null;
  totalDocuments: number | null;
  audit_trail?: any[] | null;
}