import { useCallback } from 'react';

/**
 * Service to fetch parametric data from the API
 */
export const useParametricDataService = () => {
  const fetchParametricData = useCallback(async (name: string) => {
    try {
      const response = await fetch('http://localhost:5000/api/parametric_data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch parametric data: ${response.statusText}`);
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