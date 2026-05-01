// src/components/FileExplorer.tsx

import React, {  useContext, useEffect, useState } from 'react';
import { MainContext } from '@/wrappers/MainContext';
import { ViewLevel } from '@/types/types';
import { 
  Box, 
  Flex, 
  Text, 
  Separator, 
} from '@radix-ui/themes';
import StudyInfoPanel from '../panels/StudyInfoPanel';
import { useI18n } from '@/hooks/useI18n';
import FolderTreeNode from './FolderTreeNode';

export interface FileNode {
  id: string;
  name: string;
  type: 'folder' | 'file' | 'root' | 'subfolder';
  status?: string;
  children?: FileNode[];
  size?: string;
  modified?: string;
  extension?: string;
}

export interface FileExplorerProps {
  onSelect?: (node: FileNode) => void;
  onToggle?: (node: FileNode, isExpanded: boolean) => void;
  showFileIcons?: boolean;
  allowMultiSelect?: boolean;
}

const FolderExplorer: React.FC<FileExplorerProps> = ({
  showFileIcons = true,
  allowMultiSelect = false
}) => {
  const { t } = useI18n('folderExplorer');
  const { context } = useContext(MainContext)!;
  const { currentStudy, currentSite, currentLevel, currentCountry } = context;
  const [data, setData] = useState<FileNode[] | undefined>();
  const [filteredData, setFilteredData] = useState<FileNode[] | undefined>();

  // Get folders structure from Study object
  useEffect(() => {
    const getFolders = () => {
      if (!currentStudy) {
        setData([]);
        return;
      }
      const folders = currentStudy?.folders_structure?.children || [];
      setData(folders as unknown as FileNode[]);
    };
    getFolders();
  }, [currentStudy]);

  // Filter folders based on currentLevel and currentSite
  useEffect(() => {
    if (!data) {
      setFilteredData([]);
      return;
    }
    if (!context.currentLevel) {
      setFilteredData([]);
      return;
    }

    const filterFoldersByLevel = (nodes: FileNode[]): FileNode[] => {
      return nodes
        .map(node => {
          const filteredNode = { ...node };
          if (node.children) {
            filteredNode.children = filterFoldersByLevel(node.children);
          }
          return filteredNode;
        })
        .filter(node => {
          const isSiteSpecific = node.id?.toLowerCase().includes('site');
          const isCountrySpecific = node.id?.toLowerCase().includes('country');
          const isGeneralSpecific = node.id?.toLowerCase().includes('general');

          if (context.currentLevel === ViewLevel.GENERAL) {
            return isGeneralSpecific;
          }
          if (context.currentLevel === ViewLevel.SITE) {
            return isSiteSpecific;
          }
          if (context.currentLevel === ViewLevel.COUNTRY) {
            return isCountrySpecific;
          }
          return true;
        });
    };

    const filtered = filterFoldersByLevel(data);
    setFilteredData(filtered);
  }, [data, currentLevel, currentSite]);


  if (!Array.isArray(filteredData)) {
    return (
      <Flex justify="center" align="center" p="4">
        <Text color="gray">{t('noData')}</Text>
      </Flex>
    );
  }

  return (
    <Box className="file-explorer" p="3" style={{ height: '100%', overflow: 'auto' }}>
      <StudyInfoPanel />
      
      <Flex align="center" justify="center" py="2" gap="4" >
        <Text size="3" weight="bold">
          {t('masterFileTitle')}
        </Text>
      </Flex>
      <Separator mb="4" style={{ width: '100%' }} />

      {!currentStudy || !currentLevel ? (
        <Flex direction="column" gap="2" align="center">
          {!currentStudy && (
            <Text size="2" color="gray">{t('selectStudy')}</Text>
          )}
          {currentStudy && !currentLevel && (
            <Text size="2" color="gray">{t('selectLevel')}</Text>
          )}
        </Flex>
      )
        : currentLevel === ViewLevel.SITE && !currentSite ? (
        <Flex direction="column" gap="2" align="center">
          <Text size="2" color="gray">{t('selectSite')}</Text>
        </Flex>)
        : currentLevel === ViewLevel.COUNTRY && !currentCountry ? (
        <Flex direction="column" gap="2" align="center">
          <Text size="2" color="gray">{t('selectCountry')}</Text>
        </Flex>
      ) : filteredData.length === 0 ? (
        <Flex direction="column" gap="2" align="center">
          <Text size="2" color="gray">
            {currentLevel === ViewLevel.GENERAL
              ? t('noGeneralFolders')
              : t('noSiteFolders')}
          </Text>
        </Flex>
      ) : (
        <Flex direction="column" gap="1">
          {/* {filteredData.map(node => FolderTreeNode(node))} */}
          {filteredData.map(node => (
            <FolderTreeNode 
              key={node.id}
              node={node}
              depth={1}
              allowMultiSelect={allowMultiSelect}
              showFileIcons={showFileIcons}
              filteredData={filteredData}
            />
          ))}          
        </Flex>
      )}
    </Box>
  );
};

export default FolderExplorer;