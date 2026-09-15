import { useState, useEffect } from "react";
import { ChecklistItem, VehiclePart, FuelLevelConfig, DEFAULT_ITEMS, DEFAULT_VEHICLE_PARTS, DEFAULT_FUEL_LEVELS } from "@/types/checklist";

const ITEMS_KEY = "tvde-checklist-items";
const PARTS_KEY = "tvde-checklist-parts";
const FUEL_KEY = "tvde-checklist-fuel";

const parseStoredValue = <T,>(key: string): T | null => {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return null;
    return JSON.parse(stored) as T;
  } catch {
    return null;
  }
};

const mergeChecklistItems = (storedItems: ChecklistItem[] | null): ChecklistItem[] => {
  if (!Array.isArray(storedItems)) return DEFAULT_ITEMS;

  const storedById = new Map(storedItems.map((item) => [item.id, item]));

  const defaultItemsMerged = DEFAULT_ITEMS.map((defaultItem) => {
    const storedItem = storedById.get(defaultItem.id);
    if (!storedItem) return defaultItem;

    return {
      ...defaultItem,
      ...storedItem,
      specialFields:
        storedItem.specialFields && storedItem.specialFields.length > 0
          ? storedItem.specialFields
          : defaultItem.specialFields,
    };
  });

  const customStoredItems = storedItems.filter(
    (storedItem) => !DEFAULT_ITEMS.some((defaultItem) => defaultItem.id === storedItem.id),
  );

  return [...defaultItemsMerged, ...customStoredItems];
};

const mergeFuelLevels = (storedFuelLevels: FuelLevelConfig[] | null): FuelLevelConfig[] => {
  if (!Array.isArray(storedFuelLevels)) return DEFAULT_FUEL_LEVELS;

  return DEFAULT_FUEL_LEVELS.map((defaultFuelLevel) => {
    const storedLevel = storedFuelLevels.find((stored) => stored.level === defaultFuelLevel.level);
    return storedLevel
      ? { ...defaultFuelLevel, penaltyValue: Number(storedLevel.penaltyValue) || 0 }
      : defaultFuelLevel;
  });
};

export function useChecklistItems() {
  const [items, setItems] = useState<ChecklistItem[]>(() => {
    const stored = parseStoredValue<ChecklistItem[]>(ITEMS_KEY);
    return mergeChecklistItems(stored);
  });

  const [vehicleParts, setVehicleParts] = useState<VehiclePart[]>(() => {
    const stored = parseStoredValue<VehiclePart[]>(PARTS_KEY);
    return Array.isArray(stored) ? stored : DEFAULT_VEHICLE_PARTS;
  });

  const [fuelLevels, setFuelLevels] = useState<FuelLevelConfig[]>(() => {
    const stored = parseStoredValue<FuelLevelConfig[]>(FUEL_KEY);
    return mergeFuelLevels(stored);
  });

  useEffect(() => {
    localStorage.setItem(ITEMS_KEY, JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    localStorage.setItem(PARTS_KEY, JSON.stringify(vehicleParts));
  }, [vehicleParts]);

  useEffect(() => {
    localStorage.setItem(FUEL_KEY, JSON.stringify(fuelLevels));
  }, [fuelLevels]);

  const addItem = (item: ChecklistItem) => {
    setItems((prev) => [...prev, item]);
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const updateItem = (id: string, updates: Partial<ChecklistItem>) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, ...updates } : i))
    );
  };

  const addVehiclePart = (part: VehiclePart) => {
    setVehicleParts((prev) => [...prev, part]);
  };

  const removeVehiclePart = (id: string) => {
    setVehicleParts((prev) => prev.filter((p) => p.id !== id));
  };

  const updateVehiclePart = (id: string, updates: Partial<VehiclePart>) => {
    setVehicleParts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
  };

  const updateFuelLevel = (level: FuelLevelConfig["level"], penaltyValue: number) => {
    setFuelLevels((prev) =>
      prev.map((f) => (f.level === level ? { ...f, penaltyValue } : f))
    );
  };

  const archiveItem = (id: string) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, active: false } : i)));
  };

  const archiveVehiclePart = (id: string) => {
    setVehicleParts((prev) => prev.map((p) => (p.id === id ? { ...p, active: false } : p)));
  };

  const activeItems = items.filter((i) => i.active !== false);
  const activeVehicleParts = vehicleParts.filter((p) => p.active !== false);

  const resetToDefaults = () => {
    setItems(DEFAULT_ITEMS);
    setVehicleParts(DEFAULT_VEHICLE_PARTS);
    setFuelLevels(DEFAULT_FUEL_LEVELS);
  };

  return {
    items,
    activeItems,
    addItem,
    removeItem,
    archiveItem,
    updateItem,
    vehicleParts,
    activeVehicleParts,
    addVehiclePart,
    removeVehiclePart,
    archiveVehiclePart,
    updateVehiclePart,
    fuelLevels,
    updateFuelLevel,
    resetToDefaults,
  };
}
