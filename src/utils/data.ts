import { FileNode } from '../components/FileExplorer';

export const sampleData: FileNode[] = [
  {
    id: '1',
    name: 'Проекты',
    type: 'folder',
    children: [
      {
        id: '2',
        name: 'Веб-приложение',
        type: 'folder',
        children: [
          { id: '3', name: 'index.html', type: 'file', size: '1.2 KB', modified: '2024-01-15', extension: 'html' },
          { id: '4', name: 'styles.css', type: 'file', size: '3.4 KB', modified: '2024-01-14', extension: 'css' },
          { id: '5', name: 'app.js', type: 'file', size: '5.6 KB', modified: '2024-01-15', extension: 'js' },
        ],
      },
      {
        id: '6',
        name: 'Документация',
        type: 'folder',
        children: [
          { id: '7', name: 'Требования.pdf', type: 'file', size: '2.3 MB', modified: '2024-01-10', extension: 'pdf' },
          { id: '8', name: 'Архитектура.docx', type: 'file', size: '1.1 MB', modified: '2024-01-12', extension: 'docx' },
        ],
      },
    ],
  },
  {
    id: '9',
    name: 'Изображения',
    type: 'folder',
    children: [
      { id: '10', name: 'photo1.jpg', type: 'file', size: '4.2 MB', modified: '2024-01-13', extension: 'jpg' },
      { id: '11', name: 'screenshot.png', type: 'file', size: '1.8 MB', modified: '2024-01-14', extension: 'png' },
      {
        id: '12',
        name: 'Отпуск 2023',
        type: 'folder',
        children: [
          { id: '13', name: 'beach.jpg', type: 'file', size: '5.6 MB', modified: '2023-08-15', extension: 'jpg' },
          { id: '14', name: 'mountains.jpg', type: 'file', size: '6.1 MB', modified: '2023-08-16', extension: 'jpg' },
        ],
      },
    ],
  },
  {
    id: '15',
    name: 'Системные файлы',
    type: 'folder',
    children: [
      { id: '16', name: 'config.json', type: 'file', size: '0.8 KB', modified: '2024-01-15', extension: 'json' },
      { id: '17', name: 'readme.txt', type: 'file', size: '2.1 KB', modified: '2024-01-01', extension: 'txt' },
    ],
  },
  {
    id: '18',
    name: 'Пустая папка',
    type: 'folder',
    children: [],
  },
  {
    id: '19',
    name: 'package.json',
    type: 'file',
    size: '1.5 KB',
    modified: '2024-01-15',
    extension: 'json',
  },
];