// src/components/FolderExplorer/FolderItem.tsx

import { Badge, Box, Flex, Text, TextField } from "@radix-ui/themes";
import { ChevronRightIcon, DotIcon, LockClosedIcon, ArchiveIcon } from "@radix-ui/react-icons";
import { FaRegFolderOpen, FaRegFolder } from "react-icons/fa6";
import { FileNode } from "./index";
import { collectAllFolderIds } from "./utils/folderHelpers";
import { ChangeEvent, useState } from "react";
import FolderContextMenu from "./FolderContextMenu";
import { set } from "date-fns";
import { Folder } from "@/types/folder";

interface FolderItemProps {
  node: FileNode;
  depth: number;
  isExpanded: boolean;
  isSelected: boolean;
  hasChildren: boolean | undefined;
  isFolder: boolean;
  showFileIcons: boolean;
  isStudyReadOnly: boolean;
  isStudyArchived: boolean;
  isAvailableForCurrentLevel: () => boolean;
  onToggleFolder: (nodeId: string) => void;
  onToggleAllFolders?: (ids: string[], expand: boolean) => void;
  onSelect: (node: FileNode, event: React.MouseEvent) => void;
}

const FolderItem: React.FC<FolderItemProps> = ({
  node,
  depth,
  isExpanded,
  isSelected,
  hasChildren,
  isFolder,
  showFileIcons,
  isStudyReadOnly,
  isStudyArchived,
  isAvailableForCurrentLevel,
  onToggleFolder,
  onToggleAllFolders,
  onSelect,
}) => {

  

  return (

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
            if (hasChildren) onToggleFolder(node.id);
            onSelect(node, e);
          }
        }}
        onDoubleClick={(e) => {
          if (isFolder && isAvailableForCurrentLevel()) {
            onSelect(node, e);
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
                onSelect(node, e);
              }
            }}
          >
            {isFolder && (
              isExpanded ? <FaRegFolderOpen width="16" height="16" /> 
              : <FaRegFolder width="16" height="16" />
            )}
          </Box>
        )}

        {/* Name */}

          <Text 
            size="2" 
            weight="medium" 
            style={{ 
              textTransform: 'uppercase', 
              letterSpacing: '0.5px',
              flex: 1,
              color: isSelected ? 'var(--accent-10)' : 'var(--gray-12)',
              marginTop: '1px'
            }}
            title={node.name}
            onClick={(e) => {
              e.stopPropagation();
              if (isFolder && isAvailableForCurrentLevel()) {
                if (hasChildren) onToggleFolder(node.id);
                onSelect(node, e);
              }
            }}
          >
            {node.name}
          </Text>
        
        {/* Unfold/Fold All Button */}
        {node.type === 'folder' && node.children && node.children.length > 0 && (          <Badge 
            style={{ cursor: 'pointer' }}
            onClick={(e) => {
              e.stopPropagation();
              const allRelatedIds = collectAllFolderIds([node]);
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
        
        {/* Archive Icon for Archived Studies */}
        {isStudyArchived && isFolder && (
          <Box 
            title="Study archived"
            style={{ color: 'var(--gray-9)' }}
          >
            <ArchiveIcon width="14" height="14" />
          </Box>
        )}
      </Flex>
  );
};

export default FolderItem;