'use client'

import { useRef, useContext } from 'react';
import '@/styles/Home.css';
import FolderExplorer from '../../components/FolderExplorer';
import UserMenu from '@/components/UserMenu';
import { Tabs } from '@radix-ui/themes';
import Navigation from '@/components/Navigation';
import FolderContentViewer from '@/components/FolderContentViewer';
import DocumentActions from '@/components/DocumentActions';
import PDFViewer from '@/components/PDFViewer';
import DocumentDetails from '@/components/DocumentDetails';
import { MainContext } from '@/wrappers/MainContext';
import { FiX } from 'react-icons/fi';
// import DocumentStatusIndicator from '@/components/DocumentStatusIndicator';
import UserReviewsButton from '@/components/UserReviewsButton';
import { Title, TitleFontSize } from '../login/title';
import { useI18n } from '@/hooks/useI18n';

interface MainWindowProps {
  initialWidth?: number;
  minWidth?: number;
  maxWidth?: number;
}

const Home: React.FC<MainWindowProps> = () => {
  const { t } = useI18n('reviewsPage');
  const sidebarRef = useRef<HTMLDivElement>(null);
  const { context, updateContext } = useContext(MainContext)!;
  const { selectedDocument, isRightFrameOpen } = context!;

  return (
    <div className="sidebarresizable-root">

      <header className="toolbar-header">
        <Title fontSize={TitleFontSize.ExtraSmall} />
        <Navigation />     
        <div className="toolbar-title"></div>
        <UserReviewsButton/>
        <UserMenu />
      </header>
      <div className="sidebar-layout">
        {/* Folders Explorer*/}
        <div ref={sidebarRef} className="sidebar">
          <div className="sidebar-content">
            <div className="sidebar-content-area">
              <FolderExplorer
                showFileIcons={true}
                allowMultiSelect={true}
              />
            </div>
          </div>
        </div>
        {/* Main content */}
        <div className="main-content">
          <div className="main-content-row">
            {/* Actions Buttons */}
            <div className="main-content--buttons">
              <DocumentActions />
            </div>
            {/* Doc status Indicator */}
            {/* <div className="main-content--status">
              {selectedDocument?.status && (
                <DocumentStatusIndicator size="big" />
              )}
            </div> */}
          </div>
          {/* Selected Folder Content */}
          <div className="main-content-area">
            <FolderContentViewer />
          </div>
        </div>
        {/* Right frame */}
        {isRightFrameOpen && (
          <div className="right-frame">

            <div className="right-frame-content">

              <button className="right-frame-close-button" onClick={()=> updateContext({isRightFrameOpen: false})}>
                <FiX />
              </button>

              <Tabs.Root defaultValue="view" className="right-frame-tabs-root">
                <Tabs.List>
                  <Tabs.Trigger value="view">{t('docPreview')}</Tabs.Trigger>
                  <Tabs.Trigger value="tab2">{t('docDetails')}</Tabs.Trigger>
                </Tabs.List>
                <Tabs.Content value="view" className="right-frame-tab-content">
                  {selectedDocument ? (
                    selectedDocument.is_deleted ? (
                      <div className="right-frame-placeholder">
                        <div className="placeholder-icon">🔒</div>
                        <div className="placeholder-text">
                          {t('deletedDocTitle').replace('{name}', selectedDocument.document_name)}<br />
                          <span style={{fontSize: '13px', color: '#6c757d'}}>{t('viewNotAvailable')}</span>
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
                  )}                
                </Tabs.Content>
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