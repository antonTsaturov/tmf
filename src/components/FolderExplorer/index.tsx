// src/components/FolderExplorer/index.tsx

import React, {  useCallback, useContext, useEffect, useState } from 'react';
import { MainContext } from '@/wrappers/MainContext';
import { ViewLevel } from '@/types/types';
import { 
  Box, 
  Flex, 
  Text, 
} from '@radix-ui/themes';
import StudyInfoPanel from '../panels/StudyInfoPanel';
import { useI18n } from '@/hooks/useI18n';
import FolderTreeNode from './FolderTreeNode';
import { findPathToFolder } from './utils/folderHelpers';
import { SidebarSkeleton } from '../ui/SidebarSkeleton';

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
  const { currentStudy, currentSite, currentLevel, currentCountry, selectedFolder } = context;
  const [data, setData] = useState<FileNode[] | undefined>();
  const [filteredData, setFilteredData] = useState<FileNode[] | undefined>();
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

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


  // Функция для переключения одной папки
  const handleToggleFolder = useCallback((nodeId: string) => {
    setExpandedFolders(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(nodeId)) {
        newExpanded.delete(nodeId);
      } else {
        newExpanded.add(nodeId);
      }
      return newExpanded;
    });
  }, []);

  // Функция для переключения всех папок в ветке
  const handleToggleAllFolders = useCallback((ids: string[], expand: boolean) => {
    setExpandedFolders(prev => {
      const newExpanded = new Set(prev);
      if (expand) {
        ids.forEach(id => newExpanded.add(id));
      } else {
        ids.forEach(id => newExpanded.delete(id));
      }
      return newExpanded;
    });
  }, []);

  // Эффект для автоматического раскрытия папок при выборе папки
  useEffect(() => {
    if (selectedFolder && filteredData) {
      const parentIds = findPathToFolder(filteredData, selectedFolder.id);
      if (parentIds && parentIds.length > 0) {
        setExpandedFolders(prev => {
          const newExpanded = new Set(prev);
          parentIds.forEach(id => newExpanded.add(id));
          return newExpanded;
        });
      }
    }
  }, [selectedFolder, filteredData]);
  
  if (!Array.isArray(filteredData)) {
    return (
      <Flex justify="center" align="center" p="4">
        <Text color="gray">{t('noData')}</Text>
      </Flex>
    );
  }

return (
    <Box className="file-explorer" pb="6" style={{ height: '100%', overflow: 'auto' }}>
      {/* Панель с информацией о выбранном исследовании */}
      <StudyInfoPanel />

      {/* Sticky контейнер для фиксированной панели */}
      <Box  
        style={{
          padding: '14px', 
          position: 'sticky', 
          top: 0, 
          backgroundColor: 'var(--gray-5)', 
          zIndex: 10,
          borderBottom: '1px solid var(--gray-7)',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
          textAlign: 'center'
        }}
      >        
          <Text size="2" weight="bold">
            {t('masterFileTitle')}
          </Text>
      </Box>

      <Box p="2">
      {/* 1. Если исследование не выбрано — показываем полноценный скелетон */}
      {!currentStudy ? (
        <Flex direction="column" align="center" justify="center" py="4">
          <SidebarSkeleton/> 
        </Flex>
      ) : 
      
      /* 2. Если исследование выбрано, но не выбран уровень (General/Country/Site) */
      !currentLevel ? (
        <Flex direction="column" align="center" justify="center" py="4">
          <SidebarSkeleton  />
        </Flex>
      )

      /* 3. Логика для уровней Site и Country */
      : currentLevel === ViewLevel.SITE && !currentSite ? (
        <Flex direction="column" gap="2" align="center" justify="center" py="4">
          <SidebarSkeleton />
        </Flex>
      )

      : currentLevel === ViewLevel.COUNTRY && !currentCountry ? (
        <Flex direction="column" gap="2" align="center" justify="center" py="4">
          <SidebarSkeleton />
        </Flex>
      ) 
      
      /* 4. Обработка пустых данных */
      : filteredData.length === 0 ? (
        <Flex direction="column" gap="2" align="center" py="4">
          <Text size="2" color="gray">
            {currentLevel === ViewLevel.GENERAL
              ? t('noGeneralFolders')
              : currentLevel === ViewLevel.SITE ?
              t('noSiteFolders')
              : t('noCountryFolders')
            }
          </Text>
        </Flex> 
      ) 
      
      /* 5. Основной рендер дерева папок */
      : (
        <Flex direction="column" gap="1">
          {filteredData.map(node => (
            <FolderTreeNode 
              key={node.id}
              node={node}
              depth={1}
              allowMultiSelect={allowMultiSelect}
              showFileIcons={showFileIcons}
              filteredData={filteredData}
              expandedFolders={expandedFolders}
              onToggleFolder={handleToggleFolder}
              onToggleAllFolders={handleToggleAllFolders}              
            />
          ))}          
        </Flex>
      )}
      </Box>
    </Box>
  );
}
export default FolderExplorer;