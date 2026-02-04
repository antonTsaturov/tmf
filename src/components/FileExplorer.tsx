import React, { useState } from 'react';
import '../styles/FileExplorer.css';

export interface FileNode {
  id: string;
  name: string;
  type: 'folder' | 'file';
  children?: FileNode[];
  size?: string;
  modified?: string;
  extension?: string;
}

export interface FileExplorerProps {
  data: FileNode[];
  onSelect?: (node: FileNode) => void;
  onToggle?: (node: FileNode, isExpanded: boolean) => void;
  showFileIcons?: boolean;
  allowMultiSelect?: boolean;
}

const FileExplorer: React.FC<FileExplorerProps> = ({
  data,
  onSelect,
  onToggle,
  showFileIcons = true,
  allowMultiSelect = false
}) => {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [selectedNodes, setSelectedNodes] = useState<Set<string>>(new Set());

  const toggleFolder = (nodeId: string) => {
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

    return (
      <div key={node.id} className="node-container">
        <div 
          className={`node ${isSelected ? 'selected' : ''}`}
          style={{ paddingLeft: `${depth * 20 + 10}px` }}
          onClick={(e) => {
            e.stopPropagation();
            toggleFolder(node.id);
            console.log(node.type)
          }}
        >
          {/* Стрелка для папок с содержимым */}
          {node.type === 'folder' && hasChildren && (
            <span 
              className={`toggle-icon ${isExpanded ? 'expanded' : ''}`}
              onClick={(e) => {
                //e.stopPropagation();
                //toggleFolder(node.id);
              }}
            >
              ▸
            </span>
          )}
          
          {/* Пробел для файлов и пустых папок */}
          {node.type === 'folder' && !hasChildren && (
            <span className="toggle-icon-placeholder">•</span>
          )}
          {node.type === 'file' && (
            <span className="toggle-icon-placeholder"></span>
          )}

          {/* Иконка */}
          <span className="node-icon">
            {showFileIcons && (
              node.type === 'folder' ? (
                isExpanded ? '📂' : '📁'
              ) : getFileIcon(node.extension)
            )}
          </span>

          {/* Имя файла/папки */}
          <span className="node-name">{node.name}</span>

          {/* Дополнительная информация */}
          <span className="node-info">
            {node.size && <span className="size">{node.size}</span>}
            {node.modified && <span className="modified">{node.modified}</span>}
          </span>
        </div>

        {/* Дочерние элементы */}
        {node.type === 'folder' && isExpanded && hasChildren && (
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

  return (
    <div className="file-explorer">
      <div className="explorer-header">
        <div className="header-name">Имя</div>
        <div className="header-size">Размер</div>
        <div className="header-modified">Изменено</div>
      </div>
      <div className="tree-container">
        {data.map(node => renderNode(node))}
      </div>
    </div>
  );
};

export default FileExplorer;