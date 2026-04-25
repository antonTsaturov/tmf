import { ActionConfigProps } from "@/components/DocumentActions";
import { useI18n } from "@/hooks/useI18n";
import { DocumentAction } from "@/types/document";
import {
  FiFilePlus,
  FiSend,
  FiCheckCircle,
  FiArchive,
  FiRefreshCw,
  FiTrash2,
  FiDownload,
  FiEye,
  FiUploadCloud,
  FiEdit
} from 'react-icons/fi';

// Хук для создания локализованного маппинга
export const useLocalizedActionConfig = (): Partial<Record<DocumentAction, ActionConfigProps>> => {
  const { t } = useI18n('documentActions');
  
  return {
    [DocumentAction.CREATE_DOCUMENT]: { 
        icon: <FiFilePlus />, 
        label: t('create'),
        tooltip: t('create_tooltip'),
        variant: 'solid',
        highContrast: true
    },
    [DocumentAction.SUBMIT_FOR_REVIEW]: { 
        icon: <FiSend />, 
        label: t('submit'),
        tooltip: t('submit_tooltip'),
        variant: 'soft',
    },
    [DocumentAction.APPROVE]: { 
        icon: <FiCheckCircle />, 
        label: t('approve'),
        tooltip: t('approve_tooltip'),
        variant: 'solid',
    },
    // [DocumentAction.REJECT]: { // Не используется. Реджект выполняется через Approve
    //   icon: <FiX />, 
    //   label: 'Отклонить',
    //   variant: 'solid',
    //   //color: Colors.RED
    // },
    [DocumentAction.ARCHIVE]: { 
        icon: <FiArchive />, 
        label: t('archive'),
        tooltip: t('archive_tooltip'),
        variant: 'soft',
    },
    [DocumentAction.UNARCHIVE]: {  //Admin only
        icon: <FiRefreshCw />, 
        label: t('unarchive'),
        tooltip: t('unarchive_tooltip'),
        variant: 'soft'
    },
    [DocumentAction.SOFT_DELETE]: { 
        icon: <FiTrash2 />, 
        label: t('delete'),
        tooltip: t('delete_tooltip'),
        variant: 'solid',
    },
    [DocumentAction.RESTORE]: { //Admin only
        icon: <FiRefreshCw />, 
        label: t('restore'),
        tooltip: t('restore_tooltip'),
        variant: 'solid'
    },
    [DocumentAction.UPLOAD_NEW_VERSION]: { 
        icon: <FiUploadCloud />, 
        label: t('newVersion'),
        tooltip: t('newVersion_tooltip'),
        variant: 'soft',
    },
    [DocumentAction.VIEW]: { 
        icon: <FiEye />, 
        label: t('view'),
        tooltip: t('view_tooltip'),
        variant: 'soft'
    },
    [DocumentAction.DOWNLOAD]: { 
        icon: <FiDownload />, 
        label: t('download'),
        tooltip: t('download_tooltip'),
        variant: 'soft'
    },
    [DocumentAction.EDIT]: { 
        icon: <FiEdit />, 
        label: t('edit'),
        tooltip: t('edit_tooltip'),
        variant: 'soft'
    }
  };
};

