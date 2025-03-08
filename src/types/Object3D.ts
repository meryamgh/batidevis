export interface Object3D {
    id: string;
    name: string;
    url: string;
    thumbnail?: string;
    price: number;
    category: string;
    description?: string;
    dimensions: {
        width: number;
        height: number;
        depth: number;
    };
} 