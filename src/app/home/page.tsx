"use client";

import { useRef, useContext, useEffect, useCallback, useState } from "react";
import "@/styles/Home.css";
import FolderExplorer from "@/components/FolderExplorer/index";
import UserMenu from "@/components/UserMenu";
import { Tabs } from "@radix-ui/themes";
import Navigation from "@/components/Navigation";
import FolderContentViewer from "@/components/FolderContentViewer";
import DocumentActions from "@/components/DocumentActions";
import PDFViewer from "@/components/PDFViewer";
import DocumentDetails from "@/components/DocumentDetails";
import { MainContext } from "@/wrappers/MainContext";
import { FiX } from "react-icons/fi";
import DocumentStatusIndicator from '@/components/DocumentStatusIndicator';
import UserReviewsButton from "@/components/UserReviewsButton";
import { Title, TitleFontSize } from "../../components/Title";
import { useI18n } from "@/hooks/useI18n";
import StudyReportsButton from "@/components/StudyReportsButton";
import { StudyDocumentSearch } from "@/components/StudyDocumentSearch";
import FoldersList from "@/components/FoldersList";
import { WelcomeScreen } from "@/components/ui/WelcomeScreen";
import { StudyMap } from "@/components/ui/StudyMap";
import { ViewLastDocuments } from "@/components/ui/ViewLastDocuments";
import { ViewLevel } from "@/types/types";

interface MainWindowProps {
  initialWidth?: number;
  minWidth?: number;
  maxWidth?: number;
}
const SIDEBAR_MIN_WIDTH = 400;
const SIDEBAR_MAX_WIDTH = 600;

const Home: React.FC<MainWindowProps> = () => {
  const { t } = useI18n("reviewsPage");
  const sidebarRef = useRef<HTMLDivElement>(null);
  const { context, updateContext } = useContext(MainContext)!;
  const { selectedDocument, isRightFrameOpen, selectedFolder, 
    currentLevel, currentStudy, showLastDocuments } = context!;

  const folderChildren = selectedFolder?.children || [];
  // State for sidebar width
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_MIN_WIDTH); // default width
  const [isResizing, setIsResizing] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback(
    (e: MouseEvent) => {
      if (isResizing) {
        const newWidth = e.clientX;
        if (newWidth >= SIDEBAR_MIN_WIDTH && newWidth <= SIDEBAR_MAX_WIDTH) {
          setSidebarWidth(newWidth);
        }
      }
    },
    [isResizing, SIDEBAR_MIN_WIDTH, SIDEBAR_MAX_WIDTH]
  );

  useEffect(() => {
    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResizing);
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [resize, stopResizing]);

  useEffect(() => {
    const savedWidth = localStorage.getItem('sidebarWidth');
    if (savedWidth) {
      const width = parseInt(savedWidth);
      if (width >= SIDEBAR_MIN_WIDTH && width <= SIDEBAR_MAX_WIDTH) {
        setSidebarWidth(width);
      }
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded && !isResizing) {
      localStorage.setItem('sidebarWidth', sidebarWidth.toString());
    }

  }, [isResizing, isLoaded, sidebarWidth]);
    
  const showFolderContentViewer = selectedFolder && selectedFolder?.children?.length === 0;
  const showFoldersList = selectedFolder && folderChildren.length > 0;
  const showWelcomeScreen = !selectedFolder && !currentStudy && !currentLevel;
  const showStudyMap = !selectedFolder && currentStudy !== undefined && showLastDocuments === false;
  const showLast = !selectedFolder  && showLastDocuments === true;
  const level = currentLevel as ViewLevel;

  return (
    <div className={`sidebarresizable-root ${isResizing ? "resizing" : ""}`}>
      <header className="toolbar-header">
        <Title fontSize={TitleFontSize.ExtraSmall} />
        <Navigation />
        <div className="toolbar-title"></div>
        <StudyDocumentSearch />
        <StudyReportsButton />
        <UserReviewsButton />
        <UserMenu />
      </header>
      <div className="sidebar-layout">
        {/* Folders Explorer*/}
        <div ref={sidebarRef} className="sidebar" style={{ width: `${sidebarWidth}px` }}>
          <div className="sidebar-content">
            <div className="sidebar-content-area">
              <FolderExplorer showFileIcons={true} allowMultiSelect={true} />
            </div>
          </div>
        </div>

        {/* Resize handle */}
        <div 
          className="resize-handle"
          onMouseDown={startResizing}
        >
          <div className="resize-handle-line"></div>
        </div>

        {/* Main content */}
        <div className="main-content">
          <div className="main-content-row">
            {/* Actions Buttons */}
            <div className="main-content--buttons">
              {selectedDocument && <DocumentActions />}
            </div>
          </div>

          {/* Selected Folder Content */}
          <div className="main-content-area">
            {showFolderContentViewer && (
              <FolderContentViewer />
            )}
            {showWelcomeScreen && (
              <WelcomeScreen />
            )}
            {showStudyMap && (
              <StudyMap />
            )}
            {showLast && (
              <ViewLastDocuments 
                level={level}
              />
            )}
            {showFoldersList && (
              <FoldersList />
            )}
          </div>
        </div>
        {/* Right frame */}
        {isRightFrameOpen && (
          <div className="right-frame">
            <div className="right-frame-content">

              <Tabs.Root defaultValue="view" className="right-frame-tabs-root">
                <Tabs.List style={{textAlign: 'center'}}>

                  <button
                    className="right-frame-close-button"
                    onClick={() => updateContext({ isRightFrameOpen: false })}
                  >
                    <FiX />
                  </button>

                  <Tabs.Trigger value="view">{t("docPreview")}</Tabs.Trigger>
                  <Tabs.Trigger value="tab2">{t("docDetails")}</Tabs.Trigger>
                </Tabs.List>
                <Tabs.Content value="view" className="right-frame-tab-content">
                  {selectedDocument ? (
                    selectedDocument.is_deleted ? (
                      <div className="right-frame-placeholder">
                        <div className="placeholder-icon">🔒</div>
                        <div className="placeholder-text">
                          {t("deletedDocTitle").replace(
                            "{name}",
                            selectedDocument.document_name,
                          )}
                          <br />
                          <span style={{ fontSize: "13px", color: "#6c757d" }}>
                            {t("viewNotAvailable")}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <PDFViewer
                        onClose={() =>
                          updateContext({ isRightFrameOpen: false })
                        }
                      />
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
                  {/* Doc status Indicator */}
                  <div className="main-content--status">
                    {selectedDocument?.status && (
                      <DocumentStatusIndicator size="big" />
                    )}
                  </div>
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
