// src/app/share/[...slug]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/wrappers/AuthProvider';
import { StudyUser } from '@/types/user';
import { SharedDocument } from '@/types/document';
import { AccessDenied, DocumentNotFound } from '@/components/ui/Stubs';
import { PageLoading } from '@/components/ui/PageLoading';

interface SharePageParams {
  studyId: string;
  country: string;
  siteId: string;
  folderId: string;
  documentId: string;
  [key: string]: string | string[] | undefined;
}

export default function SharePage()  {
  const params = useParams<SharePageParams>();
  const slug = params.slug as string[];
  const [study_id, country, site_id, folder_id, document_id] = slug;
  const router = useRouter();
  const { user, loading: isAuthLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Функция проверки доступа пользователя
  const checkUserAccess = (user: StudyUser): boolean => {
    // Проверка доступа к исследованию
    const hasStudyAccess = user.assigned_study_id.includes(Number(study_id));
    if (!hasStudyAccess) return false;

    // Если есть страна в URL, проверяем доступ к стране
    if (country && country !== 'null') {
      const userCountries = user.assigned_country_by_study[Number(study_id)] || [];
      const hasCountryAccess = userCountries.includes(country);
      if (!hasCountryAccess) return false;
    }

    // Если есть сайт в URL, проверяем доступ к сайту
    if (site_id && site_id !== 'null') {
      const hasSiteAccess = user.assigned_site_id.includes(parseInt(site_id));
      if (!hasSiteAccess) return false;
    }

    return true;
  };

  // Проверка авторизации и доступа
  useEffect(() => {
    if (isAuthLoading) return;

    if (!user) {
      // Сохраняем текущий URL для редиректа после логина
      sessionStorage.setItem('redirectToShareDoc', window.location.pathname);
      router.push('/login');
      return;
    }

    // Проверяем доступ пользователя
    const accessGranted = checkUserAccess(user as StudyUser);
    
    if (!accessGranted) {
      setError('ACCESS_DENIED');
      setIsLoading(false);
      return;
    }

    const sharedDocumentParams: SharedDocument = {
      study_id,
      country,
      site_id,
      folder_id,
      document_id
    };

    // Сохраняем параметры документа в sessionStorage
    sessionStorage.setItem('sharedDocumentParams', JSON.stringify(sharedDocumentParams));
    // Перенаправляем на главное окно => при монтировании FolderContentViewer обновляем контекст сохраненными параметрами
    router.push('/home');
  }, [user, isAuthLoading, study_id, country, site_id]);

  // Показываем состояние загрузки
  if (isAuthLoading || isLoading) {
    return <PageLoading />;
  }

  // Показываем ошибку доступа
  if (error === 'ACCESS_DENIED') {
    return <AccessDenied />;
  }

  // Показываем ошибку документа не найден
  if (error === 'NOT_FOUND') {
    return <DocumentNotFound />;
  }
};