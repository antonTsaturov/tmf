import { Study, StudySite, StudyUser } from '@/types/types';
import { Tables } from '@/lib/db/schema';


// GET запрос: Получить все исследования | центры / пользователей /
export async function getTable(request: Tables) {
  try {
    const response = await fetch(`/api/${request}`, {
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
// GET запрос для получения части данных
export async function getTablePartial(table: Tables, params: Record<string, any>) {
  const url = new URL(`/api/${table}`, window.location.origin);
  
  // Добавляем параметры в URL
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });
  }
  
  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
  });

  console.log(url.toString())
  
  return response.json();
}

// POST запрос: Создать или обновить таблицу.
export async function createOrUpdateTable(table: Tables, data: Partial<Study | StudySite | StudyUser>) {
  try {
    const response = await fetch(`/api/${table}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Failed to create/update ${table} table: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error creating/updating ${table} table: `, error);
    throw error;
  }
}

// DELETE запрос: Удалить запись по id
export async function deleteRecord(table: Tables, recordId: number) {
  try {
    const response = await fetch(`/api/${table}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id: recordId }),
    });

    if (!response.ok) {
      throw new Error(`Failed to delete record: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error deleting record: ', error);
    throw error;
  }
}