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
import DocumentDetails from '@/components/DocumentDetails';
import DeletedDocumentsViewer from '@/components/DeletedDocumentsViewer';
import { MainContext } from '@/wrappers/MainContext';
import { FiX } from 'react-icons/fi';
import DocumentStatusIndicator from '@/components/DocumentStatusIndicator';
import { DocumentWorkFlowStatus } from '@/types/document';

interface MainWindowProps {
  initialWidth?: number;
  minWidth?: number;
  maxWidth?: number;
}

const Home: React.FC<MainWindowProps> = () => {

  const sidebarRef = useRef<HTMLDivElement>(null);
  const { isOpen, openModal, closeModal, modalProps } = useModal();
  const { context, updateContext } = useContext(MainContext)!;
  const { selectedDocument, isRightFrameOpen } = context!;

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
            <Tabs.Trigger value="tab6">
                Deleted documents
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
              <Tabs.Content value="tab6">
                <DeletedDocumentsViewer />
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
          <div className="main-content-row">
            <div className="main-content--buttons">
              <DocumentActions />

            </div>
            <div className="main-content--status">
              {selectedDocument?.status && (
                <DocumentStatusIndicator
                  size="big" 
                />
              )}
            </div>
          </div>
          
          <div className="main-content-area">
            <FolderContentViewer />
          </div>
        </div>
        {isRightFrameOpen && (
          <div className="right-frame">
            <button className="right-frame-close-button" onClick={()=> updateContext({isRightFrameOpen: false})}>
              <FiX />
            </button>
            <div className="right-frame-content">
              <Tabs.Root defaultValue="view" className="right-frame-tabs-root">
                <Tabs.List>
                  <Tabs.Trigger value="view">Document preview</Tabs.Trigger>
                  <Tabs.Trigger value="tab2">Document metadata</Tabs.Trigger>
                </Tabs.List>
                <Tabs.Content value="view" className="right-frame-tab-content">
{selectedDocument ? (
  selectedDocument.is_deleted ? (
    <div className="right-frame-placeholder">
      <div className="placeholder-icon">🔒</div>
      <div className="placeholder-text">
        Документ "{selectedDocument.document_name}" был удален<br />
        <span style={{fontSize: '13px', color: '#6c757d'}}>Просмотр недоступен</span>
      </div>
    </div>
  ) : (
    <PDFViewer onClose={() => updateContext({isRightFrameOpen: false})} />
  )
) : (
  <div className="right-frame-placeholder">
    <div className="placeholder-icon">📄</div>
    <div className="placeholder-text">
      Выберите документ для просмотра
    </div>
  </div>
)}                </Tabs.Content>
                <Tabs.Content value="tab2" className="right-frame-tab-content">
                  <DocumentDetails />
                </Tabs.Content>
              </Tabs.Root>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;