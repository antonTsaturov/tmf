"use client";

import { useContext, useState } from "react";
import "@/styles/Home.css";
import UserMenu from "@/components/UserMenu";
import Navigation from "@/components/Navigation";
import { MainContext } from "@/wrappers/MainContext";
import { FiX } from "react-icons/fi";
import UserReviewsButton from "@/components/UserReviewsButton";
import { Subtitle, Title, TitleFontSize } from "../../components/Title";
import { useI18n } from "@/hooks/useI18n";
import { ReportType } from "@/types/reports.type";
import { ReportsSidebar } from "@/components/reports/ReportsSidebar";
import { ReportView } from "@/components/reports/ReportView";
import HomeButton from "@/components/HomeButton";

export default function ReportsPage() {
  const { t } = useI18n("reviewsPage");
  const { context, updateContext } = useContext(MainContext)!;
  const { isRightFrameOpen } = context!;

  const [selectedReport, setSelectedReport] = useState<ReportType | null>(null);


  return (
    <div className="sidebarresizable-root">
      <header className="toolbar-header">
        <Title fontSize={TitleFontSize.ExtraSmall} subtitle={Subtitle.reports}/>
        <Navigation />
        <div className="toolbar-title"></div>


        <HomeButton />
        <UserReviewsButton />
        <UserMenu />
      </header>

      <div className="sidebar-layout">
        <div className="sidebar">
          <div className="sidebar-content">
            <div className="sidebar-content-area">
              <ReportsSidebar
                selected={selectedReport}
                onSelect={setSelectedReport}
              />
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="main-content">
          <div className="main-content-area">
            <ReportView reportType={selectedReport} />
          </div>
        </div>

        {/* Right frame */}
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
  );
}
