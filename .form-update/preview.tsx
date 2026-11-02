import React from 'react';
import { createRoot } from 'react-dom/client';
import { AddEditProductModal } from '../../cbez-admin/src/components/AddEditProductModal';

const product = {
  id: 'fixture-product', name: 'Existing phone', brand: 'Apple', category: 'Mobiles',
  description: 'Existing device', price: 10000, stock: 1, shopId: 'fixture-shop',
  images: ['a.jpg', 'b.jpg', 'c.jpg', 'd.jpg'],
  specs: { ram: '192 GB', storage: '256 GB', 'Battery Health': '94%', 'Camera': 'Legacy camera description', 'Battery Percentage': '80%', 'Custom Legacy Field': 'Preserve me' },
};
createRoot(document.getElementById('root')!).render(<AddEditProductModal
  isOpen onClose={() => {}} onSave={async data => { (window as any).savedPayload = data; }}
  shops={[{ id: 'fixture-shop', name: 'Fixture shop', verified: true } as any]}
  brands={[{ id: 'apple', name: 'Apple' }, { id: 'samsung', name: 'Samsung' }]}
  categories={[{ id: 'mobile', name: 'Mobiles' }, { id: 'audio', name: 'Headphones' }, { id: 'laptop', name: 'Laptops' }]}
  productToEdit={product as any} />);
