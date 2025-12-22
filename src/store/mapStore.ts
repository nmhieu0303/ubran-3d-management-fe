import { create } from 'zustand';

interface MapState {
  selectedFeatureId: string | null;
  visibleLayers: string[];
  searchPanelOpen: boolean;
  layerPanelOpen: boolean;
  setSelectedFeature: (id: string | null) => void;
  toggleLayer: (layerId: string) => void;
  setVisibleLayers: (layers: string[]) => void;
  toggleSearchPanel: () => void;
  toggleLayerPanel: () => void;
  setSearchPanelOpen: (open: boolean) => void;
  setLayerPanelOpen: (open: boolean) => void;
}

export const useMapStore = create<MapState>((set) => ({
  selectedFeatureId: null,
  visibleLayers: ['buildings', 'trees', 'roads'],
  searchPanelOpen: false,
  layerPanelOpen: false,
  setSelectedFeature: (id) => set({ selectedFeatureId: id }),
  toggleLayer: (layerId) =>
    set((state) => ({
      visibleLayers: state.visibleLayers.includes(layerId)
        ? state.visibleLayers.filter((id) => id !== layerId)
        : [...state.visibleLayers, layerId],
    })),
  setVisibleLayers: (layers) => set({ visibleLayers: layers }),
  toggleSearchPanel: () =>
    set((state) => ({ searchPanelOpen: !state.searchPanelOpen })),
  toggleLayerPanel: () =>
    set((state) => ({ layerPanelOpen: !state.layerPanelOpen })),
  setSearchPanelOpen: (open) => set({ searchPanelOpen: open }),
  setLayerPanelOpen: (open) => set({ layerPanelOpen: open }),
}));
