// components/PDFViewer.tsx
import React, { useContext, useEffect, useState, useRef } from 'react';
import { MainContext } from '@/wrappers/MainContext';
import { FiX, FiDownload, FiMaximize2, FiMinimize2 } from 'react-icons/fi';
import { MdCached } from "react-icons/md";
import { usePDFCache } from '@/hooks/usePDFCache';
import '../styles/PDFViewer.css';

interface PDFViewerProps {
  onClose?: () => void;
}

const PDFViewer: React.FC<PDFViewerProps> = ({ onClose }) => {
  const { context } = useContext(MainContext)!;
  const { selectedDocument } = context;
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [usingCache, setUsingCache] = useState(false);
  
  const objectRef = useRef<HTMLObjectElement>(null);
  const { getCachedPDF, cachePDF } = usePDFCache();

  useEffect(() => {
    const loadPDF = async () => {
      if (!selectedDocument) {
        setPdfUrl(null);
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
          const url = URL.createObjectURL(blob);
          setPdfUrl(url);
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
        const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        setPdfUrl(url);
        
      } catch (err) {
        console.error('Error loading PDF:', err);
        setError('Не удалось загрузить PDF');
      } finally {
        setLoading(false);
      }
    };

    loadPDF();

    // Очистка URL при размонтировании
    return () => {
      if (pdfUrl && usingCache) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [selectedDocument]);

  const handleDownload = async () => {
    if (!selectedDocument) return;

    try {
      // Проверяем кэш сначала
      const cached = await getCachedPDF(selectedDocument.id);
      
      if (cached) {
        // Скачиваем из кэша
        const blob = new Blob([cached.data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = selectedDocument.document_name || 'document.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        return;
      }

      // Если нет в кэше, скачиваем с сервера
      const response = await fetch(`/api/documents/${selectedDocument.id}/view`);
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = selectedDocument.document_name || 'document.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
    } catch (err) {
      console.error('Download error:', err);
      alert('Не удалось скачать документ');
    }
  };

  const handleClose = () => {
    if (pdfUrl && usingCache) {
      URL.revokeObjectURL(pdfUrl);
    }
    setPdfUrl(null);
    setError(null);
    setFullscreen(false);
    onClose?.();
  };

  const toggleFullscreen = () => {
    setFullscreen(!fullscreen);
  };

  if (!selectedDocument) {
    return null;
  }

  return (
    <div className={`pdf-viewer ${fullscreen ? 'fullscreen' : ''}`}>
      <div className="pdf-viewer-header">
          {usingCache && (
               <MdCached title={'Cashed file'}/>
          )}
        <div className="header-left">
          <span className="document-title" title={selectedDocument.document_name}>
            {selectedDocument.document_name || 'Без названия'}
          </span>
        </div>
        <div className="header-actions">
          <button 
            className="icon-button" 
            onClick={toggleFullscreen}
            title={fullscreen ? 'Оконный режим' : 'Полный экран'}
          >
            {fullscreen ? <FiMinimize2 /> : <FiMaximize2 />}
          </button>
          <button 
            className="icon-button" 
            onClick={handleDownload}
            title="Скачать"
          >
            <FiDownload />
          </button>
          <button className="close-button" onClick={handleClose}>
            <FiX />
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
            <div className="pdf-viewer-error-icon">⚠️</div>
            <div className="pdf-viewer-error-message">{error}</div>
            <button className="download-button" onClick={handleDownload}>
              <FiDownload /> Скачать файл
            </button>
          </div>
        )}

        {pdfUrl && !loading && !error && (
          <object
            ref={objectRef}
            data={pdfUrl}
            type="application/pdf"
            className="pdf-object"
            aria-label="PDF Viewer"
            style={{width: '100%'}}
          >
            <div className="fallback-message">
              <p>Ваш браузер не поддерживает встроенный просмотр PDF.</p>
              <button className="download-button" onClick={handleDownload}>
                <FiDownload /> Скачать PDF
              </button>
            </div>
          </object>
        )}
      </div>
    </div>
  );
};

export default PDFViewer;