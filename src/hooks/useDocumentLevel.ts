
const LEVELS = [
  { value: 'site', label: 'Site Level documents' },
  { value: 'general', label: 'General Level documents' },
  { value: 'country', label: 'Country Level documents' },
];

export const useDocumentLevel = (folderId: string): string => {
  const docLevel = folderId.split('-', 1)[0];
  return LEVELS.find(item => item.value === docLevel)?.label ?? docLevel;
}
