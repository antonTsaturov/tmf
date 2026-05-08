// src/components/FolderExplorer/FolderTreeNode.tsx

import { Badge, Box, Flex, Text } from "@radix-ui/themes";
import { FileNode } from "./index";
import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { MainContext } from "@/wrappers/MainContext";
import { StudyStatus, ViewLevel } from "@/types/types";
import { ChevronRightIcon, DotIcon, LockClosedIcon, ArchiveIcon } from "@radix-ui/react-icons";
import { FaRegFolderOpen, FaRegFolder } from "react-icons/fa6";
import { collectAllFolderIds } from "./utils/folderHelpers";

interface FolderTreeNodeProps {
  node: FileNode;
  depth?: number;
  allowMultiSelect?: boolean;
  showFileIcons?: boolean;
  filteredData?: FileNode[];
  expandedFolders?: Set<string>;
  onToggleFolder?: (nodeId: string) => void;
  onToggleAllFolders?: (ids: string[], expand: boolean) => void;
}

const FolderTreeNode: React.FC<FolderTreeNodeProps> = ({ 
  node, 
  depth = 1, 
  allowMultiSelect = false, 
  showFileIcons = true, 
  filteredData,
  expandedFolders = new Set(),
  onToggleFolder,
  onToggleAllFolders
}) => {
  const [selectedNodes, setSelectedNodes] = useState<Set<string>>(new Set());
  const { context, updateContext } = useContext(MainContext)!;
  const { currentStudy, currentSite, currentLevel, selectedFolder, isFolderContentLoading } = context;
  const folderRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const userSelectedFolderIdRef = useRef<string | null>(null);

  const isExpanded = expandedFolders?.has(node.id);
  const isSelected = selectedNodes.has(node.id) || selectedFolder?.id === node.id;
  const hasChildren = node.children && node.children.length > 0;
  const displayType = (node.type === 'root' || node.type === 'subfolder') ? 'folder' : node.type;
  const isFolder = displayType === 'folder';
  const isStudyReadOnly = currentStudy?.status === StudyStatus.COMPLETED;
  const isStudyArchived = currentStudy?.status === StudyStatus.ARCHIVED;


  const isSiteSpecific = node.id?.toLowerCase().includes('site');
  const isCountrySpecific = node.id?.toLowerCase().includes('country');
  const isGeneralSpecific = node.id?.toLowerCase().includes('general');

  const isAvailableForCurrentLevel = () => {
    if (!currentLevel) return false;
    if (currentLevel === ViewLevel.GENERAL) return isGeneralSpecific;
    if (currentLevel === ViewLevel.SITE) return isSiteSpecific;
    if (currentLevel === ViewLevel.COUNTRY) return isCountrySpecific;
    return false;
  };

  const toggleFolder = (nodeId: string) => {
    if (!filteredData) return;
    onToggleFolder?.(nodeId);
  };  

  const handleSelect = (node: FileNode, event: React.MouseEvent) => {
    event.stopPropagation();
    if (isFolderContentLoading) return;

    const isFolder = node.type === 'subfolder' && node.children?.length === 0;
    if (!isFolder) return;

    if (context.currentLevel === ViewLevel.SITE && !currentSite) {
      return;
    }

    const isSameNode = context.selectedFolder?.id === node.id;

    // ✅ Устанавливаем флаг, что это клик пользователя (не программная прокрутка)
    userSelectedFolderIdRef.current = node.id;

    if (allowMultiSelect && event.ctrlKey) {
      const newSelected = new Set(selectedNodes);
      if (newSelected.has(node.id)) {
        newSelected.delete(node.id);
        if (context.selectedFolder?.id === node.id) {
          updateContext({ selectedFolder: null });
          userSelectedFolderIdRef.current = null;
        }
      } else {
        newSelected.add(node.id);
        updateContext({ selectedFolder: node });
      }
      setSelectedNodes(newSelected);
      
    } else {
      if (isSameNode) {
        setSelectedNodes(new Set());
        updateContext({ selectedFolder: null });
      } else {
        setSelectedNodes(new Set([node.id]));
        updateContext({ selectedFolder: node });
      }
    }
  };

  const setFolderRef = useCallback((nodeId: string) => (element: HTMLDivElement | null) => {
    if (element) {
      folderRefs.current.set(nodeId, element);
    } else {
      folderRefs.current.delete(nodeId);
    }
  }, []); 

  const scrollToFolder = useCallback((folderId: string, isProgrammatic = true) => {
    if (!isProgrammatic) return; // Если прокрутка вызвана кликом пользователя - пропускаем
    
    const element = folderRefs.current.get(folderId);
    if (!element) return;

    const scrollContainer = element.closest('.file-explorer') as HTMLElement;
    if (!scrollContainer) return;

    const containerRect = scrollContainer.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    
    // Вычисляем целевую позицию
    const targetScrollTop = scrollContainer.scrollTop + 
      (elementRect.top - containerRect.top) - 
      (containerRect.height / 2) + 
      (elementRect.height / 2);
    
    // Плавная анимация с easing функцией
    const startScrollTop = scrollContainer.scrollTop;
    const distance = targetScrollTop - startScrollTop;
    const duration = 500; // мс
    let startTime: number | null = null;

    const easeInOutCubic = (t: number): number => {
      return t < 0.5
        ? 4 * t * t * t
        : 1 - Math.pow(-2 * t + 2, 3) / 2;
    };

    const animation = (currentTime: number) => {
      if (startTime === null) startTime = currentTime;
      const timeElapsed = currentTime - startTime;
      const progress = Math.min(timeElapsed / duration, 1);
      const easeProgress = easeInOutCubic(progress);
      
      scrollContainer.scrollTop = startScrollTop + distance * easeProgress;
      
      if (progress < 1) {
        requestAnimationFrame(animation);
      }
    };

    requestAnimationFrame(animation);
  }, []);

  useEffect(() => {
    if (selectedFolder) {
      setSelectedNodes(new Set([selectedFolder.id]));
      
      // ✅ Проверяем, была ли папка выбрана пользователем
      const isUserSelected = userSelectedFolderIdRef.current === selectedFolder.id;
      
      if (!isUserSelected) {
        // Только если это НЕ клик пользователя - делаем прокрутку
        setTimeout(() => {
          scrollToFolder(selectedFolder.id);
        }, 300);
      }
      
      // ✅ Сбрасываем ref после обработки
      userSelectedFolderIdRef.current = null;
    } else {
      setSelectedNodes(new Set());
    }
    updateContext({ selectedDocument: null });
  }, [selectedFolder, scrollToFolder]);

  useEffect(() => {
    const allRelatedIds = collectAllFolderIds([node]);
    onToggleAllFolders?.(allRelatedIds, true);
  }, [node]);


  if (!isAvailableForCurrentLevel()) return null;

  return (
    <Box 
      key={node.id} 
      className="node-container" 
      ref={setFolderRef(node.id)}
    >
      <Flex
        align="center"
        gap="2"
        className={`node ${isSelected ? 'selected' : ''} ${!isFolder ? 'file-node' : ''}`}
        style={{ 
          paddingLeft: `${depth * 25}px`,
          paddingRight: '8px',
          paddingTop: '8px',
          paddingBottom: '8px',
          borderRadius: '6px',
          cursor: isFolder && isAvailableForCurrentLevel() ? 'pointer' : 'default',
          backgroundColor: isSelected ? 'var(--accent-5)' : 'transparent',
          transition: 'background-color 0.2s'
        }}
        onClick={(e) => {
          if (isFolder && isAvailableForCurrentLevel()) {
            if (hasChildren) toggleFolder(node.id);
            handleSelect(node, e);
          }
        }}
        onDoubleClick={(e) => {
          if (isFolder && isAvailableForCurrentLevel()) {
            handleSelect(node, e);
          }
        }}
      >

        
        {/* Arrow/Folder Toggle */}
        <Box style={{ width: '16px', display: 'flex', justifyContent: 'center' }}>
          {isFolder && hasChildren ? (
            <ChevronRightIcon 
              width="14" 
              height="14" 
              style={{ 
                transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s',
                color: 'var(--gray-9)'
              }} 
            />
          ) : isFolder ? (
            <DotIcon width="14" height="14" style={{ color: 'var(--gray-9)' }} />
          ) : (
            <Box style={{ width: '14px' }} />
          )}
        </Box>

        {/* Icon */}
        {showFileIcons && (
          <Box 
            style={{ 
              color: isSelected ? 'var(--accent-9)' : 'var(--gray-11)',
              display: 'flex',
              alignItems: 'center'
            }}
            onClick={(e) => {
              if (isFolder && isAvailableForCurrentLevel()) {
                e.stopPropagation();
                handleSelect(node, e);
              }
            }}
          >
            {isFolder &&  (
              isExpanded ?  <FaRegFolderOpen width="16" height="16" /> 
              : <FaRegFolder width="16" height="16" />
            )}
          </Box>
        )}

        {/* Name - UPPERCASE */}
        <Text 
          size="2" 
          weight="medium" 
          style={{ 
            textTransform: 'uppercase', 
            letterSpacing: '0.5px',
            flex: 1,
            color: isSelected ? 'var(--accent-10)' : 'var(--gray-12)',
            marginTop:'1px'
          }}
          title={node.name}
          onClick={(e) => {
            e.stopPropagation();
            if (isFolder && isAvailableForCurrentLevel()) {
              if (hasChildren) toggleFolder(node.id);
              handleSelect(node, e);
            }
          }}
        >
          {node.name}
        </Text>
        
        {/* Кнопка для раскрытия / сворачивания всего древа папок */}
        {node.type === 'folder' && node.children && node.children.length > 0 && (
          <Badge 
            style={{ cursor: 'pointer' }}
            onClick={(e) => {
              e.stopPropagation();
              
              // Собираем ID самой папки и всех её детей
              const allRelatedIds = collectAllFolderIds([node]);
              
              // ✅ Используем пропс onToggleAllFolders
              onToggleAllFolders?.(allRelatedIds, !isExpanded);
            }}
          >
            <Text>
              {isExpanded ? 'Fold all' : 'Unfold all'}
            </Text>
          </Badge>
        )}    
        {/* Lock Icon for Completed Studies */}
        {isStudyReadOnly && isFolder && (
          <Box 
            title="Study completed - read only"
            style={{ color: 'var(--gray-9)' }}
          >
            <LockClosedIcon width="14" height="14" />
          </Box>
        )}
        {isStudyArchived && isFolder && (
          <Box 
            title="Study archived"
            style={{ color: 'var(--gray-9)' }}
          >
            <ArchiveIcon width="14" height="14" />
          </Box>
        )}
      </Flex>

      {/* Children */}
      {isFolder && isExpanded && hasChildren && (
        <Box className="children">
          {node.children!.map(child => (
            <FolderTreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              allowMultiSelect={allowMultiSelect}
              showFileIcons={showFileIcons}
              filteredData={filteredData}
              expandedFolders={expandedFolders}
              onToggleFolder={onToggleFolder}
              onToggleAllFolders={onToggleAllFolders}              
            />
          ))}
        </Box>
      )}    
    </Box>
  );
};

export default FolderTreeNode;