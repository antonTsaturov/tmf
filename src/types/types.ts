
// Enum для статусов исследования
export enum StudyStatus {
  PLANNED = 'planned',
  ONGOING = 'ongoing',
  COMPLETED = 'completed',
  TERMINATED = 'terminated',
  ARCHIVED = 'archived'
}

export enum FolderType {
  ROOT = 'root',
  FOLDER = 'folder',
  SUBFOLDER = 'subfolder'
}

export enum FolderStatus {
  ACTIVE = 'active',
  LOCKED = 'locked',
  ARCHIVED = 'archived'
}


export interface Folder {
  id: string;
  name: string;
  type: FolderType;
  status: FolderStatus;
  children: Folder[];
}

export enum SiteStatus {
  PLANNED = 'planned',
  OPENED = 'opened',
  CLOSED = 'closed',
}

export interface StudySite {
  id: string;
  name: string;
  number: number;
  country: string;
  city: string;
  principalInvestigator: string;
  status: SiteStatus;
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
  sites_list: string[] | null;
  total_documents: number | null;
  folders_structure: Folder | null;
  audit_trail?: any[] | null;
}