/**
 * Custom hook for managing polygon drawing interactions
 */

import { useCallback, useRef, useState } from 'react';
import { InteractionMode } from '../types/polygonDrawer.types';

export const usePolygonInteraction = () => {
  const [interactionMode, setInteractionMode] = useState<InteractionMode>('add');
  const [selectedGraphic, setSelectedGraphic] = useState<__esri.Graphic | null>(null);

  const interactionModeRef = useRef<InteractionMode>('add');
  const selectedGraphicRef = useRef<__esri.Graphic | null>(null);
  const isTiltingRef = useRef<boolean>(false);
  const tiltStartXRef = useRef<number>(0);
  const tiltStartYRef = useRef<number>(0);
  const tiltStartHeadingRef = useRef<number>(0);
  const tiltStartTiltRef = useRef<number>(0);

  // Sync state với ref
  const updateInteractionMode = useCallback((mode: InteractionMode) => {
    setInteractionMode(mode);
    interactionModeRef.current = mode;
  }, []);

  const updateSelectedGraphic = useCallback((graphic: __esri.Graphic | null) => {
    setSelectedGraphic(graphic);
    selectedGraphicRef.current = graphic;
  }, []);

  return {
    interactionMode,
    selectedGraphic,
    interactionModeRef,
    selectedGraphicRef,
    isTiltingRef,
    tiltStartXRef,
    tiltStartYRef,
    tiltStartHeadingRef,
    tiltStartTiltRef,
    updateInteractionMode,
    updateSelectedGraphic,
  };
};
