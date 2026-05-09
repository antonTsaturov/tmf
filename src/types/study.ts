import { RadixColors } from "@/lib/config/constants";
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
  sites?: StudySite[];
}

export const StudyStatusLabels: Record<StudyStatus, string> = {
  [StudyStatus.PLANNED]: 'Planned',
  [StudyStatus.ONGOING]: 'Ongoing',
  [StudyStatus.COMPLETED]: 'Completed',
  [StudyStatus.TERMINATED]: 'Terminated',
  [StudyStatus.ARCHIVED]: 'Archived'
};

export const StudyStatusColors: Record<StudyStatus, RadixColors> = {
  [StudyStatus.PLANNED]: 'blue',
  [StudyStatus.ONGOING]: 'green',
  [StudyStatus.COMPLETED]: 'gray',
  [StudyStatus.TERMINATED]: 'red',
  [StudyStatus.ARCHIVED]: 'purple'
};
