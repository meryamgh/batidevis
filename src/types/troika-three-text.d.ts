declare module 'troika-three-text' {
    import * as THREE from 'three';
  
    interface TextProps {
      text: string;
      font?: string;
      fontSize?: number;
      anchorX?: 'left' | 'center' | 'right' | number;
      anchorY?: 'top' | 'middle' | 'bottom' | number;
      color?: string | number;
      maxWidth?: number;
      lineHeight?: number;
      letterSpacing?: number;
      textAlign?: 'left' | 'right' | 'center' | 'justify';
      overflowWrap?: 'normal' | 'break-word';
      whiteSpace?: 'normal' | 'nowrap';
      material?: THREE.Material;
      depthOffset?: number;
      outlineWidth?: number | string;
      outlineColor?: string | number;
      outlineOpacity?: number;
      outlineBlur?: number;
      curveRadius?: number;
      userData?: any;
      [prop: string]: any;
    }
  
    export class Text extends THREE.Mesh {
      constructor(props?: TextProps);
      text: string;
      fontSize: number;
      color: string | number;
      anchorX: 'left' | 'center' | 'right' | number;
      anchorY: 'top' | 'middle' | 'bottom' | number;
    }
  }
  