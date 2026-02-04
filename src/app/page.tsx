'use client'

import { useState, useRef, useEffect, useCallback } from 'react';
import '../styles/Home.css';
import { Flex, Text, Button, Tabs } from "@radix-ui/themes";
import FileExplorer, { FileNode } from '../components/FileExplorer';
import { sampleData } from '../utils/data';
import UserMenu from '@/components/UserMenu';
import Modal from '@/components/Modal';
import { useModal } from '@/hooks/useModal';
import ProjectBuilder from '@/components/ProjectBuilder';
import SiteManager from '@/components/SiteManager';
import StudyManager from '@/components/StudyManager';

interface MainWindowProps {
  initialWidth?: number;
  minWidth?: number;
  maxWidth?: number;
}

const Home: React.FC<MainWindowProps> = ({
  initialWidth = 600,
  minWidth = 500,
  maxWidth = 600
}) => {
  const [sidebarWidth, setSidebarWidth] = useState<number>(initialWidth);
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const [showRightFrame, setShowRightFrame] = useState<boolean>(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(initialWidth);
  const { isOpen, openModal, closeModal, modalProps } = useModal();

  const startResizing = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsResizing(true);
    startXRef.current = e.clientX;
    startWidthRef.current = sidebarWidth;
    
    // Блокируем выделение текста во время ресайза
    document.body.style.userSelect = 'none';
  }, [sidebarWidth]);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
    
    // Восстанавливаем выделение текста
    document.body.style.userSelect = '';
  }, []);

  const resize = useCallback((e: MouseEvent) => {
    if (!isResizing) return;

    const deltaX = e.clientX - startXRef.current;
    const newWidth = startWidthRef.current + deltaX;
    
    // Ограничиваем ширину в заданных пределах
    const clampedWidth = Math.max(minWidth, Math.min(newWidth, maxWidth));
    
    setSidebarWidth(clampedWidth);
  }, [isResizing, minWidth, maxWidth]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => resize(e);
    const handleMouseUp = () => stopResizing();

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      // Восстанавливаем на всякий случай
      document.body.style.userSelect = '';
    };
  }, [isResizing, resize, stopResizing]);

  return (
    <div className="sidebarresizable-root">

      <Modal {...modalProps}>
        <Tabs.Root className="TabsRoot" defaultValue="tab1">
          <Tabs.List className="TabsList">
            <Tabs.Trigger className="TabsTrigger" value="tab1">
                Trial Management
            </Tabs.Trigger>
            <Tabs.Trigger className="TabsTrigger" value="tab2">
                Project Folder Structure
            </Tabs.Trigger>
            <Tabs.Trigger className="TabsTrigger" value="tab3">
                Sites Managment
            </Tabs.Trigger>
            <Tabs.Trigger className="TabsTrigger" value="tab4">
                Users Managment
            </Tabs.Trigger>
          </Tabs.List>
          <Tabs.Content className="TabsContent" value="tab1">
              <StudyManager />
          </Tabs.Content>
          <Tabs.Content className="TabsContent" value="tab2">
              <ProjectBuilder />
          </Tabs.Content>
          <Tabs.Content className="TabsContent" value="tab3">
              <SiteManager />
          </Tabs.Content>
        </Tabs.Root>
      </Modal>

      <header className="toolbar-header">
        <div className="toolbar-title"></div>
        <UserMenu/>
        <Button color="gray"
          //className="toolbar-toggle-frame-btn"
          onClick={() => setShowRightFrame((v) => !v)}
        >
          {showRightFrame ? 'Hide Frame' : 'Show Frame'}
        </Button>
      </header>
      <div className="sidebar-layout">
        <div
          ref={sidebarRef}
          className="sidebar"
          style={{ width: `${sidebarWidth}px` }}
        >
          <div className="sidebar-content">
            <div className="sidebar-content-area">
              {/* <FileExplorer
                data={sampleData}
                // onSelect={handleSelect}
                // onToggle={handleToggle}
                showFileIcons={true}
                allowMultiSelect={true}
              /> */}
            </div>
          </div>
          <div
            className="sidebar-resizer"
            onMouseDown={startResizing}
            title="Перетащите для изменения ширины"
          />
        </div>
        <div className="main-content">
          <div className="main-content-path"></div>
          <div className="main-content-area"></div>
        </div>
        {showRightFrame && (
          <div className="right-frame">
            <div className="right-frame-content">
              <h2>Right Frame</h2>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;