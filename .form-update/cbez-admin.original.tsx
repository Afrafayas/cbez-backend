import React, { useState, useEffect, FormEvent } from 'react';
import { X, Store, Loader2, Image as ImageIcon, Sparkles } from 'lucide-react';
import { Product, Shop, SubscriptionPlan, Category, Brand, normalizeProduct } from '../types';

interface AddEditProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (productData: any, isEdit: boolean, productId?: string) => Promise<void>;
  productToEdit?: Product | null;
  defaultShopId?: string;
  shops: Shop[];
  subscriptionPlans?: SubscriptionPlan[];
  categories?: Category[];
  brands?: Brand[];
  isLoading?: boolean;
}

export const AddEditProductModal: React.FC<AddEditProductModalProps> = ({
  isOpen,
  onClose,
  onSave,
  productToEdit,
  defaultShopId,
  shops,
  subscriptionPlans = [],
  categories = [],
  brands = [],
  isLoading = false,
}) => {
  const approvedShops = shops.filter(s => s.verified);
  const availableShops = approvedShops.length > 0 ? approvedShops : shops;

  const [selectedShopId, setSelectedShopId] = useState<string>('');
  const [formImages, setFormImages] = useState<string[]>(['', '', '', '']);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [productForm, setProductForm] = useState({
    name: '',
    brand: '',
    category: 'Mobiles',
    description: '',
    price: '',
    offerPrice: '',
    stock: '1',
    deviceAge: '',


    // Mobile / Common specs
    ram: '',
    storage: '',
    processor: '',
    displaySize: '',
    batteryHealth: '',
    batteryPercentage: '',
    simType: '',
    network: '',
    camera: '',
    os: '',
    imeiNumber: '',
    color: '',
    condition: '',
    warranty: '',

    // Laptop specs
    storageType: '',
    storageCapacity: '',
    graphics: '',
    resolution: '',
    batteryBackup: '',
    keyboardLayout: '',
    serialNumber: '',

    // Tablet specs
    simWifi: '',
    imeiSerial: '',

    // Accessories & Smart Watches specs
    productType: '',
    model: '',
    compatibility: '',
    includedItems: '',
    technicalSpecifications: ''
  });

  const getCategoryGroup = (catName: string): 'mobile' | 'laptop' | 'tablet' | 'accessory' => {
    const lower = catName ? catName.toLowerCase().trim() : '';
    if (lower.includes('laptop') || lower.includes('notebook') || lower.includes('macbook')) {
      return 'laptop';
    }
    if (lower.includes('tablet') || lower.includes('ipad')) {
      return 'tablet';
    }
    if (
      lower.includes('accessory') ||
      lower.includes('accessories') ||
      lower.includes('watch') ||
      lower.includes('smartwatch') ||
      lower.includes('audio') ||
      lower.includes('wearable') ||
      lower.includes('headphone') ||
      lower.includes('earbud') ||
      lower.includes('speaker') ||
      lower.includes('charger') ||
      lower.includes('gadget')
    ) {
      return 'accessory';
    }
    return 'mobile';
  };

  const currentCategoryGroup = getCategoryGroup(productForm.category);

  useEffect(() => {
    if (isOpen) {
      if (productToEdit) {
        const prod = normalizeProduct(productToEdit);
        setSelectedShopId(prod.shopId || (availableShops[0]?.id || ''));
        const sp = prod.specs || {};
        const rawOffer = prod.offerPrice !== undefined && prod.offerPrice !== null
          ? String(prod.offerPrice)
          : (sp['offerPrice'] || sp['Offer Price'] || '');
        const rawAge =
          prod.deviceAge ||
          (prod as any).device_age ||
          sp['Device Age'] ||
          sp['Device Age / Purchase Date'] ||
          sp['Purchase Date'] ||
          sp['purchaseDate'] ||
          sp['deviceAge'] ||
          sp['device_age'] ||
          sp['Usage Duration'] ||
          sp['usageDuration'] ||
          sp['Age'] ||
          (prod.conditionInfo as any)?.usageDuration ||
          (prod.conditionInfo as any)?.deviceAge ||
          (prod.conditionInfo as any)?.purchaseDate ||
          ((prod.conditionInfo as any)?.purchaseYear ? `Purchased in ${(prod.conditionInfo as any).purchaseYear}` : '') ||
          '';
        const rawIncluded = prod.includedItems || sp['Included Items'] || sp['Included items'] || sp['Included Accessories'] || '';

        setProductForm({
          name: prod.name || '',
          brand: prod.brand || '',
          category: prod.category || 'Mobiles',
          description: prod.description || '',
          price: prod.price ? String(prod.price) : '',
          offerPrice: rawOffer,
          stock: productToEdit.stock !== undefined ? String(productToEdit.stock) : '1',
          deviceAge: rawAge,
          includedItems: rawIncluded,

          ram: sp['RAM'] || '',
          storage: sp['Storage'] || '',
          processor: sp['Processor / Chipset'] || sp['Processor'] || '',
          displaySize: sp['Display Size'] || sp['Display size'] || '',
          batteryHealth: sp['Battery Health'] || '',
          batteryPercentage: sp['Battery Percentage'] || sp['Battery percentage'] || '',
          simType: sp['SIM Type'] || sp['SIM type'] || '',
          network: sp['Network (5G/4G)'] || sp['5G / 4G'] || '',
          camera: sp['Camera'] || '',
          os: sp['Operating System'] || sp['OS'] || '',
          imeiNumber: sp['IMEI'] || '',
          color: sp['Color'] || '',
          condition: sp['Condition'] || '',
          warranty: sp['Warranty'] || '',

          storageType: sp['Storage Type'] || sp['Storage type – SSD/HDD'] || '',
          storageCapacity: sp['Storage Capacity'] || '',
          graphics: sp['Graphics / GPU'] || sp['Graphics/GPU'] || '',
          resolution: sp['Resolution'] || '',
          batteryBackup: sp['Battery Backup'] || sp['Battery backup'] || '',
          keyboardLayout: sp['Keyboard Layout'] || sp['Keyboard layout'] || '',
          serialNumber: sp['Serial Number'] || sp['Serial number'] || '',

          simWifi: sp['SIM / Wi-Fi'] || '',
          imeiSerial: sp['IMEI / Serial Number'] || '',

          productType: sp['Product Type'] || sp['Product type'] || '',
          model: sp['Model'] || '',
          compatibility: sp['Compatibility'] || '',
          technicalSpecifications: sp['Technical Specifications'] || sp['Technical specifications'] || ''
        });

        if (productToEdit.images && productToEdit.images.length > 0) {
          const padded = [...productToEdit.images];
          while (padded.length < 4) padded.push('');
          setFormImages(padded);
        } else {
          setFormImages(['', '', '', '']);
        }
      } else {
        setSelectedShopId(defaultShopId || (availableShops[0]?.id || shops[0]?.id || ''));
        setFormImages(['', '', '', '']);
        setProductForm({
          name: '',
          brand: '',
          category: 'Mobiles',
          description: '',
          price: '',
          offerPrice: '',
          stock: '1',
          deviceAge: '',
          includedItems: '',

          ram: '',
          storage: '',
          processor: '',
          displaySize: '',
          batteryHealth: '',
          batteryPercentage: '',
          simType: '',
          network: '',
          camera: '',
          os: '',
          imeiNumber: '',
          color: '',
          condition: '',
          warranty: '',

          storageType: '',
          storageCapacity: '',
          graphics: '',
          resolution: '',
          batteryBackup: '',
          keyboardLayout: '',
          serialNumber: '',

          simWifi: '',
          imeiSerial: '',

          productType: '',
          model: '',
          compatibility: '',
          technicalSpecifications: ''
        });
      }
    }
  }, [productToEdit, isOpen, shops, defaultShopId]);

  if (!isOpen) return null;

  const currentSelectedShop = shops.find(s => s.id === selectedShopId);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isSubmitting || isLoading) return;

    if (!selectedShopId) {
      alert('Please select an approved dealer shop to assign this product to.');
      return;
    }

    const validImgs = formImages.map(img => (img ? img.trim() : '')).filter(Boolean);
    if (validImgs.length < 4) {
      alert('Please upload at least 4 photo angles (Front, Back, Left, Right side photos are required)');
      return;
    }

    let categorySpecs: Record<string, string> = {};

    if (currentCategoryGroup === 'mobile') {
      categorySpecs = {
        'RAM': productForm.ram,
        'Storage': productForm.storage,
        'Processor / Chipset': productForm.processor,
        'Display Size': productForm.displaySize,
        'Battery Health': productForm.batteryHealth,
        'Battery Percentage': productForm.batteryPercentage,
        'SIM Type': productForm.simType,
        'Network (5G/4G)': productForm.network,
        'Camera': productForm.camera,
        'Operating System': productForm.os,
        'IMEI': productForm.imeiNumber,
        'Color': productForm.color,
        'Condition': productForm.condition,
        'Warranty': productForm.warranty
      };
    } else if (currentCategoryGroup === 'laptop') {
      categorySpecs = {
        'Processor': productForm.processor,
        'RAM': productForm.ram,
        'Storage Type': productForm.storageType,
        'Storage Capacity': productForm.storageCapacity,
        'Graphics / GPU': productForm.graphics,
        'Display Size': productForm.displaySize,
        'Resolution': productForm.resolution,
        'Battery Health': productForm.batteryHealth,
        'Battery Backup': productForm.batteryBackup,
        'Operating System': productForm.os,
        'Keyboard Layout': productForm.keyboardLayout,
        'Serial Number': productForm.serialNumber,
        'Color': productForm.color,
        'Condition': productForm.condition,
        'Warranty': productForm.warranty
      };
    } else if (currentCategoryGroup === 'tablet') {
      categorySpecs = {
        'RAM': productForm.ram,
        'Storage': productForm.storage,
        'Processor': productForm.processor,
        'Display Size': productForm.displaySize,
        'SIM / Wi-Fi': productForm.simWifi,
        'Battery Health': productForm.batteryHealth,
        'OS': productForm.os,
        'Camera': productForm.camera,
        'Color': productForm.color,
        'IMEI / Serial Number': productForm.imeiSerial,
        'Condition': productForm.condition,
        'Warranty': productForm.warranty
      };
    } else if (currentCategoryGroup === 'accessory') {
      categorySpecs = {
        'Product Type': productForm.productType,
        'Brand': productForm.brand,
        'Model': productForm.model,
        'Compatibility': productForm.compatibility,
        'Condition': productForm.condition,
        'Warranty': productForm.warranty,
        'Included Items': productForm.includedItems,
        'Technical Specifications': productForm.technicalSpecifications
      };
    }

    const priceNum = Number(productForm.price);
    if (isNaN(priceNum) || priceNum < 0) {
      alert('Price must be a valid number and cannot be negative.');
      return;
    }

    let parsedOfferPrice: number | undefined = undefined;
    if (productForm.offerPrice && productForm.offerPrice.trim() !== '') {
      const offerNum = Number(productForm.offerPrice);
      if (isNaN(offerNum) || offerNum < 0) {
        alert('Offer Price must be a valid non-negative number.');
        return;
      }
      if (offerNum > priceNum) {
        alert('Offer Price cannot be higher than Regular Price.');
        return;
      }
      parsedOfferPrice = offerNum;
    }

    if (parsedOfferPrice !== undefined) {
      categorySpecs['offerPrice'] = String(parsedOfferPrice);
      categorySpecs['Offer Price'] = String(parsedOfferPrice);
    }
    const trimmedAge = productForm.deviceAge ? productForm.deviceAge.trim() : '';
    if (trimmedAge) {
      categorySpecs['Device Age'] = trimmedAge;
      categorySpecs['Device Age / Purchase Date'] = trimmedAge;
      categorySpecs['deviceAge'] = trimmedAge;
      categorySpecs['Usage Duration'] = trimmedAge;
    }
    if (productForm.includedItems && productForm.includedItems.trim()) {
      categorySpecs['Included Items'] = productForm.includedItems.trim();
    }

    const payload: any = {
      shopId: selectedShopId,
      name: productForm.name,
      brand: productForm.brand,
      category: productForm.category,
      description: productForm.description,
      price: priceNum,
      stock: Number(productForm.stock),
      specs: categorySpecs,
      conditionInfo: {
        ...(productToEdit?.conditionInfo || {}),
        condition: productForm.condition || (productToEdit?.conditionInfo as any)?.condition || 'Good',
        usageDuration: trimmedAge,
        warrantyStatus: productForm.warranty || (productToEdit?.conditionInfo as any)?.warrantyStatus,
        batteryHealth: productForm.batteryHealth || (productToEdit?.conditionInfo as any)?.batteryHealth,
      },
      images: validImgs,
    };

    try {
      setIsSubmitting(true);
      await onSave(payload, Boolean(productToEdit), productToEdit?.id);
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to save product');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
      <div
        className="w-full max-w-[860px] max-h-[92vh] overflow-y-auto bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl text-slate-100 relative p-8"
        style={{ padding: '2.25rem 2.5rem' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-6 pb-4 border-b border-slate-800 pr-10">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-5 h-5 text-orange-400" />
            <h2 className="text-xl font-bold text-white">
              {productToEdit ? 'Edit Dealer Gadget Listing' : 'Create Product Listing for Dealer Shop'}
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            Admin Portal &bull; Select an approved dealer shop, enter dynamic specifications, and upload multi-angle photos.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-5">
          {/* Approved Dealer Shop Selection Dropdown */}
          <div className="col-span-2 p-4 rounded-xl bg-orange-500/10 border border-orange-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-orange-400 uppercase tracking-wider flex items-center gap-1.5">
                <Store className="w-4 h-4" /> Select Approved Dealer Shop *
              </label>
              {currentSelectedShop && (
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400">
                  {currentSelectedShop.verified ? '✓ Verified Approved Shop' : '⚠️ Pending Shop'}
                </span>
              )}
            </div>

            <select
              required
              value={selectedShopId}
              onChange={(e) => setSelectedShopId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white font-semibold text-sm outline-none focus:border-orange-500 transition-colors"
            >
              <option value="" disabled>-- Choose Approved Dealer Shop --</option>
              {availableShops.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} - {s.ownerName} ({s.city}) {s.verified ? '[APPROVED]' : '[PENDING]'}
                </option>
              ))}
            </select>

            {currentSelectedShop && (
              <div className="text-xs text-slate-300 flex items-center justify-between pt-1 border-t border-orange-500/20">
                <span>Owner: <strong>{currentSelectedShop.ownerName}</strong> ({currentSelectedShop.phone})</span>
                <span>City: <strong>{currentSelectedShop.city}</strong></span>
              </div>
            )}
          </div>

          {/* Multi-Angle Photo Angle File Picker */}
          <div className="col-span-2 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-orange-400" /> Multi-Angle Product Photos (Upload Min 4, Max 7 Images) *
              </label>
              <span className="text-[11px] text-slate-400">Select image files directly from device storage</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {formImages.map((img, idx) => {
                const labels = [
                  '1. Front Side Photo *',
                  '2. Back Side Photo *',
                  '3. Left Side Photo *',
                  '4. Right Side Photo *',
                  '5. Top / Bottom Angle',
                  '6. Additional Angle 6',
                  '7. Additional Angle 7'
                ];
                const isRequired = idx < 4;
                const hasImage = Boolean(img && img.trim());

                const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
                  const file = e.target.files?.[0];
                  if (!file) return;

                  if (!file.type.startsWith('image/')) {
                    alert('Please select a valid image file (JPG, PNG, WEBP, etc.)');
                    return;
                  }

                  const reader = new FileReader();
                  reader.onload = (event) => {
                    const result = event.target?.result as string;
                    if (!result) return;

                    const tempImg = new Image();
                    tempImg.onload = () => {
                      const canvas = document.createElement('canvas');
                      const MAX_DIM = 960;
                      let w = tempImg.width;
                      let h = tempImg.height;

                      if (w > h) {
                        if (w > MAX_DIM) {
                          h = Math.round((h * MAX_DIM) / w);
                          w = MAX_DIM;
                        }
                      } else {
                        if (h > MAX_DIM) {
                          w = Math.round((w * MAX_DIM) / h);
                          h = MAX_DIM;
                        }
                      }

                      canvas.width = w;
                      canvas.height = h;
                      const ctx = canvas.getContext('2d');
                      ctx?.drawImage(tempImg, 0, 0, w, h);

                      const compressedBase64 = canvas.toDataURL('image/jpeg', 0.72);
                      const updated = [...formImages];
                      updated[idx] = compressedBase64;
                      setFormImages(updated);
                    };
                    tempImg.src = result;
                  };
                  reader.readAsDataURL(file);
                };

                return (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-xl border flex flex-col gap-2 relative ${
                      hasImage ? 'bg-emerald-950/20 border-emerald-500/50' : 'bg-slate-950 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
                      <span>{labels[idx] || `Photo ${idx + 1}`}</span>
                      {hasImage && <span className="text-emerald-400 text-[10px]">✓ Loaded</span>}
                    </div>

                    {hasImage ? (
                      <div className="flex items-center gap-2">
                        <img
                          src={img}
                          alt={labels[idx]}
                          className="w-12 h-12 object-cover rounded-lg border border-slate-700"
                        />
                        <div className="flex flex-col gap-1 flex-1">
                          <label className="text-[10px] font-bold text-orange-400 bg-orange-500/10 border border-orange-500/30 rounded py-0.5 text-center cursor-pointer hover:bg-orange-500/20 transition-colors">
                            Change
                            <input type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = [...formImages];
                              updated[idx] = '';
                              setFormImages(updated);
                            }}
                            className="text-[10px] font-bold text-red-400 bg-red-500/10 border border-red-500/30 rounded py-0.5 text-center cursor-pointer hover:bg-red-500/20 transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center p-3 bg-slate-900 border border-dashed border-slate-700 hover:border-orange-500/50 rounded-lg cursor-pointer text-center transition-colors">
                        <span className="text-xs font-bold text-orange-400">📁 Choose File</span>
                        <span className="text-[10px] text-slate-500">Select image file</span>
                        <input
                          type="file"
                          accept="image/*"
                          required={isRequired && !hasImage}
                          onChange={handleFileSelect}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                );
              })}
            </div>

            {formImages.length < 7 && (
              <button
                type="button"
                onClick={() => setFormImages([...formImages, ''])}
                className="text-xs font-semibold text-orange-400 hover:text-orange-300 transition-colors pt-1 cursor-pointer"
              >
                + Add Another Photo Angle Slot
              </button>
            )}
          </div>

          {/* Core Product Fields */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300">Category *</label>
            <select
              value={productForm.category}
              onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white font-medium text-xs outline-none focus:border-orange-500"
            >
              {categories.length > 0 ? (
                categories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))
              ) : (
                <>
                  <option value="Mobiles">Mobiles</option>
                  <option value="Laptops">Laptops</option>
                  <option value="Tablets">Tablets</option>
                  <option value="Accessories">Accessories</option>
                  <option value="Smart Watches">Smart Watches</option>
                </>
              )}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300">Brand *</label>
            <input
              type="text"
              required
              list="registered-brands-list"
              placeholder="e.g. Apple, Samsung, Dell, HP"
              value={productForm.brand}
              onChange={(e) => setProductForm({ ...productForm, brand: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white font-medium text-xs outline-none focus:border-orange-500"
            />
            {brands.length > 0 && (
              <datalist id="registered-brands-list">
                {brands.map((b) => (
                  <option key={b.id} value={b.name} />
                ))}
              </datalist>
            )}
          </div>

          <div className="col-span-2 space-y-1.5">
            <label className="text-xs font-bold text-slate-300">Product Title / Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. iPhone 15 Pro Max 256GB Natural Titanium"
              value={productForm.name}
              onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white font-medium text-xs outline-none focus:border-orange-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300">Price (₹) *</label>
            <input
              type="number"
              required
              min={0}
              placeholder="e.g. 45000"
              value={productForm.price}
              onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
              onWheel={(e) => e.currentTarget.blur()}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white font-medium text-xs outline-none focus:border-orange-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300">Offer Price (₹)</label>
            <input
              type="number"
              min={0}
              placeholder="e.g. 42000 (Optional discount price)"
              value={productForm.offerPrice}
              onChange={(e) => setProductForm({ ...productForm, offerPrice: e.target.value })}
              onWheel={(e) => e.currentTarget.blur()}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white font-medium text-xs outline-none focus:border-orange-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300">Stock Units *</label>
            <input
              type="number"
              required
              min={0}
              placeholder="1"
              value={productForm.stock}
              onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })}
              onWheel={(e) => e.currentTarget.blur()}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white font-medium text-xs outline-none focus:border-orange-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300">Device Age / Purchase Date</label>
            <input
              type="text"
              placeholder="e.g. 6 Months Old, Purchased Jan 2024"
              value={productForm.deviceAge}
              onChange={(e) => setProductForm({ ...productForm, deviceAge: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white font-medium text-xs outline-none focus:border-orange-500"
            />
          </div>

          <div className="col-span-2 space-y-1.5">
            <label className="text-xs font-bold text-slate-300">Included Items</label>
            <input
              type="text"
              placeholder="e.g. Original Box, Fast Charger & Cable, Invoice Bill"
              value={productForm.includedItems}
              onChange={(e) => setProductForm({ ...productForm, includedItems: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white font-medium text-xs outline-none focus:border-orange-500"
            />
          </div>

          <div className="col-span-2 space-y-1.5">
            <label className="text-xs font-bold text-slate-300">Detailed Description *</label>
            <textarea
              required
              rows={3}
              placeholder="Describe device condition, warranty status, accessories included..."
              value={productForm.description}
              onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white font-medium text-xs outline-none focus:border-orange-500"
            />
          </div>

          {/* DYNAMIC CATEGORY SPECIFICATION SECTION */}
          <div className="col-span-2 p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
            <h4 className="text-xs font-bold text-orange-400 uppercase tracking-wider">
              ⚙️ Dynamic Specifications for {productForm.category}
            </h4>

            {currentCategoryGroup === 'mobile' && (
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">RAM</label>
                  <select
                    value={productForm.ram}
                    onChange={(e) => setProductForm({ ...productForm, ram: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-slate-200 outline-none focus:border-orange-500"
                  >
                    <option value="">-- Select RAM --</option>
                    <option value="2GB">2GB</option>
                    <option value="3GB">3GB</option>
                    <option value="4GB">4GB</option>
                    <option value="6GB">6GB</option>
                    <option value="8GB">8GB</option>
                    <option value="12GB">12GB</option>
                    <option value="16GB">16GB</option>
                    <option value="24GB">24GB</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Storage</label>
                  <select
                    value={productForm.storage}
                    onChange={(e) => setProductForm({ ...productForm, storage: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-slate-200 outline-none focus:border-orange-500"
                  >
                    <option value="">-- Select Storage --</option>
                    <option value="32GB">32GB</option>
                    <option value="64GB">64GB</option>
                    <option value="128GB">128GB</option>
                    <option value="256GB">256GB</option>
                    <option value="512GB">512GB</option>
                    <option value="1TB">1TB</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Processor / Chipset</label>
                  <input
                    type="text"
                    placeholder="e.g. Apple A17 Pro / Snapdragon 8 Gen 3"
                    value={productForm.processor}
                    onChange={(e) => setProductForm({ ...productForm, processor: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-slate-200 placeholder:text-slate-600 outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Display Size</label>
                  <input
                    type="text"
                    placeholder="e.g. 6.7 inches Super Retina XDR"
                    value={productForm.displaySize}
                    onChange={(e) => setProductForm({ ...productForm, displaySize: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-slate-200 placeholder:text-slate-600 outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Battery Health</label>
                  <select
                    value={productForm.batteryHealth}
                    onChange={(e) => setProductForm({ ...productForm, batteryHealth: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-slate-200 outline-none focus:border-orange-500"
                  >
                    <option value="">-- Select Battery Health --</option>
                    <option value="100%">100%</option>
                    <option value="95% - 99%">95% - 99%</option>
                    <option value="90% - 94%">90% - 94%</option>
                    <option value="85% - 89%">85% - 89%</option>
                    <option value="80% - 84%">80% - 84%</option>
                    <option value="Below 80%">Below 80%</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Battery Percentage</label>
                  <input
                    type="text"
                    placeholder="e.g. 100% / 5000 mAh"
                    value={productForm.batteryPercentage}
                    onChange={(e) => setProductForm({ ...productForm, batteryPercentage: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-slate-200 placeholder:text-slate-600 outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">SIM Type</label>
                  <select
                    value={productForm.simType}
                    onChange={(e) => setProductForm({ ...productForm, simType: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-slate-200 outline-none focus:border-orange-500"
                  >
                    <option value="">-- Select SIM Type --</option>
                    <option value="Dual SIM (Nano-SIM)">Dual SIM (Nano-SIM)</option>
                    <option value="Single SIM">Single SIM</option>
                    <option value="eSIM + Physical SIM">eSIM + Physical SIM</option>
                    <option value="Dual eSIM">Dual eSIM</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Network (5G/4G)</label>
                  <select
                    value={productForm.network}
                    onChange={(e) => setProductForm({ ...productForm, network: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-slate-200 outline-none focus:border-orange-500"
                  >
                    <option value="">-- Select Network --</option>
                    <option value="5G">5G</option>
                    <option value="4G LTE">4G LTE</option>
                    <option value="3G / Wi-Fi">3G / Wi-Fi</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Camera</label>
                  <input
                    type="text"
                    placeholder="e.g. 48MP Triple Camera"
                    value={productForm.camera}
                    onChange={(e) => setProductForm({ ...productForm, camera: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-slate-200 placeholder:text-slate-600 outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Operating System</label>
                  <select
                    value={productForm.os}
                    onChange={(e) => setProductForm({ ...productForm, os: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-slate-200 outline-none focus:border-orange-500"
                  >
                    <option value="">-- Select OS --</option>
                    <option value="iOS 17">iOS 17</option>
                    <option value="iOS 16">iOS 16</option>
                    <option value="Android 14">Android 14</option>
                    <option value="Android 13">Android 13</option>
                    <option value="Android 12">Android 12</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">IMEI Number</label>
                  <input
                    type="text"
                    placeholder="Optional IMEI"
                    value={productForm.imeiNumber}
                    onChange={(e) => setProductForm({ ...productForm, imeiNumber: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-slate-200 placeholder:text-slate-600 outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Color</label>
                  <input
                    type="text"
                    placeholder="e.g. Natural Titanium, Space Black"
                    value={productForm.color}
                    onChange={(e) => setProductForm({ ...productForm, color: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-slate-200 placeholder:text-slate-600 outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Condition Grade</label>
                  <select
                    value={productForm.condition}
                    onChange={(e) => setProductForm({ ...productForm, condition: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-slate-200 outline-none focus:border-orange-500"
                  >
                    <option value="">-- Select Condition Grade --</option>
                    <option value="Brand New (Sealed)">Brand New (Sealed)</option>
                    <option value="Grade A+ (Like New)">Grade A+ (Like New)</option>
                    <option value="Grade A (Excellent)">Grade A (Excellent)</option>
                    <option value="Grade B (Good Used)">Grade B (Good Used)</option>
                    <option value="Open Box / Refurbished">Open Box / Refurbished</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Warranty Details</label>
                  <select
                    value={productForm.warranty}
                    onChange={(e) => setProductForm({ ...productForm, warranty: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-slate-200 outline-none focus:border-orange-500"
                  >
                    <option value="">-- Select Warranty --</option>
                    <option value="Official Brand Warranty">Official Brand Warranty</option>
                    <option value="6 Months Shop Warranty">6 Months Shop Warranty</option>
                    <option value="3 Months Shop Warranty">3 Months Shop Warranty</option>
                    <option value="1 Month Testing Warranty">1 Month Testing Warranty</option>
                    <option value="No Warranty">No Warranty</option>
                  </select>
                </div>
              </div>
            )}

            {currentCategoryGroup === 'laptop' && (
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Processor</label>
                  <input
                    type="text"
                    placeholder="e.g. Intel Core i7-13700H / Apple M3 Pro"
                    value={productForm.processor}
                    onChange={(e) => setProductForm({ ...productForm, processor: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-slate-200 placeholder:text-slate-600 outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">RAM</label>
                  <select
                    value={productForm.ram}
                    onChange={(e) => setProductForm({ ...productForm, ram: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-slate-200 outline-none focus:border-orange-500"
                  >
                    <option value="">-- Select RAM --</option>
                    <option value="8GB">8GB</option>
                    <option value="16GB">16GB</option>
                    <option value="24GB">24GB</option>
                    <option value="32GB">32GB</option>
                    <option value="64GB">64GB</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Storage Type (SSD/HDD)</label>
                  <select
                    value={productForm.storageType}
                    onChange={(e) => setProductForm({ ...productForm, storageType: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-slate-200 outline-none focus:border-orange-500"
                  >
                    <option value="">-- Select Storage Type --</option>
                    <option value="NVMe PCIe SSD">NVMe PCIe SSD</option>
                    <option value="SATA SSD">SATA SSD</option>
                    <option value="HDD">HDD</option>
                    <option value="SSD + HDD Dual">SSD + HDD Dual</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Storage Capacity</label>
                  <select
                    value={productForm.storageCapacity}
                    onChange={(e) => setProductForm({ ...productForm, storageCapacity: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-slate-200 outline-none focus:border-orange-500"
                  >
                    <option value="">-- Select Storage Capacity --</option>
                    <option value="256GB">256GB</option>
                    <option value="512GB">512GB</option>
                    <option value="1TB">1TB</option>
                    <option value="2TB">2TB</option>
                    <option value="4TB">4TB</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Graphics / GPU</label>
                  <input
                    type="text"
                    placeholder="e.g. Integrated Intel Iris Xe / RTX 4060 / Apple M3 GPU"
                    value={productForm.graphics}
                    onChange={(e) => setProductForm({ ...productForm, graphics: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-slate-200 placeholder:text-slate-600 outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Display Size</label>
                  <input
                    type="text"
                    placeholder="e.g. 15.6 inches FHD / 14 inches Liquid Retina XDR"
                    value={productForm.displaySize}
                    onChange={(e) => setProductForm({ ...productForm, displaySize: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-slate-200 placeholder:text-slate-600 outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Resolution</label>
                  <select
                    value={productForm.resolution}
                    onChange={(e) => setProductForm({ ...productForm, resolution: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-slate-200 outline-none focus:border-orange-500"
                  >
                    <option value="">-- Select Resolution --</option>
                    <option value="1920x1080 (Full HD)">1920x1080 (Full HD)</option>
                    <option value="2560x1600 (QHD+)">2560x1600 (QHD+)</option>
                    <option value="3024x1964 (MacBook Liquid Retina)">3024x1964 (MacBook Liquid Retina)</option>
                    <option value="3840x2160 (4K UHD)">3840x2160 (4K UHD)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Battery Health</label>
                  <select
                    value={productForm.batteryHealth}
                    onChange={(e) => setProductForm({ ...productForm, batteryHealth: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-slate-200 outline-none focus:border-orange-500"
                  >
                    <option value="">-- Select Battery Health --</option>
                    <option value="100%">100%</option>
                    <option value="95% - 99%">95% - 99%</option>
                    <option value="90% - 94%">90% - 94%</option>
                    <option value="85% - 89%">85% - 89%</option>
                    <option value="80% - 84%">80% - 84%</option>
                    <option value="Normal / Good Backup">Normal / Good Backup</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Battery Backup</label>
                  <input
                    type="text"
                    placeholder="e.g. 6-8 Hours Backup"
                    value={productForm.batteryBackup}
                    onChange={(e) => setProductForm({ ...productForm, batteryBackup: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-slate-200 placeholder:text-slate-600 outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Operating System</label>
                  <select
                    value={productForm.os}
                    onChange={(e) => setProductForm({ ...productForm, os: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-slate-200 outline-none focus:border-orange-500"
                  >
                    <option value="">-- Select OS --</option>
                    <option value="macOS Sonoma">macOS Sonoma</option>
                    <option value="macOS Ventura">macOS Ventura</option>
                    <option value="Windows 11 Home">Windows 11 Home</option>
                    <option value="Windows 11 Pro">Windows 11 Pro</option>
                    <option value="Windows 10">Windows 10</option>
                    <option value="ChromeOS">ChromeOS</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Keyboard Layout</label>
                  <select
                    value={productForm.keyboardLayout}
                    onChange={(e) => setProductForm({ ...productForm, keyboardLayout: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-slate-200 outline-none focus:border-orange-500"
                  >
                    <option value="">-- Select Keyboard Layout --</option>
                    <option value="US English Backlit QWERTY">US English Backlit QWERTY</option>
                    <option value="US English QWERTY">US English QWERTY</option>
                    <option value="UK English">UK English</option>
                    <option value="Arabic / English Dual">Arabic / English Dual</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Serial Number</label>
                  <input
                    type="text"
                    placeholder="Optional Serial Number"
                    value={productForm.serialNumber}
                    onChange={(e) => setProductForm({ ...productForm, serialNumber: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-slate-200 placeholder:text-slate-600 outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Color</label>
                  <input
                    type="text"
                    placeholder="e.g. Space Gray, Silver, Midnight"
                    value={productForm.color}
                    onChange={(e) => setProductForm({ ...productForm, color: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-slate-200 placeholder:text-slate-600 outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Condition Grade</label>
                  <select
                    value={productForm.condition}
                    onChange={(e) => setProductForm({ ...productForm, condition: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-slate-200 outline-none focus:border-orange-500"
                  >
                    <option value="">-- Select Condition Grade --</option>
                    <option value="Brand New (Sealed)">Brand New (Sealed)</option>
                    <option value="Grade A+ (Like New)">Grade A+ (Like New)</option>
                    <option value="Grade A (Excellent)">Grade A (Excellent)</option>
                    <option value="Grade B (Good Used)">Grade B (Good Used)</option>
                    <option value="Open Box / Refurbished">Open Box / Refurbished</option>
                  </select>
                </div>
              </div>
            )}

            {currentCategoryGroup === 'tablet' && (
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">RAM</label>
                  <select
                    value={productForm.ram}
                    onChange={(e) => setProductForm({ ...productForm, ram: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-slate-200 outline-none focus:border-orange-500"
                  >
                    <option value="">-- Select RAM --</option>
                    <option value="3GB">3GB</option>
                    <option value="4GB">4GB</option>
                    <option value="6GB">6GB</option>
                    <option value="8GB">8GB</option>
                    <option value="16GB">16GB</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Storage</label>
                  <select
                    value={productForm.storage}
                    onChange={(e) => setProductForm({ ...productForm, storage: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-slate-200 outline-none focus:border-orange-500"
                  >
                    <option value="">-- Select Storage --</option>
                    <option value="64GB">64GB</option>
                    <option value="128GB">128GB</option>
                    <option value="256GB">256GB</option>
                    <option value="512GB">512GB</option>
                    <option value="1TB">1TB</option>
                    <option value="2TB">2TB</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Processor</label>
                  <input
                    type="text"
                    placeholder="e.g. Apple M2 / Apple A14 / Snapdragon 8 Gen 2"
                    value={productForm.processor}
                    onChange={(e) => setProductForm({ ...productForm, processor: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-slate-200 placeholder:text-slate-600 outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Display Size</label>
                  <input
                    type="text"
                    placeholder="e.g. 10.9 inches Liquid Retina"
                    value={productForm.displaySize}
                    onChange={(e) => setProductForm({ ...productForm, displaySize: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-slate-200 placeholder:text-slate-600 outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">SIM / Wi-Fi</label>
                  <select
                    value={productForm.simWifi}
                    onChange={(e) => setProductForm({ ...productForm, simWifi: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-slate-200 outline-none focus:border-orange-500"
                  >
                    <option value="">-- Select Connectivity --</option>
                    <option value="Wi-Fi Only">Wi-Fi Only</option>
                    <option value="Wi-Fi + Cellular (5G)">Wi-Fi + Cellular (5G)</option>
                    <option value="Wi-Fi + Cellular (4G LTE)">Wi-Fi + Cellular (4G LTE)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Battery Health</label>
                  <select
                    value={productForm.batteryHealth}
                    onChange={(e) => setProductForm({ ...productForm, batteryHealth: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-slate-200 outline-none focus:border-orange-500"
                  >
                    <option value="">-- Select Battery Health --</option>
                    <option value="100%">100%</option>
                    <option value="95% - 99%">95% - 99%</option>
                    <option value="90% - 94%">90% - 94%</option>
                    <option value="85% - 89%">85% - 89%</option>
                    <option value="Normal / Good Backup">Normal / Good Backup</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Operating System</label>
                  <select
                    value={productForm.os}
                    onChange={(e) => setProductForm({ ...productForm, os: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-slate-200 outline-none focus:border-orange-500"
                  >
                    <option value="">-- Select OS --</option>
                    <option value="iPadOS 17">iPadOS 17</option>
                    <option value="iPadOS 16">iPadOS 16</option>
                    <option value="Android 14 Tablet OS">Android 14 Tablet OS</option>
                    <option value="Android 13">Android 13</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Camera</label>
                  <input
                    type="text"
                    placeholder="e.g. 12MP Wide Rear / 12MP Ultra Wide Front"
                    value={productForm.camera}
                    onChange={(e) => setProductForm({ ...productForm, camera: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-slate-200 placeholder:text-slate-600 outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Color</label>
                  <input
                    type="text"
                    placeholder="e.g. Space Gray, Starlight, Silver, Pink"
                    value={productForm.color}
                    onChange={(e) => setProductForm({ ...productForm, color: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-slate-200 placeholder:text-slate-600 outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">IMEI / Serial Number</label>
                  <input
                    type="text"
                    placeholder="Optional IMEI or Serial Number"
                    value={productForm.imeiSerial}
                    onChange={(e) => setProductForm({ ...productForm, imeiSerial: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-slate-200 placeholder:text-slate-600 outline-none focus:border-orange-500"
                  />
                </div>
              </div>
            )}

            {currentCategoryGroup === 'accessory' && (
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Product Type</label>
                  <select
                    value={productForm.productType}
                    onChange={(e) => setProductForm({ ...productForm, productType: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-slate-200 outline-none focus:border-orange-500"
                  >
                    <option value="">-- Select Product Type --</option>
                    <option value="Smartwatch">Smartwatch</option>
                    <option value="Wireless Earbuds / TWS">Wireless Earbuds / TWS</option>
                    <option value="Over-Ear Headphones">Over-Ear Headphones</option>
                    <option value="Bluetooth Speaker">Bluetooth Speaker</option>
                    <option value="Charger & Power Adapter">Charger & Power Adapter</option>
                    <option value="Power Bank">Power Bank</option>
                    <option value="Stylus / Apple Pencil">Stylus / Apple Pencil</option>
                    <option value="Case & Protection">Case & Protection</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Brand</label>
                  {brands.length > 0 ? (
                    <select
                      value={productForm.brand}
                      onChange={(e) => setProductForm({ ...productForm, brand: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-slate-200 outline-none focus:border-orange-500"
                    >
                      <option value="">-- Select Brand --</option>
                      {brands.map((b) => (
                        <option key={b.id} value={b.name}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      placeholder="e.g. Apple, Sony, Bose, Anker"
                      value={productForm.brand}
                      onChange={(e) => setProductForm({ ...productForm, brand: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-slate-200 placeholder:text-slate-600 outline-none focus:border-orange-500"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Model</label>
                  <input
                    type="text"
                    placeholder="e.g. Apple Watch Ultra 2 / AirPods Pro 2"
                    value={productForm.model}
                    onChange={(e) => setProductForm({ ...productForm, model: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-slate-200 placeholder:text-slate-600 outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Compatibility</label>
                  <select
                    value={productForm.compatibility}
                    onChange={(e) => setProductForm({ ...productForm, compatibility: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-slate-200 outline-none focus:border-orange-500"
                  >
                    <option value="">-- Select Compatibility --</option>
                    <option value="Universal (iOS & Android)">Universal (iOS & Android)</option>
                    <option value="Apple iOS / WatchOS Only">Apple iOS / WatchOS Only</option>
                    <option value="Android Only">Android Only</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Condition Grade</label>
                  <select
                    value={productForm.condition}
                    onChange={(e) => setProductForm({ ...productForm, condition: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-slate-200 outline-none focus:border-orange-500"
                  >
                    <option value="">-- Select Condition Grade --</option>
                    <option value="Brand New (Sealed)">Brand New (Sealed)</option>
                    <option value="Open Box">Open Box</option>
                    <option value="Grade A+ (Like New)">Grade A+ (Like New)</option>
                    <option value="Grade A (Excellent)">Grade A (Excellent)</option>
                    <option value="Grade B (Used)">Grade B (Used)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Warranty Details</label>
                  <select
                    value={productForm.warranty}
                    onChange={(e) => setProductForm({ ...productForm, warranty: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-slate-200 outline-none focus:border-orange-500"
                  >
                    <option value="">-- Select Warranty --</option>
                    <option value="Official Brand Warranty">Official Brand Warranty</option>
                    <option value="6 Months Shop Warranty">6 Months Shop Warranty</option>
                    <option value="3 Months Shop Warranty">3 Months Shop Warranty</option>
                    <option value="1 Month Testing Warranty">1 Month Testing Warranty</option>
                    <option value="No Warranty">No Warranty</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-slate-400 font-semibold mb-1">Technical Specifications</label>
                  <input type="text" value={productForm.technicalSpecifications} onChange={(e) => setProductForm({ ...productForm, technicalSpecifications: e.target.value })} className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-slate-200" />
                </div>
              </div>
            )}
          </div>

          <div className="col-span-2 flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-700 text-slate-300 font-bold text-xs hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isLoading}
              className="px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shadow-lg shadow-orange-600/30 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting || isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Product...</span>
                </>
              ) : (
                <span>{productToEdit ? 'Save Product Updates' : 'Create Product for Dealer'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
