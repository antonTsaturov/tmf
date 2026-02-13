import React, { useContext, useEffect, useState } from 'react';
import '../styles/FileExplorer.css';
import { AdminContext } from '@/wrappers/AdminContext';
import { Study } from '@/types/types';

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

  const [data, setData] = useState<FileNode[] | undefined>();

  //Get folders structure from Study object
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
  }, [studies, currentStudyID]); // Добавляем currentStudyID в зависимости

  const toggleFolder = (nodeId: string) => {

    if (!data) {
      return;
    }

    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
      onToggle?.(findNodeById(data, nodeId)!, false);
    } else {
      newExpanded.add(nodeId);
      onToggle?.(findNodeById(data, nodeId)!, true);
    }
    setExpandedFolders(newExpanded);
  };

  const handleSelect = (node: FileNode, event: React.MouseEvent) => {
    const newSelected = allowMultiSelect ? new Set(selectedNodes) : new Set<string>();
    
    if (allowMultiSelect && event.ctrlKey) {
      // Ctrl + клик для множественного выбора
      if (newSelected.has(node.id)) {
        newSelected.delete(node.id);
      } else {
        newSelected.add(node.id);
      }
    } else {
      // Одиночный выбор или клик без Ctrl
      newSelected.add(node.id);
    }
    
    setSelectedNodes(newSelected);
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

  const renderNode = (node: FileNode, depth = 0) => {
    const isExpanded = expandedFolders.has(node.id);
    const isSelected = selectedNodes.has(node.id);
    const hasChildren = node.children && node.children.length > 0;
    
    // Определяем тип для отображения (folder для root и subfolder)
    const displayType = (node.type === 'root' || node.type === 'subfolder') ? 'folder' : node.type;

    return (
      <div key={node.id} className="node-container">
        <div 
          className={`node ${isSelected ? 'selected' : ''}`}
          style={{ paddingLeft: `${depth * 20 + 10}px` }}
          onClick={(e) => {
            e.stopPropagation();
            toggleFolder(node.id);
          }}
        >
          {/* Стрелка для папок с содержимым */}
          {displayType === 'folder' && hasChildren && (
            <span className={`toggle-icon ${isExpanded ? 'expanded' : ''}`}>
              ▸
            </span>
          )}
          
          {/* Пробел для файлов и пустых папок */}
          {displayType === 'folder' && !hasChildren && (
            <span className="toggle-icon-placeholder">•</span>
          )}
          {displayType === 'file' && (
            <span className="toggle-icon-placeholder"></span>
          )}

          {/* Иконка */}
          <span className="node-icon">
            {showFileIcons && (
              displayType === 'folder' ? (
                isExpanded ? '📂' : '📁'
              ) : getFileIcon(node.extension)
            )}
          </span>

          {/* Имя файла/папки */}
          <span className="node-name">{node.name}</span>

        </div>

        {/* Дочерние элементы */}
        {displayType === 'folder' && isExpanded && hasChildren && (
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

  if (!Array.isArray(data)) {
    //console.warn('FileExplorer: data is not an array', data);
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
      <div className="explorer-header">
        {/* <div className="header-name">Имя</div>
        <div className="header-size">Размер</div>
        <div className="header-modified">Изменено</div> */}
      </div>
      <div className="tree-container">
        {currentSiteID && data?.map(node => renderNode(node))}
      </div>
    </div>
  );
};

export default FileExplorer;