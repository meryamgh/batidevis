import { useCallback } from 'react';
import { BACKEND_URL } from '../config/env';
/**
 * Service to fetch parametric data from the API
 */
export const useParametricDataService = () => {
  const fetchParametricData = useCallback(async (name: string) => {
    try {
        const response = await fetch(`${BACKEND_URL}/api/parametric_data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name }),
      });

      if (!response.ok) {
        console.error(`Failed to fetch parametric data: ${response.statusText}`);
        return null;
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching parametric data:', error);
      return null;
    }
  }, []);

  return { fetchParametricData };
}; 