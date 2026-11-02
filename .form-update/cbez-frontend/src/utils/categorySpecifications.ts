export interface SpecificationField {
  key: string;
  label: string;
  type: string;
  options?: string[];
  searchable?: boolean;
  allowCustomValue?: boolean;
  visibleWhen?: { field: string; values: string[]; caseInsensitive: boolean };
  [property: string]: unknown;
}

const select = (
  key: string,
  label: string,
  options: string[],
  unit?: string,
): SpecificationField => ({
  key,
  label,
  type: 'select',
  options,
  searchable: true,
  allowCustomValue: true,
  required: false,
  filterable: true,
  ...(unit ? { unit } : {}),
});
const ram = [
  '1 GB',
  '2 GB',
  '3 GB',
  '4 GB',
  '6 GB',
  '8 GB',
  '12 GB',
  '16 GB',
  '24 GB',
  '32 GB',
  '48 GB',
  '64 GB',
  '96 GB',
  '128 GB',
];
const storage = [
  '8 GB',
  '16 GB',
  '32 GB',
  '64 GB',
  '128 GB',
  '256 GB',
  '512 GB',
  '1 TB',
  '2 TB',
  '4 TB',
  '8 TB',
];
const capacity = select(
  'batteryCapacity',
  'Battery Capacity',
  [
    '1000 mAh',
    '1500 mAh',
    '2000 mAh',
    '2500 mAh',
    '3000 mAh',
    '3500 mAh',
    '4000 mAh',
    '4500 mAh',
    '5000 mAh',
    '5500 mAh',
    '6000 mAh',
    '6500 mAh',
    '7000 mAh',
    '8000 mAh',
    '10000 mAh',
  ],
  'mAh',
);
const display = select('displaySize', 'Display Size', [
  '5 inch',
  '5.5 inch',
  '6 inch',
  '6.1 inch',
  '6.2 inch',
  '6.3 inch',
  '6.4 inch',
  '6.5 inch',
  '6.6 inch',
  '6.7 inch',
  '6.8 inch',
  '6.9 inch',
  '8 inch',
  '10.2 inch',
  '10.9 inch',
  '11 inch',
  '12.9 inch',
  '13 inch',
  '13.3 inch',
  '14 inch',
  '15.6 inch',
  '16 inch',
  '17.3 inch',
]);
const health = select(
  'batteryHealth',
  'Battery Health (%)',
  Array.from({ length: 101 }, (_, i) => String(100 - i)),
  '%',
);
const camera = [
  '2 MP',
  '5 MP',
  '8 MP',
  '12 MP',
  '13 MP',
  '16 MP',
  '20 MP',
  '32 MP',
  '48 MP',
  '50 MP',
  '64 MP',
  '108 MP',
  '200 MP',
];
const common = [
  select('color', 'Color', [
    'Black',
    'White',
    'Silver',
    'Grey',
    'Blue',
    'Green',
    'Red',
    'Gold',
    'Rose Gold',
    'Purple',
    'Pink',
    'Yellow',
    'Orange',
    'Natural Titanium',
  ]),
];
const mobile = [
  select('ram', 'RAM', ram),
  select('storage', 'Storage', storage),
  select('processor', 'Processor / Chipset', [
    'Apple A13 Bionic',
    'Apple A14 Bionic',
    'Apple A15 Bionic',
    'Apple A16 Bionic',
    'Apple A17 Pro',
    'Apple A18',
    'Apple A18 Pro',
    'Snapdragon 8 Gen 1',
    'Snapdragon 8 Gen 2',
    'Snapdragon 8 Gen 3',
    'Snapdragon 8 Elite',
    'MediaTek Dimensity',
    'MediaTek Helio',
    'Samsung Exynos',
    'Google Tensor',
  ]),
  display,
  capacity,
  select('frontCamera', 'Front Camera', camera, 'MP'),
  select('rearCamera', 'Rear Camera', camera, 'MP'),
  select('operatingSystem', 'Operating System', [
    'Android',
    'iOS',
    'HarmonyOS',
  ]),
  select('network', 'Network', ['5G', '4G LTE', '3G', '2G']),
  select('simType', 'SIM Type', [
    'Single SIM',
    'Dual SIM',
    'eSIM',
    'Nano SIM + eSIM',
    'Dual eSIM',
  ]),
];
const laptop = [
  select('ram', 'RAM', ram),
  select('storage', 'Storage Capacity', storage),
  select('processor', 'Processor', [
    'Intel Core i3',
    'Intel Core i5',
    'Intel Core i7',
    'Intel Core i9',
    'Intel Core Ultra 5',
    'Intel Core Ultra 7',
    'Intel Core Ultra 9',
    'AMD Ryzen 3',
    'AMD Ryzen 5',
    'AMD Ryzen 7',
    'AMD Ryzen 9',
    'Apple M1',
    'Apple M2',
    'Apple M3',
    'Apple M4',
  ]),
  select('ssdOrHdd', 'Storage Type', [
    'SSD',
    'HDD',
    'Hybrid (SSD+HDD)',
    'eMMC',
  ]),
  select('gpu', 'Graphics Card / GPU', [
    'Intel Integrated',
    'Intel Iris Xe',
    'Intel Arc',
    'AMD Radeon',
    'NVIDIA GTX',
    'NVIDIA RTX 3050',
    'NVIDIA RTX 3060',
    'NVIDIA RTX 4050',
    'NVIDIA RTX 4060',
    'NVIDIA RTX 4070',
    'NVIDIA RTX 4080',
    'NVIDIA RTX 4090',
    'Apple Integrated',
  ]),
  display,
  select('operatingSystem', 'Operating System', [
    'Windows 11',
    'Windows 10',
    'macOS',
    'Linux',
    'ChromeOS',
    'DOS',
  ]),
  health,
];
const audio = [
  select('connectivity', 'Connectivity', [
    'True Wireless (TWS)',
    'Wireless Bluetooth',
    'Wired 3.5mm',
    'Wired Type-C',
    'Wired USB',
    'Wireless + Wired',
  ]),
  select('bluetoothVersion', 'Bluetooth Version', [
    '4.0',
    '4.1',
    '4.2',
    '5.0',
    '5.1',
    '5.2',
    '5.3',
    '5.4',
    '6.0',
    'Not Applicable',
  ]),
  select('batteryLife', 'Battery Playtime', [
    '4 Hours',
    '6 Hours',
    '8 Hours',
    '12 Hours',
    '20 Hours',
    '24 Hours',
    '30 Hours',
    '40 Hours',
    '50 Hours',
    '60 Hours',
  ]),
  select('noiseCancellation', 'Active Noise Cancellation (ANC)', ['Yes', 'No']),
  select('driverSize', 'Driver Size', [
    '6 mm',
    '8 mm',
    '10 mm',
    '11 mm',
    '12 mm',
    '13 mm',
    '14 mm',
    '40 mm',
    '50 mm',
  ]),
  select('waterResistance', 'Water Resistance Rating', [
    'None',
    'IPX4',
    'IPX5',
    'IPX6',
    'IPX7',
    'IP54',
    'IP55',
    'IP67',
    'IP68',
  ]),
];
const accessories = [
  select('productType', 'Product Type', [
    'Charger',
    'Cable',
    'Power Bank',
    'Case / Cover',
    'Screen Protector',
    'Adapter',
    'Dock',
    'Keyboard',
    'Mouse',
    'Smart Watch',
    'Watch Strap',
    'Other',
  ]),
  select('compatibility', 'Compatibility', [
    'Universal',
    'Android',
    'iPhone',
    'iPad',
    'Windows',
    'macOS',
    'USB-C Devices',
  ]),
  select('connectivity', 'Connectivity', [
    'USB-C',
    'USB-A',
    'Lightning',
    'Micro USB',
    'Bluetooth',
    'Wi-Fi',
    'Wireless',
    'Wired',
  ]),
  select('powerOutput', 'Power Output', [
    '5 W',
    '10 W',
    '15 W',
    '18 W',
    '20 W',
    '25 W',
    '30 W',
    '33 W',
    '45 W',
    '65 W',
    '67 W',
    '100 W',
    '120 W',
  ]),
];

/** Enrich response metadata only; stored definitions and product values remain intact. */
export function categorySpecifications(
  name: string,
  slug: string,
  stored: unknown,
): SpecificationField[] {
  const identity = `${name} ${slug}`.toLowerCase();
  const isMobile = /mobile|smartphone|iphone/.test(identity);
  let defaults: SpecificationField[] = [];
  if (isMobile)
    defaults = [
      ...mobile,
      {
        ...health,
        visibleWhen: {
          field: 'brand',
          values: ['Apple'],
          caseInsensitive: true,
        },
      },
    ];
  else if (/laptop|macbook|notebook/.test(identity)) defaults = laptop;
  else if (/tablet|ipad/.test(identity))
    defaults = [
      ...mobile.filter((f) => f.key !== 'operatingSystem'),
      select('operatingSystem', 'Operating System', [
        'Android',
        'iPadOS',
        'Windows',
      ]),
    ];
  else if (/audio|earbud|headphone|earphone|speaker/.test(identity))
    defaults = audio;
  else if (/gaming|console/.test(identity))
    defaults = [
      select('platform', 'Console Platform', [
        'PlayStation 5',
        'PlayStation 4 Pro',
        'PlayStation 4',
        'Xbox Series X',
        'Xbox Series S',
        'Nintendo Switch OLED',
        'Nintendo Switch',
        'Steam Deck',
      ]),
      select('storage', 'Internal Storage', storage),
      select('controllersIncluded', 'Controllers Included', [
        'No Controller',
        '1 Controller',
        '2 Controllers',
        '3 Controllers',
        '4 Controllers',
      ]),
      select('resolutionSupport', 'Resolution Support', [
        '720p',
        '1080p Full HD',
        '1440p',
        '4K HDR',
        '8K',
      ]),
    ];
  else if (/camera|photography/.test(identity))
    defaults = [
      select('sensorType', 'Camera Sensor Type', [
        'Full Frame',
        'APS-C',
        'Micro Four Thirds',
        '1-inch Sensor',
      ]),
      select('resolution', 'Resolution (Megapixels)', camera),
      select('lensType', 'Lens Mount / Included Lens', [
        'Canon RF',
        'Canon EF',
        'Nikon Z',
        'Nikon F',
        'Sony E-Mount',
        'Fujifilm X',
        'Micro Four Thirds',
        '18-55mm Kit Lens',
      ]),
      select('videoResolution', 'Max Video Resolution', [
        '1080p 60fps',
        '1080p 120fps',
        '4K 30fps',
        '4K 60fps',
        '8K Video',
      ]),
      select('shutterCount', 'Shutter Count', [
        '0',
        '1000',
        '5000',
        '10000',
        '25000',
        '50000',
        '100000',
      ]),
    ];
  else if (/accessor|watch|charger|cable/.test(identity))
    defaults = accessories;
  if (defaults.length) defaults = [...defaults, ...common];

  const fields = Array.isArray(stored)
    ? stored.filter(
        (f): f is SpecificationField => f && typeof f.key === 'string',
      )
    : [];
  const result = fields
    .filter(
      (f) => !isMobile || !['camera', 'batteryPercentage'].includes(f.key),
    )
    .map((field) => {
      const preset = defaults.find((f) => f.key === field.key);
      const options = [
        ...new Set([
          ...(preset?.options || []),
          ...(Array.isArray(field.options) ? field.options : []),
        ]),
      ];
      return {
        ...field,
        ...(preset || {}),
        // Keep custom validation and filtering settings.
        required: field.required ?? preset?.required ?? false,
        filterable: field.filterable ?? preset?.filterable ?? true,
        ...(options.length
          ? {
              type: field.type === 'multi-select' ? 'multi-select' : 'select',
              options,
              searchable: true,
              allowCustomValue: true,
            }
          : {}),
      };
    });
  for (const field of defaults)
    if (!result.some((f) => f.key === field.key))
      result.push(field as (typeof result)[number]);
  return result;
}
