import { Select } from '@radix-ui/themes';
import { Study } from '@/types/types';
import { useEffect } from 'react';
//import "./styles.css";

interface SellectProps {
    studies: Study[];
    studyHandler: (studyId: number | null) => void;
}

export const CustomSelect = ({studies, studyHandler}: SellectProps) => {
  // Map protocol to studyId for lookup
  const protocolToId = Object.fromEntries(studies.map(study => [study.protocol, study.id]));

  // Call studyHandler on mount if only one study
  useEffect(() => {
    if (studies.length === 1) {
      //studyHandler(studies[0].id);
      studyHandler(null);
    }
    
  }, []);

  return (
    <Select.Root
      //defaultValue={studies[0]?.protocol || ''}
      
      onValueChange={(value) => {
        const id = protocolToId[value];
        if (id !== undefined) studyHandler(id);
      }}
    >
      <Select.Trigger placeholder="Pick a study"/>
      <Select.Content>
        <Select.Group>
          <Select.Label>Studies</Select.Label>
          {studies?.map(study => (
            <Select.Item
              key={study.id}
              value={study.protocol}
            >
              {study.protocol}
            </Select.Item>
          ))}
        </Select.Group>
      </Select.Content>
    </Select.Root>
  );
}