import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Electronics Categories & Subscription Plans...');

  const categories = [
    {
      name: 'Smartphones & Mobiles',
      slug: 'smartphones',
      image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800',
      specConfig: [
        { key: 'ram', label: 'RAM', type: 'select', required: true, options: ['2 GB', '3 GB', '4 GB', '6 GB', '8 GB', '12 GB', '16 GB'], filterable: true },
        { key: 'storage', label: 'Storage', type: 'select', required: true, options: ['32 GB', '64 GB', '128 GB', '256 GB', '512 GB', '1 TB'], filterable: true },
        { key: 'processor', label: 'Processor / Chipset', type: 'text', required: false, placeholder: 'e.g. Snapdragon 8 Gen 3, Apple A17 Pro', filterable: true },
        { key: 'displaySize', label: 'Display Size', type: 'text', required: false, placeholder: 'e.g. 6.7 inch Super Retina XDR', filterable: false },
        { key: 'batteryHealth', label: 'Battery Health (%)', type: 'number', required: false, unit: '%', placeholder: 'e.g. 92', filterable: true },
        { key: 'camera', label: 'Camera Specs', type: 'text', required: false, placeholder: 'e.g. 48MP Main + 12MP Telephoto', filterable: false },
        { key: 'operatingSystem', label: 'Operating System', type: 'select', required: false, options: ['iOS', 'Android'], filterable: true },
        { key: 'network', label: 'Network', type: 'select', required: false, options: ['5G', '4G LTE', '3G'], filterable: true },
      ],
    },
    {
      name: 'Laptops & MacBooks',
      slug: 'laptops',
      image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800',
      specConfig: [
        { key: 'processor', label: 'Processor', type: 'text', required: false, placeholder: 'e.g. Intel Core i7 13th Gen, Apple M3', filterable: true },
        { key: 'ram', label: 'RAM', type: 'select', required: true, options: ['8 GB', '16 GB', '32 GB', '64 GB'], filterable: true },
        { key: 'storage', label: 'Storage Capacity', type: 'select', required: true, options: ['256 GB', '512 GB', '1 TB', '2 TB'], filterable: true },
        { key: 'ssdOrHdd', label: 'Storage Type', type: 'select', required: false, options: ['SSD', 'HDD', 'Hybrid (SSD+HDD)'], filterable: true },
        { key: 'gpu', label: 'Graphics Card / GPU', type: 'text', required: false, placeholder: 'e.g. NVIDIA RTX 4060, Integrated M3', filterable: true },
        { key: 'displaySize', label: 'Display Size', type: 'select', required: false, options: ['13.3 inch', '14 inch', '15.6 inch', '16 inch', '17.3 inch'], filterable: true },
        { key: 'operatingSystem', label: 'Operating System', type: 'select', required: false, options: ['macOS', 'Windows 11', 'Windows 10', 'Linux', 'ChromeOS'], filterable: true },
        { key: 'batteryHealth', label: 'Battery Health / Cycle Count', type: 'text', required: false, placeholder: 'e.g. 88% or 150 cycles', filterable: false },
      ],
    },
    {
      name: 'Audio & Wireless Earbuds',
      slug: 'audio-earbuds',
      image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800',
      specConfig: [
        { key: 'connectivity', label: 'Connectivity', type: 'select', required: true, options: ['True Wireless (TWS)', 'Wireless Bluetooth', 'Wired 3.5mm', 'Wired Type-C'], filterable: true },
        { key: 'bluetoothVersion', label: 'Bluetooth Version', type: 'text', required: false, placeholder: 'e.g. Bluetooth 5.3', filterable: false },
        { key: 'batteryLife', label: 'Battery Playtime', type: 'text', required: false, placeholder: 'e.g. 30 Hours with Case', filterable: true },
        { key: 'noiseCancellation', label: 'Active Noise Cancellation (ANC)', type: 'boolean', required: false, filterable: true },
        { key: 'driverSize', label: 'Driver Size', type: 'text', required: false, placeholder: 'e.g. 11mm Dynamic Driver', filterable: false },
        { key: 'waterResistance', label: 'Water Resistance Rating', type: 'text', required: false, placeholder: 'e.g. IPX4, IPX7', filterable: false },
      ],
    },
    {
      name: 'Cameras & Photography',
      slug: 'cameras',
      image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800',
      specConfig: [
        { key: 'sensorType', label: 'Camera Sensor Type', type: 'select', required: true, options: ['Full Frame', 'APS-C', 'Micro Four Thirds', '1-inch Sensor'], filterable: true },
        { key: 'resolution', label: 'Resolution (Megapixels)', type: 'text', required: true, placeholder: 'e.g. 24.2 MP, 33 MP', filterable: true },
        { key: 'lensType', label: 'Lens Mount / Included Lens', type: 'text', required: false, placeholder: 'e.g. Sony E-Mount, 18-55mm Kit Lens', filterable: false },
        { key: 'videoResolution', label: 'Max Video Resolution', type: 'select', required: false, options: ['4K 60fps', '4K 30fps', '1080p 120fps', '8K Video'], filterable: true },
        { key: 'shutterCount', label: 'Shutter Count', type: 'number', required: false, placeholder: 'e.g. 12000', filterable: true },
      ],
    },
    {
      name: 'Gaming Consoles & Accessories',
      slug: 'gaming-accessories',
      image: 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=800',
      specConfig: [
        { key: 'platform', label: 'Console Platform', type: 'select', required: true, options: ['PlayStation 5', 'PlayStation 4 Pro', 'PlayStation 4', 'Xbox Series X', 'Xbox Series S', 'Nintendo Switch OLED', 'Nintendo Switch', 'Steam Deck'], filterable: true },
        { key: 'storage', label: 'Internal Storage', type: 'select', required: true, options: ['512 GB', '825 GB SSD', '1 TB SSD', '2 TB SSD'], filterable: true },
        { key: 'controllersIncluded', label: 'Controllers Included', type: 'select', required: false, options: ['1 Controller', '2 Controllers', 'No Controller'], filterable: true },
        { key: 'resolutionSupport', label: 'Resolution Support', type: 'select', required: false, options: ['4K HDR', '1440p', '1080p Full HD'], filterable: false },
      ],
    },
  ];

  for (const catData of categories) {
    const { specConfig, ...catFields } = catData;
    const specConfigJson = JSON.stringify(specConfig);

    const existing = await prisma.category.findFirst({
      where: {
        OR: [
          { name: catFields.name },
          { slug: catFields.slug },
        ],
      },
    });

    if (existing) {
      await prisma.category.update({
        where: { id: existing.id },
        data: {
          name: catFields.name,
          slug: catFields.slug,
          image: catFields.image,
          specConfigJson,
        },
      });
    } else {
      await prisma.category.create({
        data: {
          ...catFields,
          specConfigJson,
        },
      });
    }
  }

  console.log(`✅ Successfully seeded ${categories.length} official Used Electronics category templates!`);

  console.log('🌱 Seeding Default Subscription Plans...');

  const plans = [
    {
      name: 'Free Starter Plan',
      description: 'Default starter plan for new verified store partners (up to 5 active device listings).',
      productLimit: 5,
      status: 'ACTIVE',
      price: 0,
    },
    {
      name: 'Standard Store Plan',
      description: 'Growth plan for active electronics retailers (up to 25 active device listings).',
      productLimit: 25,
      status: 'ACTIVE',
      price: 499,
    },
    {
      name: 'Premium Pro Plan',
      description: 'Pro enterprise plan for high volume electronics dealers (up to 100 active device listings).',
      productLimit: 100,
      status: 'ACTIVE',
      price: 999,
    },
  ];

  for (const planData of plans) {
    const existing = await prisma.subscriptionPlan.findUnique({
      where: { name: planData.name },
    });

    if (existing) {
      await prisma.subscriptionPlan.update({
        where: { id: existing.id },
        data: planData,
      });
    } else {
      await prisma.subscriptionPlan.create({
        data: planData,
      });
    }
  }

  console.log(`✅ Successfully seeded ${plans.length} subscription plans!`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
