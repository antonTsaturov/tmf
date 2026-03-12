export enum SiteStatus {
  PLANNED = 'planned',
  OPENED = 'opened',
  FROZEN = 'frozen',
  CLOSED = 'closed',
}

export interface StudySite {
  id: number;
  study_id: number;
  study_protocol: string;
  name: string;
  number: number;
  country: string;
  city: string;
  principal_investigator: string;
  status: SiteStatus;
}
