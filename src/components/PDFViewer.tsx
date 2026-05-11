// components/PDFViewer.tsx
import React, { useContext, useEffect, useState } from 'react';
import { MainContext } from '@/wrappers/MainContext';
import { FiMaximize2, FiMinimize2 } from 'react-icons/fi';
import { MdCached } from "react-icons/md";
import { usePDFCache } from '@/hooks/usePDFCache';
import '../styles/PDFViewer.css';
import { Flex, Spinner } from '@radix-ui/themes';
import { logger } from '@/lib/utils/logger';
import { Worker, Viewer } from '@react-pdf-viewer/core';
import { toolbarPlugin } from '@react-pdf-viewer/toolbar';
import { HiOutlineExclamationTriangle } from "react-icons/hi2";

import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/toolbar/lib/styles/index.css';

interface PDFViewerProps {
  onClose?: () => void;
}

const PDFViewer: React.FC<PDFViewerProps> = () => {
  const { context } = useContext(MainContext)!;
  const { selectedDocument } = context;
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfData, setPdfData] = useState<Uint8Array | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [usingCache, setUsingCache] = useState(false);
  
  const { getCachedPDF, cachePDF } = usePDFCache();

  const toolbarPluginInstance = toolbarPlugin();

  const { Toolbar } = toolbarPluginInstance;
  

  useEffect(() => {
    const loadPDF = async () => {
      if (!selectedDocument) {
        setPdfData(null);
        return;
      }

      if (!selectedDocument.file_type?.includes('pdf')) {
        setError('Этот тип файла не поддерживается для предпросмотра');
        return;
      }

      setLoading(true);
      setError(null);
      setUsingCache(false);

      try {
        // Проверяем кэш
        const cached = await getCachedPDF(selectedDocument.id);
        
        if (cached) {
          // Используем кэшированную версию
          const blob = new Blob([cached.data], { type: 'application/pdf' });
          //const url = URL.createObjectURL(blob);
          //setPdfUrl(url);
          setPdfData(new Uint8Array(cached.data));
          setUsingCache(true);
          setLoading(false);
          return;
        }

        // Если нет в кэше, загружаем с сервера
        const response = await fetch(`/api/documents/${selectedDocument.id}/view`, {
          headers: {
            'Cache-Control': 'no-cache', // Проверяем свежую версию
          },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          
          if (response.status === 500 && errorData.error === 'File integrity check failed') {
            logger.error('PDF checksum verification failed', null, {
              documentId: selectedDocument.id,
              fileName: selectedDocument.file_name
            });
            setError('Файл повреждён в хранилище. Обратитесь к администратору.');
            setLoading(false);
            return;
          }
          
          throw new Error('Failed to load PDF');
        }

        // Получаем ETag для кэширования
        const etag = response.headers.get('ETag');
        
        // Загружаем данные
        const arrayBuffer = await response.arrayBuffer();
        
        // Сохраняем в кэш
        if (etag) {
          await cachePDF(selectedDocument.id, arrayBuffer, etag, selectedDocument.document_name || 'document.pdf');
        }

        // Создаем URL для отображения
        // const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
        // const url = URL.createObjectURL(blob);
        // setPdfUrl(url);
        setPdfData(new Uint8Array(arrayBuffer));
      } catch (err) {
        logger.error('Error loading PDF', err);
        setError('Failed to load PDF');
      } finally {
        setLoading(false);
      }
    };

    loadPDF();

    // Очистка URL при размонтировании
    return () => {
      if (pdfData && usingCache) {
        // URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [selectedDocument]);


  useEffect(() => {
    // Если панель закрывается
    if (!context.isRightFrameOpen) {
      // Очищаем URL если он существует
      if (pdfData) {
        //URL.revokeObjectURL(pdfData);
        setPdfData(null);
      }
      setError(null);
      setFullscreen(false);
    }
  }, [context.isRightFrameOpen, pdfData]);

  const toggleFullscreen = () => {
    setFullscreen(!fullscreen);
  };

  if (!selectedDocument) {
    return null;
  }

  if (loading) {
    return (
      <Flex align="center" justify="center" py="6">
        <Spinner size="2" />
      </Flex>    
    )
  }

  return (
    <div className={`pdf-viewer ${fullscreen ? 'fullscreen' : ''}`}>
      <div className="pdf-viewer-header">
          {usingCache && (
               <MdCached title={'Cashed file'}/>
          )}
        <div className="header-left">
          {/* <span className="document-title" title={selectedDocument.document_name}>
            {selectedDocument.document_name || 'Без названия'}
          </span> */}
        </div>
        <div className="header-actions">
          <Toolbar>
            {(slots) => {
              const {
                ZoomIn,
                ZoomOut,
                GoToPreviousPage,
                GoToNextPage,
                CurrentPageInput,
                NumberOfPages,
                Download,
                Zoom,
              } = slots;

              return (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    width: '100%',
                    padding: '0 12px',
                    gap: '12px',
                    fontSize: '12px',
                  }}
                >
                  {/* Левая часть */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <GoToPreviousPage />
                    <GoToNextPage />
                    <CurrentPageInput />
                    <span>/</span>
                    <NumberOfPages />
                  </div>

                  {/* Центр */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      margin: '0 auto',
                    }}
                  >
                    <ZoomOut />
                    <ZoomIn />
                    {fullscreen && (
                      <Zoom  />
                    )}
                  </div>

                  {/* Правая часть */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                  <Download />

                  </div>
                </div>
              );
            }}
          </Toolbar>

          <button 
            className="icon-button" 
            onClick={toggleFullscreen}
            title={fullscreen ? 'Оконный режим' : 'Полный экран'}
          >
            {fullscreen ? <FiMinimize2 strokeWidth={1.1} /> : <FiMaximize2 strokeWidth={1.1} />}
          </button>
        </div>
      </div>

      <div className="pdf-viewer-content">
        {loading && (
          <div className="pdf-viewer-loading-state">
            <div className="spinner"></div>
            <div>Загрузка документа...</div>
          </div>
        )}

        {error && (
          <div className="pdf-viewer-error-state">
            <div className="pdf-viewer-error-icon"><HiOutlineExclamationTriangle /></div>
            <div className="pdf-viewer-error-message">{error}</div>
          </div>
        )}

        {pdfData && !loading && !error && (
          <div className="pdf-viewer-content">
            <Worker workerUrl="/pdf.worker.min.js">
              <Viewer
                fileUrl={pdfData}
                plugins={[toolbarPluginInstance]}
                defaultScale={1}
              />
            </Worker>
          </div>
        )}        
      </div>
    </div>
  );
};

export default PDFViewer;