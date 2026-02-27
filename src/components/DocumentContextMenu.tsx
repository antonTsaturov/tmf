import React, { useContext } from 'react';
import * as ContextMenu from '@radix-ui/react-context-menu';
import '../styles/DocumentContextMenu.css';
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
  const { updateContext } = useContext(MainContext)!; // Достаем функцию обновления

  const handleRightClick = () => {
    // Принудительно выделяем документ при открытии меню
    updateContext({ selectedDocument: document });
  };
  
  
  // Получаем те же действия, что и в основной панели
  const availableActions = getAvailableDocumentActions(
    document, 
    (user?.role as UserRole[]) || []
  ).filter(a => a !== DocumentAction.CREATE_DOCUMENT);

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger
        asChild
        onContextMenu={handleRightClick}
      >
        {children}
      </ContextMenu.Trigger>
      
      <ContextMenu.Portal>
        <ContextMenu.Content className="context-menu-content">
          {availableActions.map((action, i) => (
            <ContextMenu.Item 
              key={`${action}-${i}`}
              className="context-menu-item"
              onSelect={() => onAction(action, document)}
            >
              {actionConfig[action].label} 
            </ContextMenu.Item>
          ))}
          
          {availableActions.length === 0 && (
            <div className="context-menu-item disabled">Нет доступных действий</div>
          )}
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
};

export default DocumentContextMenu;