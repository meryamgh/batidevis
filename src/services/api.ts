import axios from 'axios';
import { Object3D } from '../types/Object3D';

const API_URL = 'http://localhost:3000/api'; // Ajustez selon votre configuration

export const api = {
    getObjects: async (): Promise<Object3D[]> => {
        try {
            const response = await axios.get(`${API_URL}/objects`);
            return response.data;
        } catch (error) {
            console.error('Erreur lors de la récupération des objets:', error);
            return [];
        }
    },

    getObjectById: async (id: string): Promise<Object3D | null> => {
        try {
            const response = await axios.get(`${API_URL}/objects/${id}`);
            return response.data;
        } catch (error) {
            console.error('Erreur lors de la récupération de l\'objet:', error);
            return null;
        }
    },

    uploadObject: async (formData: FormData): Promise<Object3D | null> => {
        try {
            const response = await axios.post(`${API_URL}/objects/upload`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            return response.data;
        } catch (error) {
            console.error('Erreur lors de l\'upload:', error);
            return null;
        }
    }
}; 