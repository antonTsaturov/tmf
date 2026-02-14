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


interface MainWindowProps {
  initialWidth?: number;
  minWidth?: number;
  maxWidth?: number;
}

const Home: React.FC<MainWindowProps> = () => {

  const [showRightFrame, setShowRightFrame] = useState<boolean>(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const { isOpen, openModal, closeModal, modalProps } = useModal();
  const [foldersStructure, setFoldersStructure] = useState(undefined)

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

            
          </Box>
        </Tabs.Root>
      </Modal>

      <header className="toolbar-header">
        <StudySiteNavigation /> 
        <div className="toolbar-title"></div>
        <UserMenu />
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
        >
          <div className="sidebar-content">

                       
            <div className="sidebar-content-area">
              <FileExplorer
                //siteId={}
                //data={foldersStructure}
                // onSelect={handleSelect}
                // onToggle={handleToggle}
                showFileIcons={true}
                allowMultiSelect={true}
              />
            </div>
          </div>
        </div>
        <div className="main-content">
          <div className="main-content-path"></div>
          <div className="main-content-area">
            <FolderContentViewer />
          </div>
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