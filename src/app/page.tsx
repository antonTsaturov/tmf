'use client'

import { useState, useRef, useEffect, useCallback, useContext } from 'react';
import '../styles/Home.css';
import FileExplorer, { FileNode } from '../components/FileExplorer';
import { sampleData } from '../utils/data';
import UserMenu from '@/components/UserMenu';
import Modal from '@/components/Modal';
import { useModal } from '@/hooks/useModal';
import FoldersStructureManager from '@/components/FoldersStructureManager';
import SiteManager from '@/components/SiteManager';
import StudyManager from '@/components/StudyManager';
import UserManager from '@/components/UserManager';
import { Button, Tabs, Box} from '@radix-ui/themes';
import StudySiteNavigation from '@/components/Navigation';
import { AdminContext } from '@/wrappers/AdminContext';
import FolderContentViewer from '@/components/FolderContentViewer';
import DocumentActions from '@/components/DocumentActions';
import AuditTrailViewer from '@/components/AuditTrailViewer';
import PDFViewer from '@/components/PDFViewer';
import { MainContext } from '@/wrappers/MainContext';

interface MainWindowProps {
  initialWidth?: number;
  minWidth?: number;
  maxWidth?: number;
}

const Home: React.FC<MainWindowProps> = () => {

  const sidebarRef = useRef<HTMLDivElement>(null);
  const { isOpen, openModal, closeModal, modalProps } = useModal();
  const { context, updateContext } = useContext(MainContext)!;
  const { selectedDocument, isRightFrameOpen } = context;

  return (
    <div className="sidebarresizable-root">

      <Modal {...modalProps}>
        <Tabs.Root defaultValue="tab1">
          <Tabs.List >
            <Tabs.Trigger  value="tab1">
                Studies Management
            </Tabs.Trigger>
            <Tabs.Trigger  value="tab2">
                Project Folder Structure
            </Tabs.Trigger>
            <Tabs.Trigger  value="tab3">
                Sites Management
            </Tabs.Trigger>
            <Tabs.Trigger value="tab4">
                Users Management
            </Tabs.Trigger>
            <Tabs.Trigger value="tab5">
                Audit Trail
            </Tabs.Trigger>

          </Tabs.List>
          <Box pt="5">
              <Tabs.Content value="tab1">
                  <StudyManager />
              </Tabs.Content>
              <Tabs.Content  value="tab2">
                  <FoldersStructureManager />
              </Tabs.Content>
              <Tabs.Content  value="tab3">
                  <SiteManager />
              </Tabs.Content>
              <Tabs.Content  value="tab4">
                  <UserManager />
              </Tabs.Content>
              <Tabs.Content  value="tab5">
                  <AuditTrailViewer />
              </Tabs.Content>
            
          </Box>
        </Tabs.Root>
      </Modal>

      <header className="toolbar-header">
        <StudySiteNavigation /> 
        <div className="toolbar-title"></div>
        <UserMenu />
      </header>
      <div className="sidebar-layout">
        <div
          ref={sidebarRef}
          className="sidebar"
        >
          <div className="sidebar-content">

                       
            <div className="sidebar-content-area">
              <FileExplorer
                showFileIcons={true}
                allowMultiSelect={true}
              />
            </div>
          </div>
        </div>
        <div className="main-content">
          <div className="main-content-path">
            <DocumentActions
              onAction={() => console.log()}
            />

          </div>
          <div className="main-content-area">
            <FolderContentViewer />
          </div>
        </div>
        {isRightFrameOpen && (
          <div className="right-frame">
            <div className="right-frame-content">
              {selectedDocument ? (
                <PDFViewer onClose={() => updateContext({isRightFrameOpen: false})} />
              ) : (
                <div className="right-frame-placeholder">
                  <div className="placeholder-icon">📄</div>
                  <div className="placeholder-text">
                    Выберите документ для просмотра
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;