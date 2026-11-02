import { categorySpecifications } from './categorySpecifications';
import type { SpecificationField } from './categorySpecifications';

export const fieldAliases: Record<string, string> = {
  os: 'operatingSystem', storageType: 'ssdOrHdd', storageCapacity: 'storage', graphics: 'gpu',
};
const common: Record<string, string[]> = {
  batteryHealth: Array.from({ length: 101 }, (_, i) => `${100 - i}%`),
  productType: ['Headphones', 'Earbuds', 'Speaker', 'Charger', 'Cable', 'Power Bank', 'Case / Cover', 'Keyboard', 'Mouse', 'Smart Watch', 'Camera', 'Gaming Console', 'Other'],
  compatibility: ['Universal', 'Android', 'iPhone', 'iPad', 'Windows', 'macOS', 'USB-C Devices'],
  condition: ['Brand New Sealed', 'Open Box', 'Grade A (Like New)', 'Grade B (Excellent)', 'Grade C (Good)', 'Refurbished Certified'],
  warranty: ['None', '7 Days Shop Warranty', '1 Month Shop Warranty', '3 Months Shop Warranty', '6 Months Shop Warranty', '1 Year Shop Warranty', 'Brand Warranty Remaining'],
  deviceAge: ['Less than 1 Month', '1 Month', '3 Months', '6 Months', '1 Year', '2 Years', '3 Years', '4 Years', '5 Years'],
  includedItems: ['Original Box', 'Charger', 'Cable', 'Invoice', 'Original Box, Charger & Cable', 'Device Only'],
  keyboardLayout: ['US English', 'UK English', 'Backlit', 'Non-backlit', 'RGB Backlit'],
  batteryBackup: ['1 Hour', '2 Hours', '4 Hours', '6 Hours', '8 Hours', '10 Hours', '12 Hours', '18 Hours'],
  resolution: ['HD', 'Full HD', '2K', 'QHD', '4K', 'Retina'],
  simWifi: ['Wi-Fi Only', 'Wi-Fi + Cellular', 'Wi-Fi + 5G', 'Wi-Fi + 4G LTE'],
  camera: ['8 MP', '12 MP', '13 MP', '16 MP', '48 MP', '50 MP'],
};
export function formSpecifications(category: string, stored?: unknown) {
  return categorySpecifications(category, '', stored);
}
export function formOptions(key: string, fields: SpecificationField[]) {
  return fields.find(field => field.key === (fieldAliases[key] || key))?.options || common[key] || [];
}
export function representedFields(group: string): string[] {
  const shared = ['color', 'condition', 'warranty'];
  if (group === 'mobile') return [...shared, 'ram', 'storage', 'processor', 'displaySize', 'batteryHealth', 'batteryCapacity', 'frontCamera', 'rearCamera', 'simType', 'network', 'operatingSystem'];
  if (group === 'laptop') return [...shared, 'ram', 'storage', 'processor', 'displaySize', 'batteryHealth', 'ssdOrHdd', 'gpu', 'resolution', 'batteryBackup', 'operatingSystem', 'keyboardLayout'];
  if (group === 'tablet') return [...shared, 'ram', 'storage', 'processor', 'displaySize', 'batteryHealth', 'simWifi', 'operatingSystem', 'camera'];
  return ['productType', 'compatibility', 'condition', 'warranty', 'model'];
}

export function fieldVisible(field: SpecificationField, brand: string) {
  if (!field.visibleWhen) return true;
  if (field.visibleWhen.field !== 'brand') return true;
  return field.visibleWhen.values.some(value => field.visibleWhen?.caseInsensitive ? value.toLowerCase() === brand.trim().toLowerCase() : value === brand);
}

/** Read both canonical API keys and older human-readable specification labels. */
export function editableSpecifications(stored: Record<string, string>) {
  const specs = { ...stored };
  const labels: Record<string, string[]> = {
    ram: ['RAM'], storage: ['Storage', 'Storage Capacity'], processor: ['Processor', 'Processor / Chipset'],
    displaySize: ['Display Size'], batteryHealth: ['Battery Health'], batteryCapacity: ['Battery Capacity'],
    frontCamera: ['Front Camera'], rearCamera: ['Rear Camera'], operatingSystem: ['Operating System', 'OS'],
    network: ['Network (5G/4G)'], simType: ['SIM Type'], ssdOrHdd: ['Storage Type'], gpu: ['Graphics / GPU'],
    color: ['Color'], condition: ['Condition'], warranty: ['Warranty'], productType: ['Product Type'],
    compatibility: ['Compatibility'], resolution: ['Resolution'], batteryBackup: ['Battery Backup'],
    keyboardLayout: ['Keyboard Layout'], simWifi: ['SIM / Wi-Fi'], model: ['Model'],
  };
  for (const [key, aliases] of Object.entries(labels)) {
    const value = specs[key] ?? aliases.map(label => specs[label]).find(value => value !== undefined);
    if (value !== undefined) for (const label of aliases) if (specs[label] === undefined) specs[label] = value;
  }
  return specs;
}
