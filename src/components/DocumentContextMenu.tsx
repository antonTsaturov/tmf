// src/components/DocumentContextMenu.tsx

import React, { useContext } from 'react';
import { ContextMenu } from '@radix-ui/themes'; 
import { DocumentAction, Document } from '@/types/document';
import { useAuth } from '@/wrappers/AuthProvider';
import { getAvailableDocumentActions } from '@/domain/document/document.logic';
import { UserRole } from '@/types/types';
import { actionConfig } from './DocumentActions';
import { MainContext } from '@/wrappers/MainContext';


interface DocumentContextMenuProps {
    children: React.ReactNode;
    document: Document;
    onAction: (action: DocumentAction, document: Document) => void;
}

const DocumentContextMenu = ({ children, onAction , document}: DocumentContextMenuProps) => {
  const { user } = useAuth();
  const { updateContext } = useContext(MainContext)!;

  const handleRightClick = () => {
    updateContext({ selectedDocument: document });
  };
  
  const availableActions = getAvailableDocumentActions(
    document, 
    (user?.role as UserRole[]) || []
  ).filter(a => a !== DocumentAction.CREATE_DOCUMENT);

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger onContextMenu={handleRightClick}>
        {children}
      </ContextMenu.Trigger>
      
      <ContextMenu.Content>
        {availableActions.map((action, i) => {
          const config = actionConfig[action]
          if (!config) return;

          return (
            <ContextMenu.Item 
              key={`${action}-${i}`}
              onClick={() => onAction(action, document)}
            >
              {config.label} 
            </ContextMenu.Item>
          );
        })}
        
        {availableActions.length === 0 && (
          <ContextMenu.Item disabled>Нет доступных действий</ContextMenu.Item>
        )}
      </ContextMenu.Content>
    </ContextMenu.Root>
  );
};

export default DocumentContextMenu;