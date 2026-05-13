// src/components/FolderExplorer/FolderTreeNode.tsx

import {  Box } from "@radix-ui/themes";
import { FileNode } from "./index";
import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { MainContext } from "@/wrappers/MainContext";
import { StudyStatus, ViewLevel } from "@/types/types";
import { collectAllFolderIds } from "./utils/folderHelpers";
import FolderItem from "./FolderItem";


interface FolderTreeNodeProps {
  nod: FileNode;
  depth?: number;
  allowMultiSelect?: boolean;
  showFileIcons?: boolean;
  filteredData?: FileNode[];
  expandedFolders?: Set<string>;
  onToggleFolder?: (nodeId: string) => void;
  onToggleAllFolders?: (ids: string[], expand: boolean) => void;
}

const FolderTreeNode: React.FC<FolderTreeNodeProps> = ({ 
  nod, 
  depth = 1, 
  allowMultiSelect = false, 
  showFileIcons = true, 
  filteredData,
  expandedFolders = new Set(),
  onToggleFolder,
  onToggleAllFolders
}) => {
  const [node, setNode ]= useState(nod); // Отдельная папка в дереве
  
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

    if (context.currentLevel === ViewLevel.SITE && !currentSite) {
      return;
    }

    // ✅ Устанавливаем флаг, что это клик пользователя (не программная прокрутка)
    userSelectedFolderIdRef.current = node.id;

    if (allowMultiSelect && event.ctrlKey) {
      const newSelected = new Set(selectedNodes);
      if (newSelected.has(node.id)) {
        newSelected.delete(node.id);
        if (context.selectedFolder?.id === node.id) {
          updateContext({ 
            selectedFolder: null,
           });
          userSelectedFolderIdRef.current = null;
        }
      } else {
        newSelected.add(node.id);
        updateContext({ 
          selectedFolder: node,
         });
      }
      setSelectedNodes(newSelected);
      
    } else {
      if (isExpanded ) {
        onToggleFolder?.(node.id);
        
      }
      setSelectedNodes(new Set([node.id]));
      updateContext({ 
        selectedFolder: node,
        selectedDocument: null
      });
    }
  };

  const setFolderRef = useCallback((nodeId: string) => (element: HTMLDivElement | null) => {
    if (element) {
      folderRefs.current.set(nodeId, element);
    } else {
      folderRefs.current.delete(nodeId);
    }
  }, []); 

  // автоматическая прокрутка
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

        <FolderItem 
          node={node}
          depth={depth}
          isExpanded={isExpanded}
          isSelected={isSelected}
          hasChildren={hasChildren}
          isFolder={isFolder}
          showFileIcons={showFileIcons}
          isStudyReadOnly={isStudyReadOnly}
          isStudyArchived={isStudyArchived}
          isAvailableForCurrentLevel={isAvailableForCurrentLevel}
          onToggleFolder={toggleFolder}
          onToggleAllFolders={onToggleAllFolders}
          onSelect={handleSelect}
        />     

      {/* Children */}
      {isFolder && isExpanded && hasChildren && (
        
        <Box className="children">
          {node.children!.map(child => (
              <FolderTreeNode
                key={child.id}
                nod={child}
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