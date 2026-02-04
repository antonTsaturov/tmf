import { Study } from '@/types/types';

// GET запрос: Получить все исследования
export async function getStudies() {
  try {
    const response = await fetch(`/api/study`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store', // Для динамических данных
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch studies: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching studies:', error);
    throw error;
  }
}

// POST запрос: Создать или обновить исследование
export async function createOrUpdateStudy(studyData: Study) {
  try {
    const response = await fetch(`/api/study`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(studyData),
    });

    if (!response.ok) {
      throw new Error(`Failed to create/update study: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating/updating study:', error);
    throw error;
  }
}

// DELETE запрос: Удалить исследование по id
export async function deleteStudy(studyId: number) {
  try {
    const response = await fetch(`/api/study`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id: studyId }),
    });

    if (!response.ok) {
      throw new Error(`Failed to delete study: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error deleting study:', error);
    throw error;
  }
}