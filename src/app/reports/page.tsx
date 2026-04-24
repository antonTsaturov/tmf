// app/reports/page.tsx
"use client";

import { useContext } from "react";
import "@/styles/Home.css";
import UserMenu from "@/components/UserMenu";
import { MainContext } from "@/wrappers/MainContext";
import { FiX } from "react-icons/fi";
import UserReviewsButton from "@/components/UserReviewsButton";
import { Subtitle, Title, TitleFontSize } from "../../components/Title";
import { useI18n } from "@/hooks/useI18n";
import { ReportsSidebar } from "@/components/reports/ReportsSidebar";
import { ReportView } from "@/components/reports/ReportView";
import HomeButton from "@/components/HomeButton";
import { ReportProvider } from "@/wrappers/ReportContext";

export default function ReportsPage() {
  const { t } = useI18n("reviewsPage");
  const { context, updateContext } = useContext(MainContext)!;
  const { isRightFrameOpen } = context!;

  return (
    <ReportProvider>
      <div className="sidebarresizable-root">
        <header className="toolbar-header">
          <Title fontSize={TitleFontSize.ExtraSmall} subtitle={Subtitle.reports}/>
          <div className="toolbar-title"></div>
          <HomeButton />
          <UserReviewsButton />
          <UserMenu />
        </header>

        <div className="sidebar-layout">
          <div className="sidebar">
            <div className="sidebar-content">
              <div className="sidebar-content-area">
                <ReportsSidebar />
              </div>
            </div>
          </div>

          <div className="main-content">
            <div className="main-content-area">
              <ReportView />
            </div>
          </div>

          {isRightFrameOpen && (
            <div className="right-frame">
              <div className="right-frame-content">
                <button
                  className="right-frame-close-button"
                  onClick={() => updateContext({ isRightFrameOpen: false })}
                >
                  <FiX />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </ReportProvider>
  );
}