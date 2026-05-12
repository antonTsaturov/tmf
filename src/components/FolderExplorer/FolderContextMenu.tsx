// src/components/FolderContextMenu.tsx

import React, { useContext } from 'react';
import { ContextMenu } from '@radix-ui/themes';
import { StudyStatus } from '@/types/types';
import { MainContext } from '@/wrappers/MainContext';
import { FileNode } from '.';

interface FolderContextMenuProps {
    children: React.ReactNode;
    folder: FileNode;
    onSelect?: (node: FileNode, event: React.MouseEvent) => void;
    onAddFolder?: (folderId: string, position: 'before' | 'after') => void;
    onRename?: () => void;
    onDelete?: () => void;
    onDuplicate?: () => void;
}

const FolderContextMenu = ({ children, onSelect, folder, onAddFolder, onRename, onDelete, onDuplicate }: FolderContextMenuProps) => {
    const { context, updateContext } = useContext(MainContext)!;
    
    // Определяем можно ли редактировать папку
    const canEdit = (): boolean => {
        // Защищенные корневые папки
        const protectedFolders = ['Site Level', 'General', 'Country Level'];
        if (protectedFolders.includes(folder.name)) {
            return false;
        }
        
        // Проверка на статус исследования
        const isStudyCompleted = context.currentStudy?.status === StudyStatus.COMPLETED;
        const isStudyArchived = context.currentStudy?.status === StudyStatus.ARCHIVED;
        
        if (isStudyCompleted || isStudyArchived) {
            return false;
        }
        
        return true;
    };

    const handleOpenChange = (node: FileNode, event: React.MouseEvent) => {
        onSelect && onSelect(node, event);
    };

    const isFolderNotShouldEdit = (): boolean => {
        const children = folder.children;
        const userMod = folder.userModified;

        if (children && children.length > 0) {
            if (userMod) {
                return false;
            } else {
                return true;
            }
        }

        return false;
    };

    // Оборачиваем children в div, если это несколько элементов
    const wrappedChildren = React.Children.count(children) > 1 ? (
        <div>{children}</div>
    ) : (
        children
    );

    return (
        <ContextMenu.Root>
            <ContextMenu.Trigger onContextMenu={(e) => handleOpenChange(folder, e)}>
                {wrappedChildren}
            </ContextMenu.Trigger>
            <ContextMenu.Content>
                <ContextMenu.Item 
                    onClick={() => {
                        onAddFolder && onAddFolder(folder.id, 'after');
                    }}
                    disabled={isFolderNotShouldEdit() || !canEdit()}
                >
                    Создать новую папку
                </ContextMenu.Item>
                
                {onRename && (
                    <ContextMenu.Item 
                        onClick={() => onRename()}
                        disabled={!canEdit()}
                    >
                        Переименовать
                    </ContextMenu.Item>
                )}
                
                {onDelete && (
                    <ContextMenu.Item 
                        onClick={() => onDelete()}
                        disabled={!canEdit()}
                        color="red"
                    >
                        Удалить
                    </ContextMenu.Item>
                )}
                
                {onDuplicate && (
                    <ContextMenu.Item 
                        onClick={() => onDuplicate()}
                        disabled={!canEdit()}
                    >
                        Дублировать
                    </ContextMenu.Item>
                )}
            </ContextMenu.Content>
        </ContextMenu.Root>
    );
};

export default FolderContextMenu;