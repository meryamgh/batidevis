export type ObjectData = {
    id: string;
    url: string;
    price: number;
    details: string;
    position: [number, number, number];
    gltf : any;
    texture : string;
    scale : [number, number, number];
    rotation?: [number, number, number];
};
