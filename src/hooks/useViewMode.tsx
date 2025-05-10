import { useState, useEffect, useRef } from 'react';

type ViewModeType = '3D' | '2D' | 'ObjectOnly';

export const useViewMode = (orbitControlsRef: React.MutableRefObject<any>) => {
  const [viewMode, setViewMode] = useState<ViewModeType>('3D');
  const is2DView = viewMode === '2D' ;
  const isObjectOnlyView = viewMode === 'ObjectOnly';
  
  const leftPanelRef = useRef<HTMLDivElement>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);
  const draggerRef = useRef<HTMLDivElement>(null);
  
  // Effet pour gérer les contrôles d'orbite en fonction du mode de vue
  useEffect(() => {
    if (orbitControlsRef.current) {
      orbitControlsRef.current.enableRotate = !is2DView;
    }
  }, [is2DView, orbitControlsRef]);
  
  // Effet pour gérer l'affichage des panneaux et les contrôles d'orbite en mode ObjectOnly
  useEffect(() => {
    if (viewMode === 'ObjectOnly') {
      // Hide UI elements that are not needed in ObjectOnly mode
      if (leftPanelRef.current) {
        leftPanelRef.current.style.width = '0';
      }
      if (rightPanelRef.current) {
        rightPanelRef.current.style.width = '0';
      }
      
      // Disable orbit controls zooming out
      if (orbitControlsRef.current) {
        orbitControlsRef.current.enableZoom = false;
        orbitControlsRef.current.minDistance = 2;
        orbitControlsRef.current.maxDistance = 20;
      }
    } else {
      // Restore UI elements
      if (leftPanelRef.current) {
        leftPanelRef.current.style.width = '250px';
      }
      if (rightPanelRef.current) {
        rightPanelRef.current.style.width = '300px';
      }
      
      // Re-enable orbit controls zooming
      if (orbitControlsRef.current) {
        orbitControlsRef.current.enableZoom = true;
        orbitControlsRef.current.minDistance = 1;
        orbitControlsRef.current.maxDistance = 1000;
      }
    }
  }, [viewMode, orbitControlsRef]);
  
  // Effet pour gérer le redimensionnement des panneaux
  useEffect(() => {
    const dragger = draggerRef.current;
    const leftPanel = leftPanelRef.current;
    const rightPanel = rightPanelRef.current;

    if (!dragger || !leftPanel || !rightPanel) return;

    let isDragging = false;

    const startDragging = () => {
      isDragging = true;
      document.body.style.cursor = 'col-resize';
      dragger.style.pointerEvents = 'none';
    };

    const stopDragging = () => {
      if (isDragging) {
        isDragging = false;
        document.body.style.cursor = 'default';
        dragger.style.pointerEvents = 'auto';
      }
    };

    const handleDragging = (e: MouseEvent) => {
      if (!isDragging) return;

      const containerWidth = leftPanel.parentElement?.offsetWidth || 0;
      const dragPosition = e.clientX;

      const minRightPanelWidth = 400;
      const draggerWidth = 10;

      const newLeftWidth = Math.min(
        Math.max(200, dragPosition - leftPanel.offsetLeft),
        containerWidth - minRightPanelWidth - draggerWidth
      );

      leftPanel.style.flex = `0 0 ${newLeftWidth}px`;
      rightPanel.style.flex = `1 1 ${containerWidth - newLeftWidth - draggerWidth}px`;
    };

    dragger.addEventListener('mousedown', startDragging);
    document.addEventListener('mouseup', stopDragging);
    document.addEventListener('mousemove', handleDragging);

    return () => {
      dragger.removeEventListener('mousedown', startDragging);
      document.removeEventListener('mouseup', stopDragging);
      document.removeEventListener('mousemove', handleDragging);
    };
  }, []);
  
  return {
    viewMode,
    setViewMode,
    is2DView,
    isObjectOnlyView,
    leftPanelRef,
    rightPanelRef,
    draggerRef
  };
}; 