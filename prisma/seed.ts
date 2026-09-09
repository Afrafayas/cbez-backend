import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Real-World Database for Cbez B2C...');

  // Delete existing records
  await prisma.lead.deleteMany();
  await prisma.product.deleteMany();
  await prisma.shop.deleteMany();
  await prisma.user.deleteMany();
  await prisma.category.deleteMany();
  await prisma.brand.deleteMany();

  const hashedPassword = await bcrypt.hash('password123', 10);

  // 1. Create Real-World Categories
  const categories = [
    { name: 'Smartphones & Mobiles', slug: 'smartphones', image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800' },
    { name: 'Laptops & MacBooks', slug: 'laptops', image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800' },
    { name: 'Tablets & iPads', slug: 'tablets', image: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800' },
    { name: 'Smartwatches & Wearables', slug: 'smartwatches', image: 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=800' },
    { name: 'Audio & Wireless Earbuds', slug: 'audio-earbuds', image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800' },
    { name: 'Gaming Consoles & Accessories', slug: 'gaming-accessories', image: 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=800' },
    { name: 'Cameras & Photography', slug: 'cameras', image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800' },
    { name: 'Televisions & Home Audio', slug: 'televisions', image: 'https://images.unsplash.com/photo-1593784991095-a205069470b6?w=800' },
  ];

  for (const cat of categories) {
    await prisma.category.create({ data: cat });
  }
  console.log(`✅ Seeded ${categories.length} Real Categories`);

  // 2. Create Real-World Brands
  const brands = [
    { name: 'Apple', logo: 'https://logo.clearbit.com/apple.com' },
    { name: 'Samsung', logo: 'https://logo.clearbit.com/samsung.com' },
    { name: 'OnePlus', logo: 'https://logo.clearbit.com/oneplus.com' },
    { name: 'Xiaomi', logo: 'https://logo.clearbit.com/mi.com' },
    { name: 'Realme', logo: 'https://logo.clearbit.com/realme.com' },
    { name: 'Vivo', logo: 'https://logo.clearbit.com/vivo.com' },
    { name: 'Oppo', logo: 'https://logo.clearbit.com/oppo.com' },
    { name: 'Motorola', logo: 'https://logo.clearbit.com/motorola.com' },
    { name: 'Nothing', logo: 'https://logo.clearbit.com/nothing.tech' },
    { name: 'Google Pixel', logo: 'https://logo.clearbit.com/google.com' },
    { name: 'Sony', logo: 'https://logo.clearbit.com/sony.com' },
    { name: 'Dell', logo: 'https://logo.clearbit.com/dell.com' },
    { name: 'HP', logo: 'https://logo.clearbit.com/hp.com' },
    { name: 'Lenovo', logo: 'https://logo.clearbit.com/lenovo.com' },
    { name: 'Asus', logo: 'https://logo.clearbit.com/asus.com' },
    { name: 'Acer', logo: 'https://logo.clearbit.com/acer.com' },
    { name: 'JBL', logo: 'https://logo.clearbit.com/jbl.com' },
    { name: 'boAt', logo: 'https://logo.clearbit.com/boat-lifestyle.com' },
  ];

  for (const b of brands) {
    await prisma.brand.create({ data: b });
  }
  console.log(`✅ Seeded ${brands.length} Real Brands`);

  // 3. Create Seller User
  const sellerUser = await prisma.user.create({
    data: {
      email: 'seller@cbez.com',
      password: hashedPassword,
      name: 'Kochi iStore Mobiles Owner',
      phone: '+91 9876543210',
      role: 'seller',
    },
  });

  // 4. Create Customer User
  const customerUser = await prisma.user.create({
    data: {
      email: 'customer@cbez.com',
      password: hashedPassword,
      name: 'Anjali Nair',
      phone: '+91 9123456789',
      role: 'customer',
    },
  });

  // 5. Create Shop linked to Seller User
  const shop = await prisma.shop.create({
    data: {
      name: 'Kochi iStore Mobiles',
      ownerName: sellerUser.name,
      phone: '+91 9876543210',
      whatsapp: '919876543210',
      address: 'MG Road, Broadway Corner',
      city: 'Kochi',
      category: 'Smartphones & Mobiles',
      verified: true,
      rating: 4.9,
      ownerId: sellerUser.id,
    },
  });

  // 6. Create Real Products
  const p1 = await prisma.product.create({
    data: {
      name: 'iPhone 15 Pro Max 256GB Natural Titanium',
      brand: 'Apple',
      category: 'Smartphones & Mobiles',
      description: 'Original Indian retail unit with 100% battery health & store warranty.',
      price: 128000,
      stock: 3,
      specsJson: JSON.stringify({ Storage: '256GB', RAM: '8GB', Condition: 'Grade A+ Like New', Warranty: '6 Months Store Warranty' }),
      imagesJson: JSON.stringify(['https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800']),
      shopId: shop.id,
    },
  });

  await prisma.product.create({
    data: {
      name: 'Samsung Galaxy S24 Ultra 5G 512GB Titanium Black',
      brand: 'Samsung',
      category: 'Smartphones & Mobiles',
      description: 'Snapdragon 8 Gen 3 flagship with S-Pen & 200MP camera.',
      price: 118000,
      stock: 4,
      specsJson: JSON.stringify({ Storage: '512GB', RAM: '12GB', Condition: 'Spotless Mint Condition', Warranty: '9 Months Official Samsung' }),
      imagesJson: JSON.stringify(['https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=800']),
      shopId: shop.id,
    },
  });

  await prisma.product.create({
    data: {
      name: 'MacBook Air M3 15-inch 16GB 512GB Space Grey',
      brand: 'Apple',
      category: 'Laptops & MacBooks',
      description: 'Apple Silicon M3 chip, liquid retina display with fast magsafe charger.',
      price: 124000,
      stock: 2,
      specsJson: JSON.stringify({ Processor: 'Apple M3', Storage: '512GB SSD', RAM: '16GB Unified', Condition: 'Open Box Demo Unit' }),
      imagesJson: JSON.stringify(['https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800']),
      shopId: shop.id,
    },
  });

  // 7. Create Lead
  await prisma.lead.create({
    data: {
      shopId: shop.id,
      productId: p1.id,
      productName: p1.name,
      customerName: customerUser.name,
      customerPhone: customerUser.phone || '+91 9123456789',
      contactType: 'whatsapp',
    },
  });

  console.log('✅ Real-World Database Seeding Successful!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
