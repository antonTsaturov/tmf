import React, { useContext, useEffect, useState } from 'react';
import '../styles/FileExplorer.css';
import { AdminContext } from '@/wrappers/AdminContext';
import { Study } from '@/types/types';
import { FaRegFolder, FaRegFolderOpen } from "react-icons/fa";
import { MainContext } from '@/wrappers/MainContext';

enum ViewLevel {
  SITE = 'site',
  GENERAL = 'general'
};

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
  const { studies, currentStudyID, currentSiteID } = useContext(AdminContext)!;
  const { context, updateContext } = useContext(MainContext)!;

  const [data, setData] = useState<FileNode[] | undefined>();
  const [filteredData, setFilteredData] = useState<FileNode[] | undefined>();

  // Get folders structure from Study object
  useEffect(() => {
    const getFolders = () => {
      if (!studies?.length || !currentStudyID) {
        setData([]);
        return;
      }

      // Находим текущее исследование
      const currentStudy = studies.find(
        (study: Study) => study.id === currentStudyID
      );

      // Получаем структуру папок из исследования
      const folders = currentStudy?.folders_structure?.children || [];
      setData(folders as unknown as FileNode[]);
    };

    getFolders();
  }, [studies, currentStudyID]);

  // Фильтруем папки на основе currentLevel и currentSite
  useEffect(() => {
    if (!data) {
      setFilteredData([]);
      return;
    }

    // Если уровень не выбран, показываем все папки
    if (!context.currentLevel) {
      setFilteredData(data);
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
          const isSiteSpecific = node.id.includes('site-') || 
                                 node.name.toLowerCase().includes('site') ||
                                 node.status === 'site-specific' ||
                                 node.status?.includes('site-');
          
          if (context.currentLevel === ViewLevel.GENERAL) {
            // В General уровне показываем ТОЛЬКО общие папки (не специфичные для сайтов)
            return !isSiteSpecific;
          }
          
          if (context.currentLevel === ViewLevel.SITE) {
            // Если сайт не выбран, ничего не показываем
            if (!currentSiteID) {
              return false;
            }
            
            // В Site уровне показываем ТОЛЬКО папки, связанные с сайтами
            // Папка считается связанной с сайтом, если:
            // 1. Содержит site- в id ИЛИ
            // 2. Содержит "site" в названии ИЛИ
            // 3. Имеет статус site-specific
            return isSiteSpecific;
          }
          
          return true;
        });
    };

    const filtered = filterFoldersByLevel(data);
    console.log('Filtered folders for level:', context.currentLevel, filtered);
    setFilteredData(filtered);
    
  }, [data, context.currentLevel, currentSiteID]);

  // Синхронизируем selectedNodes с контекстом при изменении
  useEffect(() => {
    if (context.selectedFolder) {
      setSelectedNodes(new Set([context.selectedFolder.id]));
    } else {
      setSelectedNodes(new Set());
    }
  }, [context.selectedFolder]);

  // Сбрасываем выбранную папку при смене исследования, сайта или уровня
  useEffect(() => {
    if (context.selectedFolder) {
      updateContext({ selectedFolder: null });
      setSelectedNodes(new Set());
    }
  }, [currentStudyID, currentSiteID, context.currentLevel]);

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
    
    // Разрешаем выбор только папок (root, subfolder, folder)
    const isFolder = node.type === 'folder' || node.type === 'root' || node.type === 'subfolder';
    
    if (!isFolder) {
      return; // Не выбираем файлы
    }

    // Проверяем, доступна ли папка для выбора в текущем уровне
    if (context.currentLevel === ViewLevel.GENERAL) {
      // В General уровне можно выбирать любые доступные папки
    } else if (context.currentLevel === ViewLevel.SITE && !currentSiteID) {
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

    console.log('Rendering node:', node.name, 'for site:', currentSiteID);
    console.log('currentLevel: ', context.currentLevel);

    const isExpanded = expandedFolders.has(node.id);
    const isSelected = selectedNodes.has(node.id) || context.selectedFolder?.id === node.id;
    const hasChildren = node.children && node.children.length > 0;
    
    // Определяем тип для отображения
    const displayType = (node.type === 'root' || node.type === 'subfolder') ? 'folder' : node.type;
    const isFolder = displayType === 'folder';

    // Определяем, является ли папка специфичной для сайта
    const isSiteSpecific = node.id.includes('site-') || 
                           node.name.toLowerCase().includes('site')

    // Определяем, доступна ли папка для текущего уровня
    const isAvailableForCurrentLevel = () => {
      if (!context.currentLevel) return true;
      
      if (context.currentLevel === ViewLevel.GENERAL) {
        // В General уровне показываем ТОЛЬКО общие папки (не специфичные для сайтов)
        return !isSiteSpecific;
      }
      
      if (context.currentLevel === ViewLevel.SITE) {
        // Проверяем, выбран ли сайт
        if (!currentSiteID) {
          return false; // Если сайт не выбран, ничего не показываем
        }
        
        // В Site уровне показываем ВСЕ папки, связанные с сайтами
        // (без привязки к конкретному ID сайта)
        return isSiteSpecific;
      }
      
      return true;
    };

    // Если папка недоступна для текущего уровня, не рендерим её
    if (!isAvailableForCurrentLevel()) {
      console.log('Folder not available:', node.name);
      return null;
    }

    // // Добавляем индикатор типа папки
    // const folderTypeIndicator = () => {
    //   if (isSiteSpecific) {
    //     // Для Site Level показываем индикатор сайта
    //     if (context.currentLevel === ViewLevel.SITE) {
    //       return <span className="folder-badge site-badge" title="Site folder">S</span>;
    //     }
    //     return <span className="folder-badge site-badge" title="Site-specific folder">SL</span>;
    //   }
    //   if (!isSiteSpecific && context.currentLevel === ViewLevel.GENERAL) {
    //     return <span className="folder-badge general-badge" title="General folder">G</span>;
    //   }
    //   return null;
    // };

    return (
      <div key={node.id} className="node-container">
        <div 
          className={`node ${isSelected ? 'selected' : ''} ${!isFolder ? 'file-node' : ''}`}
          style={{ paddingLeft: `${depth * 10}px` }}
          onClick={(e) => {
            if (isFolder && isAvailableForCurrentLevel()) {
              toggleFolder(node.id);
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
              ▸
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
            onClick={(e) => isFolder && isAvailableForCurrentLevel() && handleSelect(node, e)}
          >
            {node.name}
          </span>

          {/* Индикатор типа папки */}
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
      {/* Индикатор текущего режима */}
      {/* {context.currentLevel && (
        <div className={`level-indicator ${context.currentLevel}`}>
          <span className="level-icon">
            {context.currentLevel === ViewLevel.GENERAL ? '📋' : '🏢'}
          </span>
          <span className="level-text">
            {context.currentLevel === ViewLevel.GENERAL ? 'General View' : 'Site Level View'}
          </span>
        </div>
      )} */}
      
      <div className="tree-container">
        {filteredData.length === 0 ? (
          <div className="empty-state">
            {context.currentLevel === ViewLevel.GENERAL 
              ? 'Нет папок уровня General'
              : context.currentLevel === ViewLevel.SITE && !currentSiteID
                ? 'Выберите центр для просмотра папок'
                : context.currentLevel === ViewLevel.SITE && currentSiteID
                  ? 'Нет папок, связанных с сайтами'
                  : 'Нет доступных папок'
            }
          </div>
        ) : (
          filteredData.map(node => renderNode(node))
        )}
      </div>
    </div>
  );
};

export default FileExplorer;