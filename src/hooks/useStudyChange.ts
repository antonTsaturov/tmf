// src/hooks/useStudyChange.ts
import { useCallback } from 'react';
import { Study } from '@/types/types';

interface UseStudyChangeProps {
  studies: Study[];
  updateContext: (updates: Partial<any>) => void;
  onStudyChange?: (study: Study | undefined) => void;
  onSiteChange?: (site: any | undefined) => void;
  onViewLevelChange?: (level: any | undefined) => void;
}

export const useStudyChange = ({
  studies,
  updateContext,
  onStudyChange,
  onSiteChange,
  onViewLevelChange,
}: UseStudyChangeProps) => {
  const handleStudyChange = useCallback((studyId: string) => {
    const selectedStudy = studies.find((study: Study) => Number(study.id) === Number(studyId));

    if (selectedStudy) {
      // Если у исследования только 1 страна — сразу устанавливаем её
      const defaultCountry = selectedStudy.countries.length === 1
        ? selectedStudy.countries[0]
        : undefined;

      // Сохраняем объект исследования в контекст
      updateContext({
        currentStudy: selectedStudy,
        currentSite: undefined,
        currentLevel: undefined,
        currentCountry: defaultCountry,
        countryFilter: defaultCountry ? [defaultCountry] : undefined,
        selectedFolder: null,
        showLastDocuments: false
      });

      onStudyChange?.(selectedStudy);
      onSiteChange?.(undefined);
      onViewLevelChange?.(undefined);
    }
  }, [studies, updateContext, onStudyChange, onSiteChange, onViewLevelChange]);

  return { handleStudyChange };
};