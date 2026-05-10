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

export const SITE_STATUS_CONFIG = {
  [SiteStatus.OPENED]: { label: 'Opened', color: '#51cf66', icon: '🟢' },
  [SiteStatus.PLANNED]: { label: 'Planned', color: '#ff922b', icon: '🟡' },
  [SiteStatus.CLOSED]: { label: 'Closed', color: '#ff6b6b', icon: '🔴' },
  [SiteStatus.FROZEN]: { label: 'Frozen', color: '#3b5bff', icon: '❄️' },
};

