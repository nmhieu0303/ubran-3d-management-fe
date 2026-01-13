import { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { API_ENDPOINTS } from '@/constants/api';
import { urbanObjectTypes as fallbackTypes } from '@/services/mockData';

export interface ObjectTypeDropdown {
  label: string;
  value: string;
}

interface UseObjectTypesState {
  data: ObjectTypeDropdown[];
  loading: boolean;
  error: string | null;
}

const CACHE_KEY = 'objectTypes_dropdown';
const CACHE_DURATION = 24 * 60 * 60 * 1000;

let cachedData: ObjectTypeDropdown[] | null = null;
let cacheTimestamp = 0;

export const useObjectTypes = (): UseObjectTypesState => {
  const [data, setData] = useState<ObjectTypeDropdown[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchObjectTypes = async () => {
      try {
        const now = Date.now();
        if (cachedData && now - cacheTimestamp < CACHE_DURATION) {
          setData(cachedData);
          setLoading(false);
          return;
        }

        const storedData = localStorage.getItem(CACHE_KEY);
        const storedTimestamp = localStorage.getItem(`${CACHE_KEY}_timestamp`);

        if (storedData && storedTimestamp) {
          const age = now - parseInt(storedTimestamp);
          if (age < CACHE_DURATION) {
            const parsedData = JSON.parse(storedData);
            cachedData = parsedData;
            cacheTimestamp = now;
            setData(parsedData);
            setLoading(false);
            return;
          }
        }

        const response = await api.get<{ data: ObjectTypeDropdown[] }>(
          API_ENDPOINTS.URBAN_OBJECTS.TYPES_DROPDOWN
        );

        const objectTypesData = response.data?.data || response.data;

        if (Array.isArray(objectTypesData)) {
          objectTypesData.forEach(item => {
            if (!item.label || !item.value) {
              throw new Error('Invalid object type format from API');
            }
          });

          cachedData = objectTypesData;
          cacheTimestamp = now;

          localStorage.setItem(CACHE_KEY, JSON.stringify(objectTypesData));
          localStorage.setItem(`${CACHE_KEY}_timestamp`, now.toString());

          setData(objectTypesData);
          setError(null);
        } else {
          throw new Error('Invalid response format from API');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch object types';
        console.warn('⚠️ Failed to fetch object types, using fallback data:', errorMessage);

        const fallbackData: ObjectTypeDropdown[] = fallbackTypes.map(type => ({
          label: type.name,
          value: type.code,
        }));

        const nowTimestamp = Date.now();
        cachedData = fallbackData;
        cacheTimestamp = nowTimestamp;
        setData(fallbackData);
        setError(null);

        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(fallbackData));
          localStorage.setItem(`${CACHE_KEY}_timestamp`, nowTimestamp.toString());
        } catch {
          console.warn('Failed to store fallback data in localStorage');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchObjectTypes();
  }, []);

  return { data, loading, error };
};

export const clearObjectTypesCache = (): void => {
  cachedData = null;
  cacheTimestamp = 0;
  localStorage.removeItem(CACHE_KEY);
  localStorage.removeItem(`${CACHE_KEY}_timestamp`);
};
