// // src/components/FileExplorer.tsx
// import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
// import { MainContext } from '@/wrappers/MainContext';
// import { ViewLevel, StudyStatus } from '@/types/types';
// import { 
//   Box, 
//   Flex, 
//   Text, 
//   Separator, 
//   Button,
//   Badge
// } from '@radix-ui/themes';
// import { 
//   FileIcon, 
//   LockClosedIcon, 
//   ChevronRightIcon, 
//   DotIcon, 
//   ArchiveIcon
// } from '@radix-ui/react-icons';
// import { FaRegFolderOpen, FaRegFolder } from 'react-icons/fa6';
// import StudyInfoPanel from './panels/StudyInfoPanel';
// import { useI18n } from '@/hooks/useI18n';


// export interface FileNode {
//   id: string;
//   name: string;
//   type: 'folder' | 'file' | 'root' | 'subfolder';
//   status?: string;
//   children?: FileNode[];
//   size?: string;
//   modified?: string;
//   extension?: string;
// }

// export interface FileExplorerProps {
//   onSelect?: (node: FileNode) => void;
//   onToggle?: (node: FileNode, isExpanded: boolean) => void;
//   showFileIcons?: boolean;
//   allowMultiSelect?: boolean;
// }

// export const findNodeById = (nodes: FileNode[], id: string): FileNode | null => {
//     for (const node of nodes) {
//       if (node.id === id) return node;
//       if (node.children) {
//         const found = findNodeById(node.children, id);
//         if (found) return found;
//       }
//     }
//     return null;
//   };


// const FolderExplorer: React.FC<FileExplorerProps> = ({
//   onSelect,
//   onToggle,
//   showFileIcons = true,
//   allowMultiSelect = false
// }) => {
//   const { t } = useI18n('folderExplorer');
//   const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
//   const [selectedNodes, setSelectedNodes] = useState<Set<string>>(new Set());
//   const { context, updateContext } = useContext(MainContext)!;
//   const { currentStudy, currentSite, currentLevel, selectedFolder, isFolderContentLoading, currentCountry } = context;
//   const folderRefs = useRef<Map<string, HTMLDivElement>>(new Map());

//   // Check if study is in completed status (read-only mode)
//   const isStudyReadOnly = currentStudy?.status === StudyStatus.COMPLETED;
//   const isStudyArchived = currentStudy?.status === StudyStatus.ARCHIVED;
//   const [data, setData] = useState<FileNode[] | undefined>();
//   const [filteredData, setFilteredData] = useState<FileNode[] | undefined>();

//   // Get folders structure from Study object
//   useEffect(() => {
//     const getFolders = () => {
//       if (!currentStudy) {
//         setData([]);
//         return;
//       }
//       const folders = currentStudy?.folders_structure?.children || [];
//       setData(folders as unknown as FileNode[]);
//     };
//     getFolders();
//   }, [currentStudy]);

//   // Filter folders based on currentLevel and currentSite
//   useEffect(() => {
//     if (!data) {
//       setFilteredData([]);
//       return;
//     }
//     if (!context.currentLevel) {
//       setFilteredData([]);
//       return;
//     }

//     const filterFoldersByLevel = (nodes: FileNode[]): FileNode[] => {
//       return nodes
//         .map(node => {
//           const filteredNode = { ...node };
//           if (node.children) {
//             filteredNode.children = filterFoldersByLevel(node.children);
//           }
//           return filteredNode;
//         })
//         .filter(node => {
//           const isSiteSpecific = node.id?.toLowerCase().includes('site');
//           const isCountrySpecific = node.id?.toLowerCase().includes('country');
//           const isGeneralSpecific = node.id?.toLowerCase().includes('general');

//           if (context.currentLevel === ViewLevel.GENERAL) {
//             return isGeneralSpecific;
//           }
//           if (context.currentLevel === ViewLevel.SITE) {
//             return isSiteSpecific;
//           }
//           if (context.currentLevel === ViewLevel.COUNTRY) {
//             return isCountrySpecific;
//           }
//           return true;
//         });
//     };

//     const filtered = filterFoldersByLevel(data);
//     setFilteredData(filtered);
//   }, [data, currentLevel, currentSite]);



//   const toggleFolder = (nodeId: string) => {
//     if (!filteredData) return;
//     const newExpanded = new Set(expandedFolders);
//     const node = findNodeById(filteredData, nodeId);

//     if (newExpanded.has(nodeId)) {
//       newExpanded.delete(nodeId);
//       onToggle?.(node!, false);
//     } else {
//       newExpanded.add(nodeId);
//       onToggle?.(node!, true);
//     }
//     setExpandedFolders(newExpanded);
//   };

// // Добавь эту функцию после существующих useEffect хуков (примерно после строки 97)
// const toggleAllFolders = (ids: string[], expand: boolean) => {
//     if (!filteredData) return;
    
//     const newExpanded = new Set(expandedFolders);
    
//     if (expand) {
//       ids.forEach(id => newExpanded.add(id));
//     } else {
//       ids.forEach(id => newExpanded.delete(id));
//     }
    
//     setExpandedFolders(newExpanded);
//   };

//   const collectAllFolderIds = (nodes: FileNode[]): string[] => {
//   let ids: string[] = [];
//   for (const node of nodes) {
//     if (node.type === 'folder' || node.type === 'subfolder') {
//       if (node.children && node.children.length > 0) {
//         ids.push(node.id);
//         ids.push(...collectAllFolderIds(node.children));
//       }
//     }
//   }
//   return ids;
// };
//   const handleSelect = (node: FileNode, event: React.MouseEvent) => {
//     event.stopPropagation();
//     if (isFolderContentLoading) return;

//     const isFolder = node.type === 'subfolder' && node.children?.length === 0;
//     if (!isFolder) return;

//     if (context.currentLevel === ViewLevel.SITE && !currentSite) {
//       return;
//     }

//     const isSameNode = context.selectedFolder?.id === node.id;

//     if (allowMultiSelect && event.ctrlKey) {
//       const newSelected = new Set(selectedNodes);
//       if (newSelected.has(node.id)) {
//         newSelected.delete(node.id);
//         if (context.selectedFolder?.id === node.id) {
//           updateContext({ selectedFolder: null });
//         }
//       } else {
//         newSelected.add(node.id);
//         updateContext({ selectedFolder: node });
//       }
//       setSelectedNodes(newSelected);
//     } else {
//       if (isSameNode) {
//         setSelectedNodes(new Set());
//         updateContext({ selectedFolder: null });
//       } else {
//         setSelectedNodes(new Set([node.id]));
//         updateContext({ selectedFolder: node });
//       }
//     }
//     onSelect?.(node);
//   };


//   const renderNode = (node: FileNode, depth = 1) => {
//     const isExpanded = expandedFolders.has(node.id);
//     const isSelected = selectedNodes.has(node.id) || context.selectedFolder?.id === node.id;
//     const hasChildren = node.children && node.children.length > 0;
//     const displayType = (node.type === 'root' || node.type === 'subfolder') ? 'folder' : node.type;
//     const isFolder = displayType === 'folder';

//     const isSiteSpecific = node.id?.toLowerCase().includes('site');
//     const isCountrySpecific = node.id?.toLowerCase().includes('country');
//     const isGeneralSpecific = node.id?.toLowerCase().includes('general');

//     const isAvailableForCurrentLevel = () => {
//       if (!currentLevel) return false;
//       if (currentLevel === ViewLevel.GENERAL) return isGeneralSpecific;
//       if (currentLevel === ViewLevel.SITE) return isSiteSpecific;
//       if (currentLevel === ViewLevel.COUNTRY) return isCountrySpecific;
//       return false;
//     };

//     if (!isAvailableForCurrentLevel()) return null;

//     return (
//       <Box 
//         key={node.id} 
//         className="node-container" 
//         ref={setFolderRef(node.id)}
//       >
//         <Flex
//           align="center"
//           gap="2"
//           className={`node ${isSelected ? 'selected' : ''} ${!isFolder ? 'file-node' : ''}`}
//           style={{ 
//             paddingLeft: `${depth * 12}px`,
//             paddingRight: '8px',
//             paddingTop: '8px',
//             paddingBottom: '8px',
//             borderRadius: '6px',
//             cursor: isFolder && isAvailableForCurrentLevel() ? 'pointer' : 'default',
//             backgroundColor: isSelected ? 'var(--accent-5)' : 'transparent',
//             transition: 'background-color 0.2s'
//           }}
//           onClick={(e) => {
//             if (isFolder && isAvailableForCurrentLevel()) {
//               if (hasChildren) toggleFolder(node.id);
//               handleSelect(node, e);
//             }
//           }}
//           onDoubleClick={(e) => {
//             if (isFolder && isAvailableForCurrentLevel()) {
//               handleSelect(node, e);
//             }
//           }}
//         >

          
//           {/* Arrow/Folder Toggle */}
//           <Box style={{ width: '16px', display: 'flex', justifyContent: 'center' }}>
//             {isFolder && hasChildren ? (
//               <ChevronRightIcon 
//                 width="14" 
//                 height="14" 
//                 style={{ 
//                   transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
//                   transition: 'transform 0.2s',
//                   color: 'var(--gray-9)'
//                 }} 
//               />
//             ) : isFolder ? (
//               <DotIcon width="14" height="14" style={{ color: 'var(--gray-9)' }} />
//             ) : (
//               <Box style={{ width: '14px' }} />
//             )}
//           </Box>

//           {/* Icon */}
//           {showFileIcons && (
//             <Box 
//               style={{ 
//                 color: isSelected ? 'var(--accent-9)' : 'var(--gray-11)',
//                 display: 'flex',
//                 alignItems: 'center'
//               }}
//               onClick={(e) => {
//                 if (isFolder && isAvailableForCurrentLevel()) {
//                   e.stopPropagation();
//                   handleSelect(node, e);
//                 }
//               }}
//             >
//               {isFolder &&  (
//                 isExpanded ?  <FaRegFolderOpen width="16" height="16" /> 
//                 : <FaRegFolder width="16" height="16" />
//               )}
//             </Box>
//           )}

//           {/* Name - UPPERCASE */}
//           <Text 
//             size="2" 
//             weight="medium" 
//             style={{ 
//               textTransform: 'uppercase', 
//               letterSpacing: '0.5px',
//               flex: 1,
//               color: isSelected ? 'var(--accent-10)' : 'var(--gray-12)',
//               marginTop:'1px'
//             }}
//             title={node.name}
//             onClick={() => {
//               if (isFolder && isAvailableForCurrentLevel()) {
//                 if (hasChildren) toggleFolder(node.id);
//               }
//             }}
//           >
//             {node.name}
//           </Text>
          
//           {/* Кнопка для раскрытия / сворачивания всего древа папок */}
//           {node.type === 'folder' && node.children && node.children.length > 0 && (
//             <Badge 
//               style={{ cursor: 'pointer' }}
//               onClick={(e) => {
//                 e.stopPropagation();
                
//                 // Собираем ID самой папки и всех её детей
//                 // Важно: передаем [node], чтобы включить ID текущей папки в список на переключение
//                 const allRelatedIds = collectAllFolderIds([node]);
                
//                 if (isExpanded) {
//                   // Если папка сейчас развернута (мы видим "Fold all")
//                   // Мы принудительно УДАЛЯЕМ все ID этой ветки из expandedFolders
//                   toggleAllFolders(allRelatedIds, false);
//                 } else {
//                   // Если папка свернута (мы видим "Unfold all")
//                   // Мы принудительно ДОБАВЛЯЕМ все ID этой ветки
//                   toggleAllFolders(allRelatedIds, true);
//                 }
//               }}
//             >
//               <Text>
//                 {isExpanded ? 'Fold all' : 'Unfold all'}
//               </Text>
//             </Badge>
//           )}    
//           {/* Lock Icon for Completed Studies */}
//           {isStudyReadOnly && isFolder && (
//             <Box 
//               title="Study completed - read only"
//               style={{ color: 'var(--gray-9)' }}
//             >
//               <LockClosedIcon width="14" height="14" />
//             </Box>
//           )}
//           {isStudyArchived && isFolder && (
//             <Box 
//               title="Study archived"
//               style={{ color: 'var(--gray-9)' }}
//             >
//               <ArchiveIcon width="14" height="14" />
//             </Box>
//           )}
//         </Flex>

//         {/* Children */}
//         {isFolder && isExpanded && hasChildren && (
//           <Box className="children">
//             {node.children!.map(child => renderNode(child, depth + 1))}
//           </Box>
//         )}
//       </Box>
//     );
//   };

//   const setFolderRef = useCallback((nodeId: string) => (element: HTMLDivElement | null) => {
//     if (element) {
//       folderRefs.current.set(nodeId, element);
//     } else {
//       folderRefs.current.delete(nodeId);
//     }
//   }, []); 
  
//   const scrollToFolder = useCallback((folderId: string) => {
//     const element = folderRefs.current.get(folderId);
//     if (element) {
//       element.scrollIntoView({
//         behavior: 'smooth',
//         block: 'center',
//       });
//     }
//   }, []);

//   // Sync selectedNodes with context
//   // useEffect(() => {
//   //   if (selectedFolder) {
//   //     setSelectedNodes(new Set([selectedFolder.id]));
//   //   } else {
//   //     setSelectedNodes(new Set());
//   //   }
//   //   updateContext({ selectedDocument: null });
//   // }, [selectedFolder]);
//   useEffect(() => {
//     if (selectedFolder) {
//       setSelectedNodes(new Set([selectedFolder.id]));
      
//       // Раскрываем ВСЕ папки (если нужно найти глубоко вложенную)
//       // Но лучше раскрывать только путь к папке. Используем существующую collectAllFolderIds?
//       // Нет, она раскрывает всё дерево. Давайте сделаем умнее:
      
//       // Находим путь к папке через рекурсивный поиск
//       const findPathToFolder = (nodes: FileNode[], targetId: string, path: string[] = []): string[] | null => {
//         for (const node of nodes) {
//           if (node.id === targetId) {
//             return path;
//           }
//           if (node.children) {
//             const result = findPathToFolder(node.children, targetId, [...path, node.id]);
//             if (result) return result;
//           }
//         }
//         return null;
//       };
      
//       if (filteredData) {
//         const parentIds = findPathToFolder(filteredData, selectedFolder.id);
//         if (parentIds && parentIds.length > 0) {
//           // Раскрываем только родительские папки
//           setExpandedFolders(prev => {
//             const newExpanded = new Set(prev);
//             parentIds.forEach(id => newExpanded.add(id));
//             return newExpanded;
//           });
          
//           // Даем время на рендер раскрытых папок
//           setTimeout(() => {
//             scrollToFolder(selectedFolder.id);
//           }, 150);
//         } else {
//           scrollToFolder(selectedFolder.id);
//         }
//       }
//     } else {
//       setSelectedNodes(new Set());
//     }
//     updateContext({ selectedDocument: null });
//   }, [selectedFolder, filteredData, scrollToFolder]);    

//   if (!Array.isArray(filteredData)) {
//     return (
//       <Flex justify="center" align="center" p="4">
//         <Text color="gray">{t('noData')}</Text>
//       </Flex>
//     );
//   }

//   return (
//     <Box className="file-explorer" p="3" style={{ height: '100%', overflow: 'auto' }}>
//       <StudyInfoPanel />
      
//       <Flex align="center" justify="center" py="2" gap="4" >
//         <Text size="3" weight="bold">
//           {t('masterFileTitle')}
//         </Text>
//       </Flex>
//       <Separator mb="4" style={{ width: '100%' }} />

//       {!currentStudy || !currentLevel ? (
//         <Flex direction="column" gap="2" align="center">
//           {!currentStudy && (
//             <Text size="2" color="gray">{t('selectStudy')}</Text>
//           )}
//           {currentStudy && !currentLevel && (
//             <Text size="2" color="gray">{t('selectLevel')}</Text>
//           )}
//         </Flex>
//       )
//         : currentLevel === ViewLevel.SITE && !currentSite ? (
//         <Flex direction="column" gap="2" align="center">
//           <Text size="2" color="gray">{t('selectSite')}</Text>
//         </Flex>)
//         : currentLevel === ViewLevel.COUNTRY && !currentCountry ? (
//         <Flex direction="column" gap="2" align="center">
//           <Text size="2" color="gray">{t('selectCountry')}</Text>
//         </Flex>
//       ) : filteredData.length === 0 ? (
//         <Flex direction="column" gap="2" align="center">
//           <Text size="2" color="gray">
//             {currentLevel === ViewLevel.GENERAL
//               ? t('noGeneralFolders')
//               : t('noSiteFolders')}
//           </Text>
//         </Flex>
//       ) : (
//         <Flex direction="column" gap="1">
//           {filteredData.map(node => renderNode(node))}
//         </Flex>
//       )}
//     </Box>
//   );
// };

// export default FolderExplorer;