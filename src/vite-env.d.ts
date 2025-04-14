/// <reference types="vite/client" />
// src/declarations.d.ts
declare module 'three/examples/jsm/loaders/DRACOLoader' {
    import { LoadingManager } from 'three';
    import { Loader } from 'three';
  
    export class DRACOLoader extends Loader {
      constructor(manager?: LoadingManager);
      setDecoderPath(path: string): this;
      setDecoderConfig(config: object): this;
      load(url: string, onLoad: (geometry: any) => void, onProgress?: (event: ProgressEvent) => void, onError?: (event: ErrorEvent) => void): void;
      preload(): void;
      dispose(): void;
    }
  }
  