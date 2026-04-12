import { Folder } from "./folder";
import { StudySite } from './types';

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
  total_documents: number | null;
  folders_structure: Folder | null;
  audit_trail?: any[] | null;
  sites?: StudySite[];
}
