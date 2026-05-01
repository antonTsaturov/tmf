// src/components/FolderExplorer/FolderTreeNode.tsx

/**
 * Renders a single node in the folder tree.
 *
 * @param {Object} node - The folder node to render.
 * @param {string} node.id - The ID of the folder node.
 * @param {string} node.name - The name of the folder node.
 * @param {boolean} node.selected - Whether the folder node is selected.
 * @param {boolean} node.expanded - Whether the folder node is expanded.
 * @param {Function} onToggle - A function to toggle the expansion of the folder node.
 * @param {boolean} isExpanded - Whether the folder node is currently expanded.
 * @param {boolean} isSelected - Whether the folder node is currently selected.
 * @param {Function} onSelect - A function to handle the selection of the folder node.
 * @param {Function} setFolderRef - A function to set the ref of the folder node.
 * @returns {JSX.Element} The rendered folder node.
 */

import { Badge, Box, Flex, Text } from "@radix-ui/themes";
import { FileNode } from "./index";
import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { MainContext } from "@/wrappers/MainContext";
import { StudyStatus, ViewLevel } from "@/types/types";
import { ChevronRightIcon, DotIcon, LockClosedIcon, ArchiveIcon } from "@radix-ui/react-icons";
import { FaRegFolderOpen, FaRegFolder } from "react-icons/fa6";
import { collectAllFolderIds, findNodeById, findPathToFolder } from "./utils/folderHelpers";

interface FolderTreeNodeProps {
  node: FileNode;
  depth?: number;
  allowMultiSelect?: boolean;
  showFileIcons?: boolean;
  filteredData?: FileNode[];
}

const FolderTreeNode: React.FC<FolderTreeNodeProps> = ({ 
  node, 
  depth = 1, 
  allowMultiSelect = false, 
  showFileIcons = true, 
  filteredData 
}) => {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [selectedNodes, setSelectedNodes] = useState<Set<string>>(new Set());
  const { context, updateContext } = useContext(MainContext)!;
  const { currentStudy, currentSite, currentLevel, selectedFolder, isFolderContentLoading } = context;
  const folderRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  

  const isExpanded = expandedFolders.has(node.id);
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
    const newExpanded = new Set(expandedFolders);
    const node = findNodeById(filteredData, nodeId);

    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
      //onToggle?.(node!, false);
    } else {
      newExpanded.add(nodeId);
      //onToggle?.(node!, true);
    }
    setExpandedFolders(newExpanded);
  };

  const toggleAllFolders = (ids: string[], expand: boolean) => {
    if (!filteredData) return;
    
    const newExpanded = new Set(expandedFolders);
    
    if (expand) {
      ids.forEach(id => newExpanded.add(id));
    } else {
      ids.forEach(id => newExpanded.delete(id));
    }
    
    setExpandedFolders(newExpanded);
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

    if (allowMultiSelect && event.ctrlKey) {
      const newSelected = new Set(selectedNodes);
      if (newSelected.has(node.id)) {
        newSelected.delete(node.id);
        if (context.selectedFolder?.id === node.id) {
          updateContext({ selectedFolder: null });
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
    //onSelect?.(node);
  };

  const setFolderRef = useCallback((nodeId: string) => (element: HTMLDivElement | null) => {
    if (element) {
      folderRefs.current.set(nodeId, element);
    } else {
      folderRefs.current.delete(nodeId);
    }
  }, []); 

  const scrollToFolder = useCallback((folderId: string) => {
    const element = folderRefs.current.get(folderId);
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, []);

  useEffect(() => {
    if (selectedFolder) {
      setSelectedNodes(new Set([selectedFolder.id]));
      
      // Раскрываем ВСЕ папки (если нужно найти глубоко вложенную)
      // Но лучше раскрывать только путь к папке. Используем существующую collectAllFolderIds?
      // Нет, она раскрывает всё дерево. Давайте сделаем умнее:
      
      
      if (filteredData) {
        const parentIds = findPathToFolder(filteredData, selectedFolder.id);
        if (parentIds && parentIds.length > 0) {
          // Раскрываем только родительские папки
          setExpandedFolders(prev => {
            const newExpanded = new Set(prev);
            parentIds.forEach(id => newExpanded.add(id));
            return newExpanded;
          });
          
          // Даем время на рендер раскрытых папок
          setTimeout(() => {
            scrollToFolder(selectedFolder.id);
          }, 150);
        } else {
          scrollToFolder(selectedFolder.id);
        }
      }
    } else {
      setSelectedNodes(new Set());
    }
    updateContext({ selectedDocument: null });
  }, [selectedFolder, filteredData, scrollToFolder]);    


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
          paddingLeft: `${depth * 12}px`,
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
          onClick={() => {
            if (isFolder && isAvailableForCurrentLevel()) {
              if (hasChildren) toggleFolder(node.id);
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
              // Важно: передаем [node], чтобы включить ID текущей папки в список на переключение
              const allRelatedIds = collectAllFolderIds([node]);
              
              if (isExpanded) {
                // Если папка сейчас развернута (мы видим "Fold all")
                // Мы принудительно УДАЛЯЕМ все ID этой ветки из expandedFolders
                toggleAllFolders(allRelatedIds, false);
              } else {
                // Если папка свернута (мы видим "Unfold all")
                // Мы принудительно ДОБАВЛЯЕМ все ID этой ветки
                toggleAllFolders(allRelatedIds, true);
              }
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
            />
          ))}
        </Box>
      )}    
    </Box>
  );
};

export default FolderTreeNode;