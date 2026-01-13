

import { useCallback, useEffect, useRef, useState } from 'react';
import { DEFAULT_POLYGON_HEIGHT, DEFAULT_Z_OFFSET } from '../constants/polygonDrawer.constants';

export const usePolygonAttributes = (selectedGraphic: __esri.Graphic | null) => {
  const [polygonHeight, setPolygonHeight] = useState(DEFAULT_POLYGON_HEIGHT);
  const [zOffset, setZOffset] = useState(DEFAULT_Z_OFFSET);

  const polygonHeightRef = useRef(DEFAULT_POLYGON_HEIGHT);
  const zOffsetRef = useRef(DEFAULT_Z_OFFSET);

  // Sync ref với state
  useEffect(() => {
    polygonHeightRef.current = polygonHeight;
  }, [polygonHeight]);

  useEffect(() => {
    zOffsetRef.current = zOffset;
  }, [zOffset]);

  useEffect(() => {
    if (selectedGraphic) {
      const height = selectedGraphic.attributes?.height ?? DEFAULT_POLYGON_HEIGHT;
      const offset = selectedGraphic.attributes?.zOffset ?? DEFAULT_Z_OFFSET;
      setPolygonHeight(height);
      setZOffset(offset);
    }
  }, [selectedGraphic]);

  const updateHeight = useCallback((height: number) => {
    setPolygonHeight(height);
    polygonHeightRef.current = height;
  }, []);

  const updateZOffset = useCallback((offset: number) => {
    setZOffset(offset);
    zOffsetRef.current = offset;
  }, []);

  return {
    polygonHeight,
    zOffset,
    polygonHeightRef,
    zOffsetRef,
    updateHeight,
    updateZOffset,
  };
};
