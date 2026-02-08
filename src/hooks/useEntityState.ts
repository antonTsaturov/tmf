// hooks/useEntityState.ts
import { useState, useCallback } from 'react';

type Entity = { id: number };

export function useEntityState<T extends Entity>(
  initialEntities: T[] = [],
  saveFunction?: (entity: T) => Promise<void>
) {
  const [entities, setEntities] = useState<T[]>(initialEntities);

  // Обновление одной сущности
  const updateEntity = useCallback((id: number, updates: Partial<T>) => {
    setEntities(prev => {
      const entityIndex = prev.findIndex(entity => entity.id === id);
      
      if (entityIndex === -1) {
        console.warn(`Entity with id ${id} not found in state`);
        return prev;
      }
      
      const currentEntity = prev[entityIndex];
      const updatedEntity: T = { ...currentEntity, ...updates };
      
      // Сохраняем в БД, если передан saveFunction
      if (saveFunction) {
        saveFunction(updatedEntity).catch(err => {
          console.error('Failed to save entity updates:', err);
        });
      }
      
      const newEntities = [...prev];
      newEntities[entityIndex] = updatedEntity;
      return newEntities;
    });
  }, [saveFunction]);

  // Добавление новой сущности
  const addEntity = useCallback((entity: T) => {
    setEntities(prev => [...prev, entity]);
    
    if (saveFunction) {
      saveFunction(entity).catch(err => {
        console.error('Failed to save new entity:', err);
      });
    }
  }, [saveFunction]);

  // Удаление сущности
  const removeEntity = useCallback((id: number) => {
    setEntities(prev => prev.filter(entity => entity.id !== id));
    
    // Здесь можно добавить вызов API для удаления из БД
  }, []);

  // Массовое обновление
  const updateMultiple = useCallback((updates: Partial<T>[]) => {
    setEntities(prev => {
      const newEntities = [...prev];
      
      updates.forEach(update => {
        if (update.id === undefined) return;
        
        const index = newEntities.findIndex(e => e.id === update.id);
        if (index !== -1) {
          newEntities[index] = { ...newEntities[index], ...update };
          
          if (saveFunction) {
            saveFunction(newEntities[index]).catch(err => {
              console.error('Failed to save entity updates:', err);
            });
          }
        }
      });
      
      return newEntities;
    });
  }, [saveFunction]);

  return {
    entities,
    setEntities,
    updateEntity,
    addEntity,
    removeEntity,
    updateMultiple,
  };
}