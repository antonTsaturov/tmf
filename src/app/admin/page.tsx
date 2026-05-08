// app/admin/page.tsx
'use client';
import { 
  Text, 
  Box, 
  Button,
  Tabs
} from '@radix-ui/themes';
import Link from 'next/link';
import UserMenu from '@/components/UserMenu';
import '../../styles/MyReviews.css';
import AuditTrailViewer from '@/components/admin/AuditTrailViewer';
import DeletedDocumentsViewer from '@/components/admin/DeletedDocumentsViewer';
import FoldersStructureManager from '@/components/admin/FoldersStructureManager';
import SiteManager from '@/components/admin/SiteManager';
import StudyManager from '@/components/admin/StudyManager';
import UserManager from '@/components/admin/UserManager/index';
import StudyArchivation from '@/components/admin/StudyArchivation';
import DataExport from '@/components/admin/DataExport';

export default function AdminDashboard() {
  


  return (
    <div className="main-box" style={{ height: '95vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <header className="toolbar-header">
        <div className="toolbar-title"></div>
        <Link href="/home">
          <Button variant="solid" mr="3" >
            <Text align="center">
              eTMF
            </Text>
          </Button>
        </Link>        
        <UserMenu />
      </header>

      <Box style={{ flex: 1, overflow: 'hidden' }}>
        <Tabs.Root defaultValue="tab1" orientation="vertical" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Tabs.List>
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
            <Tabs.Trigger value="tab7">
                Study archivation
            </Tabs.Trigger>
            <Tabs.Trigger value="tab8">
                Export
            </Tabs.Trigger>

          </Tabs.List>

          <Box pt="0" style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
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
              <Tabs.Content value="tab7">
                <StudyArchivation />
              </Tabs.Content>
              <Tabs.Content value="tab8">
                <DataExport />
              </Tabs.Content>
          </Box>
        </Tabs.Root>
      </Box>
    
    </div>
  );
}