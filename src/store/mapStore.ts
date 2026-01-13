import { create } from 'zustand';

interface MapState {
  selectedFeatureId: string | null;
  visibleLayers: string[];
  filteredObjectTypes: string[];
  searchPanelOpen: boolean;
  layerPanelOpen: boolean;
  pendingObjectSelection: { objectId: string; mode: 'view' | 'edit' } | null;
  pendingAddObject: boolean;
  timeOfDay: string;
  timeSimulationEnabled: boolean;
  setSelectedFeature: (id: string | null) => void;
  toggleLayer: (layerId: string) => void;
  setVisibleLayers: (layers: string[]) => void;
  toggleFilteredObjectType: (typeId: string) => void;
  setFilteredObjectTypes: (types: string[]) => void;
  toggleSearchPanel: () => void;
  toggleLayerPanel: () => void;
  setSearchPanelOpen: (open: boolean) => void;
  setLayerPanelOpen: (open: boolean) => void;
  setPendingObjectSelection: (
    selection: { objectId: string; mode: 'view' | 'edit' } | null
  ) => void;
  setPendingAddObject: (pending: boolean) => void;
  setTimeOfDay: (time: string) => void;
  setTimeSimulationEnabled: (enabled: boolean) => void;
}

export const useMapStore = create<MapState>((set) => ({
  selectedFeatureId: null,
  visibleLayers: ['buildings', 'trees', 'roads'],
  filteredObjectTypes: [],
  searchPanelOpen: false,
  layerPanelOpen: false,
  pendingObjectSelection: null,
  pendingAddObject: false,
  timeOfDay: '12:00',
  timeSimulationEnabled: false,
  setSelectedFeature: (id) => set({ selectedFeatureId: id }),
  toggleLayer: (layerId) =>
    set((state) => ({
      visibleLayers: state.visibleLayers.includes(layerId)
        ? state.visibleLayers.filter((id) => id !== layerId)
        : [...state.visibleLayers, layerId],
    })),
  setVisibleLayers: (layers) => set({ visibleLayers: layers }),
  toggleFilteredObjectType: (typeId) =>
    set((state) => ({
      filteredObjectTypes: state.filteredObjectTypes.includes(typeId)
        ? state.filteredObjectTypes.filter((id) => id !== typeId)
        : [...state.filteredObjectTypes, typeId],
    })),
  setFilteredObjectTypes: (types) => set({ filteredObjectTypes: types }),
  toggleSearchPanel: () => set((state) => ({ searchPanelOpen: !state.searchPanelOpen })),
  toggleLayerPanel: () => set((state) => ({ layerPanelOpen: !state.layerPanelOpen })),
  setSearchPanelOpen: (open) => set({ searchPanelOpen: open }),
  setLayerPanelOpen: (open) => set({ layerPanelOpen: open }),
  setPendingObjectSelection: (selection) => set({ pendingObjectSelection: selection }),
  setPendingAddObject: (pending) => set({ pendingAddObject: pending }),
  setTimeOfDay: (time) => set({ timeOfDay: time }),
  setTimeSimulationEnabled: (enabled) => set({ timeSimulationEnabled: enabled }),
}));
