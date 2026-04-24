import { FolderNode } from "@/types/folder";

export type FilterState = {
  studyId: string | null;
  country: string | null;
  centerId: string | null;
  folderIds: string[];
};

export type Site = {
  id: string;
  study_id: number;
  study_protocol: string;
  name: string;
  number: number;
  country: string;
  city: string;
  principal_investigator: string;
  status: string;
  created_at: string;
};

export type StudyOption = {
  id: string;
  label: string;
  protocol: string;
  countries: string[];
  sites: Site[];
  foldersStructure: FolderNode;
};

export type CountryOption = {
  id: string;
  label: string;
};

export type CenterOption = {
  id: string;
  number: number;
  label: string;
  country: string;
  city: string;
};

export type FolderOption = {
  id: string;
  label: string;
  path: string;
};
