// src/components/FileExplorer.tsx 

import React, { useContext, useEffect, useState } from 'react';
import '../styles/FileExplorer.css';
import { FaRegFolder, FaRegFolderOpen } from "react-icons/fa";
import { MainContext } from '@/wrappers/MainContext';
import { useNotification } from '@/wrappers/NotificationContext';
import { ViewLevel } from '@/types/types';


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

const FileExplorer: React.FC<FileExplorerProps> = ({
  onSelect,
  onToggle,
  showFileIcons = true,
  allowMultiSelect = false
}) => {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [selectedNodes, setSelectedNodes] = useState<Set<string>>(new Set());
  const { context, updateContext } = useContext(MainContext)!;
  const { currentStudy, currentSite, currentLevel, selectedFolder, isFolderContentLoading } = context;

  const [data, setData] = useState<FileNode[] | undefined>();
  const [filteredData, setFilteredData] = useState<FileNode[] | undefined>();

  // Get folders structure from Study object
  useEffect(() => {
    const getFolders = () => {
      if (!currentStudy) {
        setData([]);
        return;
      }

      // Получаем структуру папок из исследования
      const folders = currentStudy?.folders_structure?.children || [];
      setData(folders as unknown as FileNode[]);
    };

    getFolders();
    
  }, [currentStudy]);

  // Фильтруем папки на основе currentLevel и currentSite
  useEffect(() => {
    if (!data) {
      setFilteredData([]);
      return;
    }

    // Если уровень не выбран, не показываем папки
    if (!context.currentLevel) {
      setFilteredData([]);
      return;
    }

    // Фильтруем папки в зависимости от уровня
    const filterFoldersByLevel = (nodes: FileNode[]): FileNode[] => {
      return nodes
        .map(node => {
          // Создаем копию узла
          const filteredNode = { ...node };
          
          // Рекурсивно фильтруем дочерние элементы
          if (node.children) {
            filteredNode.children = filterFoldersByLevel(node.children);
          }
          
          return filteredNode;
        })
        .filter(node => {
          
          // Определяем, является ли папка специфичной для сайта
          // Используем более надежный способ определения
          const isSiteSpecific = 
            node.id?.toLowerCase().includes('site') || 
            node.name?.toLowerCase().includes('site') ||
            (node.status?.toLowerCase() === 'site-specific');
          
          if (context.currentLevel === ViewLevel.GENERAL) {
            // В General уровне показываем ТОЛЬКО общие папки (не специфичные для сайтов)
            return !isSiteSpecific;
          }
          
          if (context.currentLevel === ViewLevel.SITE) {
            // В Site уровне показываем ТОЛЬКО папки, связанные с сайтами
            // НЕ проверяем наличие выбранного сайта здесь!
            return isSiteSpecific;
          }
          
          return true;
        });
    };

    const filtered = filterFoldersByLevel(data);
    //console.log('Filtered folders for level:', context.currentLevel, filtered);
    setFilteredData(filtered);
    
  }, [data, currentLevel, currentSite]); // Убрали currentSite из зависимостей? Нет, он нужен для сброса при смене сайта

  // Синхронизируем selectedNodes с контекстом при изменении
  useEffect(() => {
    if (selectedFolder) {
      setSelectedNodes(new Set([selectedFolder.id]));
    } else {
      setSelectedNodes(new Set());
    }
    updateContext({ selectedDocument: null });
  }, [selectedFolder]);  

  // Сбрасываем выбранную папку при смене исследования, сайта или уровня
  useEffect(() => {
    if (selectedFolder) {
      updateContext({ selectedFolder: null });
      setSelectedNodes(new Set());
    }
  }, [currentStudy, currentSite, currentLevel]);

  const toggleFolder = (nodeId: string) => {
    if (!filteredData) {
      return;
    }

    const newExpanded = new Set(expandedFolders);
    const node = findNodeById(filteredData, nodeId);
    
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
      onToggle?.(node!, false);
    } else {
      newExpanded.add(nodeId);
      onToggle?.(node!, true);
    }
    setExpandedFolders(newExpanded);
  };

  const handleSelect = (node: FileNode, event: React.MouseEvent) => {
    event.stopPropagation();
    // Запрещаем менять папку, если документы еще загружаются
    if (isFolderContentLoading) {
      return
    }
    // Разрешаем выбор только папок с типом subfolder и без "детей"
    const isFolder = node.type === 'subfolder' && node.children?.length === 0 ;
    
    if (!isFolder) {
      return; // Не выбираем файлы
    }

    // Проверяем, доступна ли папка для выбора в текущем уровне
    if (context.currentLevel === ViewLevel.GENERAL) {
      // В General уровне можно выбирать любые доступные папки
    } else if (context.currentLevel === ViewLevel.SITE && !currentSite) {
      // В Site уровне без выбранного сайта нельзя выбирать папки
      console.log('Please select a site first');
      return;
    }

    // Проверяем, выбрана ли уже эта папка
    const isSameNode = context.selectedFolder?.id === node.id;

    if (allowMultiSelect && event.ctrlKey) {
      // Режим множественного выбора с Ctrl
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
      // Одиночный выбор
      if (isSameNode) {
        setSelectedNodes(new Set());
        updateContext({ selectedFolder: null });
      } else {
        setSelectedNodes(new Set([node.id]));
        updateContext({ selectedFolder: node });
      }
    }
    
    onSelect?.(node);
  };

  const findNodeById = (nodes: FileNode[], id: string): FileNode | null => {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.children) {
        const found = findNodeById(node.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  const renderNode = (node: FileNode, depth = 1) => {
    const isExpanded = expandedFolders.has(node.id);
    const isSelected = selectedNodes.has(node.id) || context.selectedFolder?.id === node.id;
    const hasChildren = node.children && node.children.length > 0;
    
    // Определяем тип для отображения
    const displayType = (node.type === 'root' || node.type === 'subfolder') ? 'folder' : node.type;
    const isFolder = displayType === 'folder';

    // Определяем, является ли папка специфичной для сайта
    const isSiteSpecific = 
      node.id?.toLowerCase().includes('site') || 
      node.name?.toLowerCase().includes('site') ||
      (node.status?.toLowerCase() === 'site-specific');

    // Определяем, доступна ли папка для текущего уровня
    const isAvailableForCurrentLevel = () => {
      if (!currentLevel) return false;
      
      if (currentLevel === ViewLevel.GENERAL) {
        // В General уровне показываем ТОЛЬКО общие папки
        return !isSiteSpecific;
      }
      
      if (currentLevel === ViewLevel.SITE) {
        // В Site уровне показываем ТОЛЬКО папки, связанные с сайтами
        // Не проверяем наличие выбранного сайта здесь!
        return isSiteSpecific;
      }
      
      return false;
    };

    // Если папка недоступна для текущего уровня, не рендерим её
    if (!isAvailableForCurrentLevel()) {
      return null;
    }

    return (
      <div key={node.id} className="node-container">
        <div 
          className={`node ${isSelected ? 'selected' : ''} ${!isFolder ? 'file-node' : ''}`}
          style={{ paddingLeft: `${depth * 10}px` }}
          onClick={(e) => {
            if (isFolder && isAvailableForCurrentLevel()) {
              if (hasChildren) {
                toggleFolder(node.id);
              }
              handleSelect(node, e)
            }
          }}
          onDoubleClick={(e) => {
            if (isFolder && isAvailableForCurrentLevel()) {
              handleSelect(node, e);
            }
          }}
        >
          {/* Стрелка для папок с содержимым */}
          {isFolder && hasChildren && (
            <span className={`toggle-icon ${isExpanded ? 'expanded' : ''}`}>
              ▶
            </span>
          )}
          
          {/* Пробел для файлов и пустых папок */}
          {isFolder && !hasChildren && (
            <span className="toggle-icon-placeholder">•</span>
          )}
          {!isFolder && (
            <span className="toggle-icon-placeholder"></span>
          )}

          {/* Иконка */}
          <span 
            className="node-icon" 
            onClick={(e) => isFolder && isAvailableForCurrentLevel() && handleSelect(node, e)}
          >
            {showFileIcons && (
              isFolder ? (
                !isExpanded ? <FaRegFolder /> : <FaRegFolderOpen />
              ) : getFileIcon(node.extension)
            )}
          </span>

          {/* Имя файла/папки */}
          <span 
            className="node-name" 
            title={node.name}
            onClick={(e) => {
              if (isFolder && isAvailableForCurrentLevel()) {
                if (hasChildren) {
                  toggleFolder(node.id);
                }
                
              }
            }}
          >
            {node.name}
          </span>
        </div>

        {/* Дочерние элементы */}
        {isFolder && isExpanded && hasChildren && (
          <div className="children">
            {node.children!.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const getFileIcon = (extension?: string) => {
    if (!extension) return '📄';
    
    const iconMap: Record<string, string> = {
      'js': '📜', 'ts': '📜', 'jsx': '⚛️', 'tsx': '⚛️',
      'html': '🌐', 'css': '🎨', 'json': '📋',
      'pdf': '📕', 'doc': '📘', 'docx': '📘',
      'jpg': '🖼️', 'jpeg': '🖼️', 'png': '🖼️', 'gif': '🖼️',
      'mp3': '🎵', 'mp4': '🎬', 'avi': '🎬',
      'zip': '📦', 'rar': '📦', 'tar': '📦',
    };
    
    return iconMap[extension.toLowerCase()] || '📄';
  };

  if (!Array.isArray(filteredData)) {
    return (
      <div className="file-explorer">
        <div className="tree-container">
          <div className="empty-state">Нет данных</div>
        </div>
      </div>
    );
  }


  return (
    <div className="file-explorer">
      <h4 className="explorer-header">Структура Файла Исследования</h4>
      <div className="tree-container">
        {!currentStudy || !currentLevel ? (
          <div className="empty-state">
            {!currentStudy && 'Выберите исследование'}
            {currentStudy && !currentLevel && 'Выберите уровень просмотра'}
          </div>
        ) : currentLevel === ViewLevel.SITE && !currentSite ? (
          <div className="empty-state">
            Выберите центр
          </div>
        ) : filteredData.length === 0 ? (
          <div className="empty-state">
            {currentLevel === ViewLevel.GENERAL 
              ? 'Нет общих папок' 
              : 'Нет папок для выбранного центра'}
          </div>
        ) : (
          filteredData.map(node => renderNode(node))
        )}
      </div>
    </div>
  );
};

export default FileExplorer;