// src/components/StudyDocumentSearch.tsx
import * as React from "react";
import {
  Box,
  Flex,
  IconButton,
  TextField,
  Badge,
  Separator,
  Text,
  Dialog,
  VisuallyHidden,
  Spinner,
  Button,
  Tooltip,
} from "@radix-ui/themes";
import { MagnifyingGlassIcon, Cross2Icon } from "@radix-ui/react-icons";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useContext, useEffect, useState } from "react";
import { DocumentStatusConfig, DocumentWorkFlowStatus } from '@/types/document.status';
import { DocumentLink } from "@/types/document";
import { RadixColors } from "@/lib/config/constants";
import { ViewLevel } from "@/types/types";
import { MainContext, MainContextProps } from "@/wrappers/MainContext";
import { AdminContext } from "@/wrappers/AdminContext";
import { FileNode } from "./FolderExplorer/index";
import { findNodeById } from "./FolderExplorer/utils/folderHelpers";
import { fetchDocuments, searchConfig as config } from "@/lib/utils/search";
import { useDebounce } from "@/hooks/useDebounce";


export type FilterKey = "all" | DocumentWorkFlowStatus;

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: DocumentWorkFlowStatus.DRAFT, label: "Draft" },
  { key: DocumentWorkFlowStatus.IN_REVIEW, label: "In Review" },
  { key: DocumentWorkFlowStatus.APPROVED, label: "Approved" },
  { key: DocumentWorkFlowStatus.ARCHIVED, label: "Archived" },
  // DELETED обычно не показываем в поиске
];

const LevelFilters =[
  {key: ViewLevel.SITE, label: 'Site'},
  {key: ViewLevel.GENERAL, label: 'General'},
  {key: ViewLevel.COUNTRY, label: 'Country'}
]

// Функция для определения уровня документа по folder_id
const getDocumentLevel = (folderId?: string): ViewLevel => {
  if (!folderId) return ViewLevel.ROOT;
  
  const lowerFolderId = folderId.toLowerCase();
  if (lowerFolderId.includes("general")) return ViewLevel.GENERAL;
  if (lowerFolderId.includes("country")) return ViewLevel.COUNTRY;
  if (lowerFolderId.includes("site")) return ViewLevel.SITE;
  
  return ViewLevel.ROOT;
};

// const fetchDocuments = async (
//   query: string,
//   filter: FilterKey,
//   signal?: AbortSignal
// ): Promise<DocumentLink[]> => {
//   // 🔒 защита от лишних вызовов (дополнительно к enabled в react-query)
//   if (!query.trim()) return [];

//   const params = new URLSearchParams({
//     q: query.trim(),
//     filter: filter === "all" ? "all" : String(filter),
//   });

//   const response = await fetch(
//     `/api/documents/search?${params.toString()}`,
//     {
//       method: "GET",
//       credentials: "include",
//       signal,
//     }
//   );

//   // 🔐 auth handling
//   if (response.status === 401) {
//     throw new Error("Session expired");
//   }

//   if (!response.ok) {
//     let message = "Failed to fetch documents";

//     try {
//       const errorData = await response.json();
//       message = errorData.error || message;
//     } catch {
//       // ignore JSON parse error
//     }

//     throw new Error(message);
//   }

//   const data = await response.json();

//   // 🧠 гарантируем стабильный контракт
//   return data.documents ?? [];
// };

export const StudyDocumentSearch: React.FC = () => {
  const {updateContext} = useContext(MainContext)!;
  const { studies } = useContext(AdminContext)!;
  const [query, setQuery] = React.useState("");
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [showLevelFilters, setShowLevelFilters] = useState(false);
  const [activeLevelFilter, setActiveLevelFilter] = useState<ViewLevel>(ViewLevel.ROOT);
  const [open, setOpen] = useState(false); // Контролируем состояние диалога

  const debouncedQuery = useDebounce(query, 400);
  const hasQuery = debouncedQuery.trim().length > 0;  

  const { 
    data: rawResults = [], 
    isLoading, 
    isFetching, 
    error,
    //dataUpdatedAt // Можно использовать для отображения времени последнего обновления
  } = useQuery({
    queryKey: ["documents", debouncedQuery, activeFilter],
    queryFn: ({ signal }) => fetchDocuments(debouncedQuery, activeFilter, signal),
    enabled: hasQuery,
    //staleTime: 30 * 1000, // 30 секунд для поиска - более актуальные данные
    //gcTime: 5 * 60 * 1000, // 5 минут в кэше (вместо cacheTime в v5)
    // Дополнительные опции для поиска:
    placeholderData: (previousData) => previousData, // Показывает старые данные при новом поиске
    //refetchOnWindowFocus: false, // Не обновлять при фокусе окна
    //retry: 1, // Только 1 повтор при ошибке
    ...config
  });

  // Фильтрация результатов по уровню (General/Country/Site) на основе folder_id
  const results = React.useMemo(() => {
    if (activeLevelFilter === "root") return rawResults;
    
    return rawResults.filter((doc) => {
      const docLevel = getDocumentLevel(doc.folder_id);
      return docLevel === activeLevelFilter;
    });
  }, [rawResults, activeLevelFilter]);

  const clearAll = () => {
    setQuery("");
    setActiveFilter("all");
    setActiveLevelFilter(ViewLevel.ROOT);
    setShowLevelFilters(false);
  };  

  // клавиатурные сокращения
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K или Cmd+K для открытия поиска
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        // Открыть диалог - нужно добавить ref или состояние
      }
      // Escape для очистки
      if (e.key === 'Escape' && query) {
        clearAll();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [query]);  

  // Посветка совпадения в найденных результатах
  const highlightMatch = (text: string, query: string) => {
    if (!query) return text;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === query.toLowerCase() ? 
        <mark key={i} style={{ backgroundColor: 'var(--accent-4)' }}>{part}</mark> : 
        part
    );
  };

const handleDocumentClick = useCallback((doc: DocumentLink) => {
  const study = studies.find((s) => s.id === doc.study.id);
  const docLevel = getDocumentLevel(doc.folder_id);
  const folderNode = findNodeById([study?.folders_structure] as FileNode[], String(doc.folder_id));

  // Сначала закрываем диалог
  setOpen(false);

  // Собираем все обновления в один объект
  const updates: Partial<MainContextProps> = {
    currentStudy: study,
    currentLevel: docLevel,
    selectedFolder: folderNode,
  };
  
  if (docLevel !== ViewLevel.SITE) {
    updates.currentCountry = doc?.country;
  }
  
  if (doc?.site) {
    updates.currentCountry = doc?.country || 'Russia'; // NB!
    updates.countryFilter = doc.study.countries;
    updates.currentSite = doc?.site;
  }
  
  updateContext(updates);
}, [studies, updateContext]);

  // Получение цвета для уровня
  const getLevelColor = useCallback((level: ViewLevel): RadixColors => {
    switch (level) {
      case ViewLevel.GENERAL: return "blue";
      case ViewLevel.COUNTRY: return "green";
      case ViewLevel.SITE: return "orange";
      default: return "gray";
    }
  }, []);

  // Получение иконки для уровня (опционально)
  const getLevelLabel = useCallback((level: ViewLevel): string => {
    switch (level) {
      case ViewLevel.GENERAL: return "General";
      case ViewLevel.COUNTRY: return "Country";
      case ViewLevel.SITE: return "Site";
      default: return "Unknown";
    }
  }, []); 

  // Закрываем диалог и очищаем при закрытии
  const handleOpenChange = useCallback((newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      clearAll();
    }
  }, [clearAll]);  

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange} >
      <Tooltip content="Search documents" delayDuration={200}>
      <Dialog.Trigger >
        <IconButton variant="surface" mr="2" style={{ cursor: "pointer" }}>
          <MagnifyingGlassIcon />
        </IconButton>
      </Dialog.Trigger>
      </Tooltip>

      <Dialog.Content onCloseAutoFocus={(event) => event.preventDefault()}>
        <Flex direction="column" gap="3">
          
          {/* Header */}
          <Flex justify="between" align="start">
            <Flex direction="column" gap="1">
              <Dialog.Title size="3" weight="medium">Search documents</Dialog.Title>
              <Dialog.Description size="2" color="gray">
                <VisuallyHidden>
                  Search and filter study documents
                </VisuallyHidden>
              </Dialog.Description>
            </Flex>

            <Dialog.Close>
              <IconButton variant="ghost">
                <Cross2Icon />
              </IconButton>
            </Dialog.Close>
          </Flex>

          {/* Input */}
          <TextField.Root
            placeholder="Search documents..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          >
            <TextField.Slot>
              <MagnifyingGlassIcon />
            </TextField.Slot>
            <TextField.Slot side="right">
              {(isLoading || isFetching) && <Spinner size="1" />}
            </TextField.Slot>            
          </TextField.Root>

          {/* Filters */}
          <Flex direction="column" gap="2">
            <Flex justify="between">
              <Flex gap="2">
              {FILTERS.map((filter) => (
                <Badge
                  key={filter.key}
                  variant={activeFilter === filter.key ? "solid" : "soft"}
                  style={{ cursor: "pointer" }}
                  onClick={() => setActiveFilter(filter.key)}
                >
                  {filter.label}
                </Badge>
              ))}
              </Flex>
              {/* Маленькая кнопка для показа дополнительных фильтров */}
              <Tooltip content="More filters" delayDuration={200}>
                <Badge
                  variant="soft"
                  style={{ 
                    cursor: "pointer", 
                    padding: "0 6px",
                    backgroundColor: showLevelFilters ? 'var(--accent-5)' : undefined
                  }}
                  onClick={() => setShowLevelFilters(!showLevelFilters)}
                >
                  ⋯
                </Badge>
              </Tooltip>
            </Flex>

            {/* Дополнительные фильтры уровней */}
            {showLevelFilters && (
              <Flex wrap="wrap" gap="2" style={{ paddingLeft: 0 }}>
                <Badge
                  variant={activeLevelFilter === "root" ? "solid" : "soft"}
                  style={{ cursor: "pointer" }}
                  onClick={() => setActiveLevelFilter(ViewLevel.ROOT)}
                  color="purple"
                >
                  All
                </Badge>
                {LevelFilters.map((filter) => (
                  <Badge
                    key={filter.key}
                    color="purple"
                    variant={activeLevelFilter === filter.key ? "solid" : "soft"}
                    style={{ cursor: "pointer" }}
                    onClick={() => setActiveLevelFilter(filter.key)}
                  >
                    {filter.label}
                  </Badge>
                ))}
              </Flex>
            )}
          </Flex>          

          <Separator size="4" />

          {/* Счетчик результатов и кнопка Clear all */}
          <Flex justify="between" align="center">
            {hasQuery && <Text size="1" color="gray">
              
              {results.length} document{results.length !== 1 ? 's' : ''} found
              {activeLevelFilter !== "root" && results.length !== rawResults.length && (
                <Text as="span" size="1" color="gray" ml="1">
                  (filtered from {rawResults.length})
                </Text>
              )}
            </Text>}
            {hasQuery && (
              <Button variant="ghost" size="1" color="plum" onClick={clearAll} mr="2">
                Clear all
              </Button>
            )}
          </Flex>          

          {/* Results  */}
          <Box style={{ maxHeight: 300, height: 300, overflowY: "auto" }}>
            {!hasQuery ? (
              <Flex justify="center" align="center" style={{ height: "100%" }}>
                <Text size="2" color="gray">
                  Start typing to search documents
                </Text>
              </Flex>

            ) : isLoading ? (
              <Flex justify="center" align="center" style={{ height: "100%" }}>
                <Spinner size="3" />
              </Flex>              

            ) : results.length === 0 ? (
              <Flex justify="center" align="center" style={{ height: "100%" }}>
                <Text size="2" color="gray">
                  {rawResults.length > 0 
                    ? `No documents match the "${getLevelLabel(activeLevelFilter !== "root" ? activeLevelFilter : ViewLevel.ROOT)}" filter`
                    : "No documents found"}
                </Text>
              </Flex>

            ) : (
              <Flex direction="column" gap="2">
                {results.map((doc, index) => {
                  const docLevel = getDocumentLevel(doc.folder_id);
                  return (
                    <Box
                      key={doc.folder_id + index}
                      onClick={() => handleDocumentClick(doc)}
                      style={{
                        padding: "8px",
                        borderRadius: 6,
                        cursor: "pointer",
                        border: "1px solid var(--gray-4)",
                        transition: "background-color 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "var(--gray-3)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }}
                    >
                      <Flex direction="column" gap="1">
                        <Flex justify="between" align="center">
                          <Text size="2" weight="medium">
                            {highlightMatch(String(doc.document_name), debouncedQuery)}
                          </Text>
                          <Flex gap="2" align="center">
                            {/* Level Badge */}
                            {docLevel && (
                              <Badge color={getLevelColor(docLevel)} size="1">
                                {getLevelLabel(docLevel)}
                              </Badge>
                            )}
                            {/* Status Badge */}
                            {(() => {
                              const statusConfig = DocumentStatusConfig[doc.status as DocumentWorkFlowStatus];
                              return (
                                <Badge color={statusConfig?.color as RadixColors || "gray"}>
                                  {statusConfig?.label || doc.status || 'Unknown'}
                                </Badge>
                              );
                            })()}
                          </Flex>
                        </Flex>

                        <Text size="1" color="gray">
                          Protocol: {doc.study?.protocol}
                        </Text>

                        {doc.country && (
                          <Text size="1" color="gray">
                            Country: {doc.country}
                          </Text>
                        )}

                        {doc.site?.name && (
                          <Text size="1" color="gray">
                            Site: {doc.site?.name}
                          </Text>
                        )}

                      </Flex>
                    </Box>
                  );
                })}
              </Flex>
            )}

            {error && (
              <Flex justify="center" align="center" style={{ height: "100%" }}>
                <Text size="2" color="red">
                  Error loading documents. Please try again.
                </Text>
              </Flex>
            )}            
          </Box>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
};
