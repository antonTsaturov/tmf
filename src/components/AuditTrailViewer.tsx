// components/AuditTrailViewer.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { AuditLogEntry, AuditFilters, AuditResponse } from '@/types/types';
import '../styles/AuditTrailViewer.css';

interface AuditTrailViewerProps {
  entityType?: string;
  entityId?: string;
  onClose?: () => void;
}

const AuditTrailViewer: React.FC<AuditTrailViewerProps> = ({
  entityType,
  entityId,
  onClose
}) => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });
  
  const [filters, setFilters] = useState<AuditFilters>({
    entityType: entityType as any,
    entityId: entityId,
  });

  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const loadAuditLogs = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Строим query string из фильтров
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
        ...(filters.userId && { userId: filters.userId }),
        ...(filters.userEmail && { userEmail: filters.userEmail }),
        ...(filters.action && { action: filters.action }),
        ...(filters.entityType && { entityType: filters.entityType }),
        ...(filters.entityId && { entityId: filters.entityId }),
        ...(filters.status && { status: filters.status }),
        ...(filters.siteId && { siteId: filters.siteId }),
        ...(filters.studyId && { studyId: filters.studyId }),
        ...(filters.search && { search: filters.search }),
      });

      const response = await fetch(`/api/audit?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to load audit logs');
      }

      const data: AuditResponse = await response.json();
      setLogs(data.logs);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading audit logs');
      console.error('Error loading audit logs:', err);
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.page, pagination.limit]);

  useEffect(() => {
    loadAuditLogs();
  }, [loadAuditLogs]);

  const handleFilterChange = (key: keyof AuditFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 })); // Сброс на первую страницу
  };

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const clearFilters = () => {
    setFilters({
      entityType: entityType as any,
      entityId: entityId,
    });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getActionColor = (action: string): string => {
    const colors: Record<string, string> = {
      'CREATE': '#4CAF50',
      'UPDATE': '#2196F3',
      'DELETE': '#F44336'
    };
    return colors[action] || '#666';
  };

  const getStatusColor = (status: string): string => {
    return status === 'SUCCESS' ? '#4CAF50' : '#F44336';
  };

  const formatValue = (value: any): string => {
    if (!value) return 'null';
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  const truncateText = (text: string, maxLength: number = 50): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <div className="audit-trail-viewer">
      <div className="audit-header">
        <h2>Audit Trail</h2>
        {onClose && (
          <button className="close-button" onClick={onClose}>×</button>
        )}
      </div>

      {/* Панель фильтров */}
      <div className="filters-panel">
        <button 
          className="toggle-filters"
          onClick={() => setShowFilters(!showFilters)}
        >
          {showFilters ? '▼ Скрыть фильтры' : '▶ Показать фильтры'}
        </button>

        {showFilters && (
          <div className="filters-grid">
            <div className="filter-group">
              <label>Дата от:</label>
              <input
                type="datetime-local"
                value={filters.startDate || ''}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
              />
            </div>

            <div className="filter-group">
              <label>Дата до:</label>
              <input
                type="datetime-local"
                value={filters.endDate || ''}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
              />
            </div>

            <div className="filter-group">
              <label>Email пользователя:</label>
              <input
                type="text"
                value={filters.userEmail || ''}
                onChange={(e) => handleFilterChange('userEmail', e.target.value)}
                placeholder="user@example.com"
              />
            </div>

            <div className="filter-group">
              <label>Действие:</label>
              <select
                value={filters.action || ''}
                onChange={(e) => handleFilterChange('action', e.target.value || undefined)}
              >
                <option value="">Все</option>
                <option value="CREATE">CREATE</option>
                <option value="UPDATE">UPDATE</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Тип сущности:</label>
              <input
                type="text"
                value={filters.entityType || ''}
                onChange={(e) => handleFilterChange('entityType', e.target.value)}
                placeholder="DOCUMENT, FOLDER, etc."
              />
            </div>

            <div className="filter-group">
              <label>ID сущности:</label>
              <input
                type="text"
                value={filters.entityId || ''}
                onChange={(e) => handleFilterChange('entityId', e.target.value)}
                placeholder="UUID"
              />
            </div>

            <div className="filter-group">
              <label>Статус:</label>
              <select
                value={filters.status || ''}
                onChange={(e) => handleFilterChange('status', e.target.value || undefined)}
              >
                <option value="">Все</option>
                <option value="SUCCESS">SUCCESS</option>
                <option value="FAILURE">FAILURE</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Поиск:</label>
              <input
                type="text"
                value={filters.search || ''}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder="Поиск по тексту..."
              />
            </div>

            <div className="filter-actions">
              <button className="clear-filters" onClick={clearFilters}>
                Очистить фильтры
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Состояния загрузки и ошибок */}
      {loading && (
        <div className="loading-state">
          <div className="spinner"></div>
          <div>Загрузка записей аудита...</div>
        </div>
      )}

      {error && (
        <div className="error-state">
          <span className="error-icon">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Таблица с записями */}
      {!loading && !error && (
        <>
          <div className="logs-table">
            <div className="table-header">
              <div className="col-time">Время</div>
              <div className="col-user">Пользователь</div>
              <div className="col-action">Действие</div>
              <div className="col-entity">Сущность</div>
              <div className="col-entity-id">ID</div>
              <div className="col-status">Статус</div>
            </div>

            <div className="table-body">
              {logs.length === 0 ? (
                <div className="empty-state">
                  <p>Нет записей аудита</p>
                </div>
              ) : (
                logs.map((log) => (
                  <React.Fragment key={log.audit_id}>
                    <div 
                      className={`table-row ${expandedRow === log.audit_id ? 'expanded' : ''}`}
                      onClick={() => setExpandedRow(
                        expandedRow === log.audit_id ? null : log.audit_id
                      )}
                    >
                      <div className="col-time">{formatDate(log.created_at)}</div>
                      <div className="col-user">
                        <div className="user-info">
                          <span className="user-email">{log.user_email}</span>
                          <span className="user-id">ID: {log.user_id}</span>
                        </div>
                      </div>
                      <div className="col-action">
                        <span 
                          className="audit-action-badge"
                          style={{ backgroundColor: getActionColor(log.action) + '20', color: getActionColor(log.action) }}
                        >
                          {log.action}
                        </span>
                      </div>
                      <div className="col-entity">
                        <span className="entity-type">{log.entity_type}</span>
                      </div>
                      <div className="col-entity-id">
                        <span className="entity-id" title={log.entity_id}>
                          {truncateText(log.entity_id)}
                        </span>
                      </div>
                      <div className="col-status">
                        <span 
                          className="audit-status-badge"
                          style={{ 
                            backgroundColor: getStatusColor(log.status) + '20', 
                            color: getStatusColor(log.status) 
                          }}
                        >
                          {log.status}
                          {log.status === 'FAILURE' && log.error_message && (
                            <span className="error-tooltip" title={log.error_message}>
                              ⚠️
                            </span>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Детальная информация (показывается при раскрытии) */}
                    {expandedRow === log.audit_id && (
                      <div className="expanded-details">
                        <div className="details-grid">
                          <div className="detail-section">
                            <h4>Информация о запросе</h4>
                            <div className="detail-item">
                              <span className="detail-label">IP адрес:</span>
                              <span className="detail-value">{log.ip_address}</span>
                            </div>
                            <div className="detail-item">
                              <span className="detail-label">User Agent:</span>
                              <span className="detail-value">{log.user_agent}</span>
                            </div>
                            <div className="detail-item">
                              <span className="detail-label">Session ID:</span>
                              <span className="detail-value">{log.session_id}</span>
                            </div>
                            {log.reason && (
                              <div className="detail-item">
                                <span className="detail-label">Причина:</span>
                                <span className="detail-value">{log.reason}</span>
                              </div>
                            )}
                            {log.site_id && (
                              <div className="detail-item">
                                <span className="detail-label">Site ID:</span>
                                <span className="detail-value">{log.site_id}</span>
                              </div>
                            )}
                            {log.study_id && (
                              <div className="detail-item">
                                <span className="detail-label">Study ID:</span>
                                <span className="detail-value">{log.study_id}</span>
                              </div>
                            )}
                          </div>

                          <div className="detail-section">
                            <h4>Изменения</h4>
                            {log.old_value && (
                              <div className="detail-item">
                                <span className="detail-label">Старое значение:</span>
                                <pre className="json-value">{formatValue(log.old_value)}</pre>
                              </div>
                            )}
                            {log.new_value && (
                              <div className="detail-item">
                                <span className="detail-label">Новое значение:</span>
                                <pre className="json-value">{formatValue(log.new_value)}</pre>
                              </div>
                            )}
                          </div>

                          {log.error_message && (
                            <div className="detail-section error">
                              <h4>Ошибка</h4>
                              <div className="error-message">
                                {log.error_message}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </React.Fragment>
                ))
              )}
            </div>
          </div>

          {/* Пагинация */}
          {pagination.totalPages > 1 && (
            <div className="pagination">
              <button
                disabled={pagination.page === 1}
                onClick={() => handlePageChange(pagination.page - 1)}
              >
                ←
              </button>
              
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                .filter(p => 
                  p === 1 || 
                  p === pagination.totalPages || 
                  Math.abs(p - pagination.page) <= 2
                )
                .map((p, i, arr) => (
                  <React.Fragment key={p}>
                    {i > 0 && arr[i - 1] !== p - 1 && <span className="ellipsis">...</span>}
                    <button
                      className={p === pagination.page ? 'active' : ''}
                      onClick={() => handlePageChange(p)}
                    >
                      {p}
                    </button>
                  </React.Fragment>
                ))
              }
              
              <button
                disabled={pagination.page === pagination.totalPages}
                onClick={() => handlePageChange(pagination.page + 1)}
              >
                →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AuditTrailViewer;