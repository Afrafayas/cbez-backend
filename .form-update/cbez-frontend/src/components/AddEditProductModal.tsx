import { SearchableSelect } from './SearchableSelect';
import { AdditionalSpecifications } from './AdditionalSpecifications';
import { formSpecifications, formOptions, fieldAliases, representedFields, fieldVisible, editableSpecifications } from '../utils/productFormOptions';
import React, { useState, useEffect, FormEvent } from 'react';
import { X, Loader2, Phone, MessageCircle, Mail } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../store';
import { setShowAddEditModal, addProduct, editProduct } from '../store/productsSlice';
import { setShowAuthModal, setAuthRole, setAuthTab } from '../store/authSlice';
import { Product } from '../types';
import { CATEGORIES } from '../data/mockData';
import { createSellerProduct, updateSellerProduct, getBrands, getCategories, getPlatformSettings, PlatformSettings, formatPhoneNumber, getWhatsAppNumber, getTelLink } from '../services/apiService';
import { CompactBrandSelect } from './CompactBrandSelect';
import { getAuthToken, getAuthRole } from '../utils/authStorage';
import './AddEditProductModal.css';

interface AddEditProductModalProps {
  onToast: (msg: string, type?: 'success' | 'info') => void;
  onProductSaved?: (product?: Product, isEdit?: boolean) => void;
}

export const AddEditProductModal: React.FC<AddEditProductModalProps> = ({ onToast, onProductSaved }) => {
  const dispatch = useAppDispatch();
  const { showAddEditModal, productToEdit, items: products, subscriptionPlans, categories: storeCategories, shops } = useAppSelector(state => state.products);
  const { activeShop, authRole } = useAppSelector(state => state.auth);

  const [formImages, setFormImages] = useState<string[]>(['', '', '', '']);
  const [dbBrands, setDbBrands] = useState<string[]>([]);
  const [dbCategories, setDbCategories] = useState<string[]>([]);
  const [categoryDefinitions, setCategoryDefinitions] = useState<{ name: string; specConfig?: unknown }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Platform settings for admin support contact
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings>(() => {
    try {
      const cached = sessionStorage.getItem('mlx_platform_settings');
      if (cached) return JSON.parse(cached);
    } catch {}
    return {};
  });

  useEffect(() => {
    getPlatformSettings().then(data => {
      if (data && (data.phone || data.supportPhone || data.email || data.supportEmail)) {
        setPlatformSettings(data);
        try {
          sessionStorage.setItem('mlx_platform_settings', JSON.stringify(data));
        } catch {}
      }
    }).catch(() => {});
  }, []);

  const rawAdminPhone = platformSettings.supportPhone || platformSettings.phone || '';
  const adminDisplayPhone = formatPhoneNumber(rawAdminPhone);
  const adminPhone = adminDisplayPhone;
  const adminEmail = platformSettings.supportEmail || platformSettings.email || '';
  const adminTelLink = getTelLink(rawAdminPhone);
  const adminWaPhone = getWhatsAppNumber(rawAdminPhone);

  useEffect(() => {
    async function fetchDbData() {
      try {
        const [fetchedBrands, fetchedCats] = await Promise.all([
          getBrands().catch(() => []),
          getCategories().catch(() => [])
        ]);
        if (fetchedBrands && Array.isArray(fetchedBrands) && fetchedBrands.length > 0) {
          setDbBrands(fetchedBrands.map(b => b.name));
        }
        if (fetchedCats && Array.isArray(fetchedCats) && fetchedCats.length > 0) {
          setDbCategories(fetchedCats.map(c => c.name));
          setCategoryDefinitions(fetchedCats);
        }
      } catch (err) {
        console.warn('Failed to load DB brands/categories in modal:', err);
      }
    }
    fetchDbData();
  }, []);

  const availableCategoriesList = Array.from(
    new Set([
      ...CATEGORIES.filter(c => c !== "All Categories"),
      ...(storeCategories || []).map(c => c.name),
      ...dbCategories
    ])
  ).filter(Boolean).sort();

  const availableBrandsList = Array.from(
    new Set([
      'Apple', 'Samsung', 'OnePlus', 'Google', 'Xiaomi', 'Realme', 'Vivo', 'Oppo', 'Motorola', 'Asus', 'Lenovo', 'HP', 'Dell', 'Acer', 'Sony', 'Nothing', 'Noise', 'Boat', 'Anker',
      ...dbBrands
    ])
  ).filter(Boolean).sort();

  const assignedPlan = subscriptionPlans.find(
    p => p.id === activeShop?.subscriptionPlanId || p.id === activeShop?.subscription?.planId
  ) || activeShop?.subscription?.plan;

  const currentPlan = assignedPlan || {
    id: 'plan-free',
    name: 'Free Plan',
    description: 'Basic Starter Plan',
    productLimit: 10,
    price: 0,
    status: 'ACTIVE' as const
  };

  const shopProductsCount = activeShop?.subscriptionUsage?.currentProducts ?? (activeShop ? products.filter(p => p.shopId === activeShop.id).length : 0);
  const remainingSlots = Math.max(0, (currentPlan.productLimit ?? 10) - shopProductsCount);
  const isLimitReached = shopProductsCount >= (currentPlan.productLimit ?? 10);
  const isShopPending = Boolean(activeShop && (!activeShop.verified || activeShop.status === 'PENDING'));

  const [productForm, setProductForm] = useState({
    name: '',
    brand: 'Apple',
    category: 'Smartphones & Mobiles',
    description: '',
    price: '',
    offerPrice: '',
    stock: '1',

    // Mobile / Tablet / Common specs
    ram: '',
    storage: '',
    processor: '',
    displaySize: '',
    batteryHealth: '',
    batteryCapacity: '',
    simType: 'Dual SIM (Nano + eSIM)',
    network: '5G Network Supported',
    camera: '',
    frontCamera: '',
    rearCamera: '',
    os: '',
    imeiNumber: '',
    color: '',
    condition: 'Grade A (Like New)',
    warranty: '',
    deviceAge: '',
    documents: [] as string[],
    accessories: [] as string[],
    originalBill: true,
    purchasedFromAmazon: false,
    isAmazonRefurbished: false,

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
      lower.includes('audio') ||
      lower.includes('earbud') ||
      lower.includes('headphone') ||
      lower.includes('camera') ||
      lower.includes('photo') ||
      lower.includes('gaming') ||
      lower.includes('console') ||
      lower.includes('gear') ||
      lower.includes('wearable')
    ) {
      return 'accessory';
    }
    return 'mobile';
  };

  const currentCategoryGroup = getCategoryGroup(productForm.category);
  const isAppleMobile = currentCategoryGroup === 'mobile' && productForm.brand.trim().toLowerCase() === 'apple';
  const specificationFields = formSpecifications(productForm.category, categoryDefinitions.find(category => category.name === productForm.category)?.specConfig);
  const [additionalSpecs, setAdditionalSpecs] = useState<Record<string, string>>({});
  useEffect(() => { setAdditionalSpecs({ ...(productToEdit?.specs || {}) }); }, [productToEdit, showAddEditModal]);
  const optionsFor = (key: string) => key === 'brand' ? availableBrandsList : formOptions(key, specificationFields);


  useEffect(() => {
    if (productToEdit) {
      const sp = editableSpecifications(productToEdit.specs || {});
      const cond = (productToEdit as any).conditionInfo || {};
      const rawAge =
        productToEdit.deviceAge ||
        sp['Device Age'] ||
        sp['deviceAge'] ||
        sp['Device Age / Purchase Date'] ||
        sp['Purchase Date'] ||
        sp['Age'] ||
        sp['Usage Duration'] ||
        sp['device_age'] ||
        cond.usageDuration ||
        (cond.purchaseYear ? `Purchased in ${cond.purchaseYear}` : '') ||
        '';

      setProductForm({
        name: productToEdit.name || '',
        brand: productToEdit.brand || 'Apple',
        category: productToEdit.category || 'Smartphones & Mobiles',
        description: productToEdit.description || '',
        price: productToEdit.price ? String(productToEdit.price) : '',
        offerPrice: productToEdit.offerPrice !== undefined && productToEdit.offerPrice !== null
          ? String(productToEdit.offerPrice)
          : (sp['offerPrice'] ? String(sp['offerPrice']) : (sp['Offer Price'] ? String(sp['Offer Price']) : '')),
        stock: productToEdit.stock !== undefined ? String(productToEdit.stock) : '1',

        // Mobile / Tablet specs
        ram: sp['RAM'] || productToEdit.ram || '',
        storage: sp['Storage'] || productToEdit.storage || '',
        processor: sp['Processor / Chipset'] || sp['Processor'] || productToEdit.processor || '',
        displaySize: sp['Display Size'] || sp['Display size'] || productToEdit.displaySize || '',
        batteryHealth: sp['Battery Health'] || productToEdit.batteryHealth || cond.batteryHealth || '',
        batteryCapacity: sp['Battery Capacity'] || sp['batteryCapacity'] || '',
        simType: sp['SIM Type'] || sp['SIM type'] || productToEdit.simType || 'Dual SIM (Nano + eSIM)',
        network: sp['Network (5G/4G)'] || sp['5G / 4G'] || productToEdit.network || '5G Network Supported',
        camera: sp['Camera'] || productToEdit.camera || '',
        frontCamera: sp['Front Camera'] || sp['frontCamera'] || '',
        rearCamera: sp['Rear Camera'] || sp['rearCamera'] || '',
        os: sp['Operating System'] || sp['OS'] || productToEdit.os || '',
        imeiNumber: sp['IMEI'] || productToEdit.imeiNumber || '',
        color: sp['Color'] || productToEdit.color || '',
        condition: sp['Condition'] || productToEdit.condition || cond.condition || 'Grade A (Like New)',
        warranty: sp['Warranty'] || productToEdit.warranty || cond.warrantyStatus || '',

        deviceAge: rawAge,
        documents: productToEdit.documents || (productToEdit.accessories || []),
        accessories: productToEdit.accessories || [],
        originalBill: productToEdit.originalBill !== undefined ? productToEdit.originalBill : true,
        purchasedFromAmazon: productToEdit.purchasedFromAmazon || false,
        isAmazonRefurbished: productToEdit.isAmazonRefurbished || false,

        // Laptop specs
        storageType: sp['Storage Type'] || sp['Storage type – SSD/HDD'] || productToEdit.storageType || '',
        storageCapacity: sp['Storage Capacity'] || productToEdit.storageCapacity || '',
        graphics: sp['Graphics / GPU'] || sp['Graphics/GPU'] || productToEdit.graphics || '',
        resolution: sp['Resolution'] || productToEdit.resolution || '',
        batteryBackup: sp['Battery Backup'] || sp['Battery backup'] || productToEdit.batteryBackup || '',
        keyboardLayout: sp['Keyboard Layout'] || sp['Keyboard layout'] || productToEdit.keyboardLayout || '',
        serialNumber: sp['Serial Number'] || sp['Serial number'] || productToEdit.serialNumber || '',

        // Tablet specs
        simWifi: sp['SIM / Wi-Fi'] || productToEdit.simWifi || '',
        imeiSerial: sp['IMEI / Serial Number'] || productToEdit.imeiSerial || '',

        // Accessories & Smart Watches specs
        productType: sp['Product Type'] || sp['Product type'] || productToEdit.productType || '',
        model: sp['Model'] || productToEdit.model || '',
        compatibility: sp['Compatibility'] || productToEdit.compatibility || '',
        includedItems: sp['Included Items'] || sp['Included items'] || productToEdit.includedItems || '',
        technicalSpecifications: sp['Technical Specifications'] || sp['Technical specifications'] || productToEdit.technicalSpecifications || ''
      });

      if (productToEdit.images && productToEdit.images.length > 0) {
        const padded = [...productToEdit.images];
        while (padded.length < 4) padded.push('');
        setFormImages(padded);
      } else {
        setFormImages(['', '', '', '']);
      }
    } else {
      setFormImages(['', '', '', '']);
      setProductForm({
        name: '',
        brand: 'Apple',
        category: 'Smartphones & Mobiles',
        description: '',
        price: '',
        offerPrice: '',
        stock: '1',

        ram: '',
        storage: '',
        processor: '',
        displaySize: '',
        batteryHealth: '',
        batteryCapacity: '',
        simType: 'Dual SIM (Nano + eSIM)',
        network: '5G Network Supported',
        camera: '',
        frontCamera: '',
        rearCamera: '',
        os: '',
        imeiNumber: '',
        color: '',
        condition: 'Grade A (Like New)',
        warranty: '',
        deviceAge: '',
        documents: [] as string[],
        accessories: [] as string[],
        originalBill: true,
        purchasedFromAmazon: false,
        isAmazonRefurbished: false,

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
        includedItems: '',
        technicalSpecifications: ''
      });
    }
  }, [productToEdit, showAddEditModal]);

  useEffect(() => {
    if (showAddEditModal && activeShop && !activeShop.verified && !productToEdit) {
      dispatch(setShowAddEditModal(false));
      onToast('⚠️ Verification Pending: Your shop registration is currently pending Admin approval. You can add products after Admin verifies your shop.', 'info');
    }
  }, [showAddEditModal, activeShop, productToEdit, dispatch, onToast]);

  if (!showAddEditModal) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const currentRole = getAuthRole() || authRole;
    const isAdmin = currentRole === 'admin';

    // Shop Approval Check (sellers only)
    if (!isAdmin && activeShop && !activeShop.verified) {
      onToast('Your shop registration is currently PENDING Admin approval. Only approved shops can add products.', 'info');
      return;
    }

    // Subscription Plan Check (sellers only)
    if (!isAdmin && !productToEdit && !currentPlan) {
      onToast('Please select a subscription plan before adding products.', 'info');
      return;
    }

    // Product Limit Check (sellers only)
    if (!isAdmin && !productToEdit && currentPlan) {
      const productLimit = currentPlan.productLimit;
      if (shopProductsCount >= productLimit) {
        onToast(
          `Product limit reached! Your ${currentPlan.name} allows a maximum of ${productLimit} products. (Current: ${shopProductsCount}/${productLimit}). Please upgrade your subscription plan to list more products.`,
          'info'
        );
        return;
      }
    }

    const validImgs = formImages.map(img => (img ? img.trim() : '')).filter(Boolean);

    if (validImgs.length < 4) {
      onToast('Please upload at least 4 photo angles (Front, Back, Left Side, and Right Side photos are required)', 'info');
      return;
    }

    const priceNum = Number(productForm.price);
    if (isNaN(priceNum) || priceNum < 0) {
      onToast('Regular Price must be a valid number and cannot be negative.', 'info');
      return;
    }

    let parsedOfferPrice: number | undefined = undefined;
    if (productForm.offerPrice && productForm.offerPrice.trim() !== '') {
      const offerNum = Number(productForm.offerPrice);
      if (isNaN(offerNum) || offerNum < 0) {
        onToast('Discount Offer Price must be a valid non-negative number.', 'info');
        return;
      }
      if (offerNum > priceNum) {
        onToast('Discount Offer Price cannot be higher than Regular Price.', 'info');
        return;
      }
      parsedOfferPrice = offerNum;
    }

    const stockNum = Number(productForm.stock);
    if (isNaN(stockNum) || stockNum < 0) {
      onToast('Stock quantity cannot be less than 0.', 'info');
      return;
    }

    const shopId = activeShop ? activeShop.id : (shops[0]?.id || 'shop-101');

    // Construct category specific specs object
    let categorySpecs: Record<string, string> = {};

    if (currentCategoryGroup === 'mobile') {
      categorySpecs = {
        'RAM': productForm.ram,
        'Storage': productForm.storage,
        'Processor / Chipset': productForm.processor,
        'Display Size': productForm.displaySize,
        'Battery Health': productForm.batteryHealth,
        'Battery Capacity': productForm.batteryCapacity,
        'SIM Type': productForm.simType,
        'Network (5G/4G)': productForm.network,
        'Front Camera': productForm.frontCamera,
        'Rear Camera': productForm.rearCamera,
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

    if (parsedOfferPrice !== undefined) {
      categorySpecs['offerPrice'] = String(parsedOfferPrice);
      categorySpecs['Offer Price'] = String(parsedOfferPrice);
    }

    if (productForm.deviceAge && productForm.deviceAge.trim()) {
      const trimmedAge = productForm.deviceAge.trim();
      categorySpecs['Device Age'] = trimmedAge;
      categorySpecs['deviceAge'] = trimmedAge;
      categorySpecs['Device Age / Purchase Date'] = trimmedAge;
    }


    const mergedSpecs: Record<string, string> = { ...(productToEdit?.specs || {}), ...categorySpecs };
    if (currentCategoryGroup === 'mobile' && !isAppleMobile) {
      if (productToEdit?.specs?.['Battery Health'] === undefined) delete mergedSpecs['Battery Health'];
      else mergedSpecs['Battery Health'] = productToEdit.specs['Battery Health'];
    }
    for (const field of specificationFields) {
      if (!fieldVisible(field, productForm.brand)) continue;
      const formKey = Object.keys(fieldAliases).find(key => fieldAliases[key] === field.key && (key !== 'storageCapacity' || currentCategoryGroup === 'laptop')) || field.key;
      const extra = !representedFields(currentCategoryGroup).includes(field.key);
      const value = extra ? (additionalSpecs[field.key] ?? additionalSpecs[field.label]) : (productForm as unknown as Record<string, string>)[formKey];
      if (value !== undefined) { mergedSpecs[field.key] = value; mergedSpecs[field.label] = value; }
    }
    categorySpecs = mergedSpecs;
    const productPayload: Product = {
      id: productToEdit ? productToEdit.id : `prod-${Date.now()}`,
      name: productForm.name,
      brand: productForm.brand,
      category: productForm.category,
      description: productForm.description,
      price: Math.max(0, priceNum),
      offerPrice: parsedOfferPrice,
      stock: Math.max(0, stockNum),
      shopId,
      storage: productForm.storage,
      ram: productForm.ram,
      batteryHealth: productForm.batteryHealth,
      condition: productForm.condition,
      warranty: productForm.warranty,
      color: productForm.color,
      simType: productForm.simType,
      network: productForm.network,
      originalBill: productForm.originalBill,
      deviceAge: productForm.deviceAge,
      imeiNumber: productForm.imeiNumber,
      documents: productForm.documents,
      accessories: productForm.accessories,
      purchasedFromAmazon: productForm.purchasedFromAmazon,
      isAmazonRefurbished: productForm.isAmazonRefurbished,
      isSoldOut: Number(productForm.stock) <= 0,
      images: validImgs,

      // Category specs mapping
      processor: productForm.processor,
      displaySize: productForm.displaySize,
      batteryCapacity: productForm.batteryCapacity,
      camera: productForm.camera,
      frontCamera: productForm.frontCamera,
      rearCamera: productForm.rearCamera,
      os: productForm.os,
      simWifi: productForm.simWifi,
      imeiSerial: productForm.imeiSerial,
      storageType: productForm.storageType,
      storageCapacity: productForm.storageCapacity,
      graphics: productForm.graphics,
      resolution: productForm.resolution,
      batteryBackup: productForm.batteryBackup,
      keyboardLayout: productForm.keyboardLayout,
      serialNumber: productForm.serialNumber,
      productType: productForm.productType,
      model: productForm.model,
      compatibility: productForm.compatibility,
      includedItems: productForm.includedItems,
      technicalSpecifications: productForm.technicalSpecifications,

      specs: categorySpecs
    };

    const token = getAuthToken();
    if (!token) {
      onToast('Authentication required. Please sign in to your seller account to list or edit products.', 'info');
      dispatch(setShowAddEditModal(false));
      dispatch(setAuthRole('seller'));
      dispatch(setAuthTab('login'));
      dispatch(setShowAuthModal(true));
      return;
    }

    if (productToEdit) {
      setIsSubmitting(true);
      updateSellerProduct(productToEdit.id, {
        name: productPayload.name,
        brand: productPayload.brand,
        category: productPayload.category,
        description: productPayload.description,
        price: productPayload.price,
        stock: productPayload.stock,
        specs: productPayload.specs,
        images: productPayload.images
      }, token)
        .then((updatedRes) => {
          const savedProd = updatedRes.data?.product || updatedRes.product || updatedRes.data || updatedRes;
          const realId = (savedProd && typeof savedProd === 'object' && savedProd.id && String(savedProd.id).trim() !== '') ? savedProd.id : productPayload.id;
          const finalProduct: Product = {
            ...productPayload,
            ...(typeof savedProd === 'object' ? savedProd : {}),
            deviceAge: productPayload.deviceAge || (savedProd as any)?.deviceAge,
            specs: {
              ...(productPayload.specs || {}),
              ...((savedProd && typeof savedProd === 'object' && savedProd.specs) ? savedProd.specs : {})
            },
            offerPrice: productPayload.offerPrice,
            id: realId,
            shopId: activeShop?.id || productPayload.shopId,
            shop: activeShop || productPayload.shop,
            stock: productPayload.stock,
            images: (savedProd && Array.isArray(savedProd.images) && savedProd.images.length > 0) ? savedProd.images : productPayload.images
          };
          dispatch(editProduct(finalProduct));
          onToast(`Product "${finalProduct.name}" updated successfully!`, 'success');
          onProductSaved?.(finalProduct, true);
          dispatch(setShowAddEditModal(false));
        })
        .catch((err: any) => {
          console.error('Backend update seller product error:', err);
          const errMsg = err?.message || 'Failed to update product in database';
          onToast(`Update failed: ${errMsg}`, 'info');
        })
        .finally(() => {
          setIsSubmitting(false);
        });
    } else {
      setIsSubmitting(true);
      createSellerProduct({
        name: productPayload.name,
        brand: productPayload.brand,
        category: productPayload.category,
        description: productPayload.description,
        price: productPayload.price,
        stock: productPayload.stock,
        specs: productPayload.specs,
        images: productPayload.images,
        shopId: productPayload.shopId || activeShop?.id || (shops[0]?.id || 'shop-101'),
      }, token)
        .then((savedRes) => {
          const savedProd = savedRes.data?.product || savedRes.product || savedRes.data || savedRes;
          const realId = (savedProd && typeof savedProd === 'object' && savedProd.id && String(savedProd.id).trim() !== '') ? savedProd.id : productPayload.id;
          const finalProduct: Product = {
            ...productPayload,
            ...(typeof savedProd === 'object' ? savedProd : {}),
            deviceAge: productPayload.deviceAge || (savedProd as any)?.deviceAge,
            specs: {
              ...(productPayload.specs || {}),
              ...((savedProd && typeof savedProd === 'object' && savedProd.specs) ? savedProd.specs : {})
            },
            offerPrice: productPayload.offerPrice,
            id: realId,
            shopId: activeShop?.id || productPayload.shopId,
            shop: activeShop || productPayload.shop,
            stock: productPayload.stock,
            images: (savedProd && Array.isArray(savedProd.images) && savedProd.images.length > 0) ? savedProd.images : productPayload.images
          };
          dispatch(addProduct(finalProduct));
          onToast(`New product "${finalProduct.name}" listed live!`, 'success');
          onProductSaved?.(finalProduct, false);
          dispatch(setShowAddEditModal(false));
        })
        .catch((err: any) => {
          console.error('Backend create seller product error:', err);
          const errMsg = err?.message || 'Failed to create product listing in database';
          onToast(`Save failed: ${errMsg}`, 'info');
        })
        .finally(() => {
          setIsSubmitting(false);
        });
    }
  };

  if (!showAddEditModal) return null;

  return (
    <div className="modal-overlay" onClick={() => dispatch(setShowAddEditModal(false))}>
      <div
        className="modal-content product-editor-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '860px',
          width: '92%',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '2.25rem 2.5rem',
          boxSizing: 'border-box',
          borderRadius: '16px',
          background: '#ffffff',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          position: 'relative'
        }}
      >
        <button
          className="modal-close-btn"
          onClick={() => dispatch(setShowAddEditModal(false))}
          style={{ top: '1.25rem', right: '1.25rem' }}
        >
          <X size={18} />
        </button>

        <div className="modal-header" style={{ marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid #e2e8f0' }}>
          <h2 className="modal-title" style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: 0, paddingRight: '2rem' }}>
            {productToEdit ? 'Edit Product Listing' : 'List New Used Gadget'}
          </h2>
          <span style={{ fontSize: '0.84rem', color: '#64748b', marginTop: '0.25rem', display: 'block' }}>
            Store Partner Listing Portal &bull; Dynamic Category Specifications &amp; Multi-Angle Photos
          </span>

          {/* Subscription Usage Header Banner (Hidden if pending) */}
          {activeShop && (
            isShopPending ? (
              <div
                style={{
                  marginTop: '0.85rem',
                  padding: '0.85rem 1rem',
                  borderRadius: '12px',
                  fontSize: '0.82rem',
                  background: '#fff7ed',
                  border: '1.5px solid #fed7aa',
                  borderLeft: '4px solid #ea580c',
                  color: '#9a3412',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.6rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <span style={{ fontSize: '1.1rem' }}>⏳</span>
                    <strong style={{ fontSize: '0.88rem', color: '#9a3412' }}>
                      Shop Verification Pending Admin Approval
                    </strong>
                  </div>
                  <span style={{ fontSize: '0.72rem', background: '#ea580c', color: '#ffffff', padding: '0.2rem 0.6rem', borderRadius: '12px', fontWeight: 800 }}>
                    PENDING
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '0.78rem', color: '#c2410c', lineHeight: '1.4' }}>
                  Your shop is currently pending admin approval. Product creation is locked. Contact Admin to activate your shop:
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                  <a
                    href={`tel:${adminTelLink}`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.35rem 0.75rem',
                      borderRadius: '8px',
                      background: '#2563eb',
                      color: '#ffffff',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      textDecoration: 'none'
                    }}
                    title={`Call Admin at ${adminPhone}`}
                  >
                    <Phone size={13} />
                    <span>Call: {adminPhone}</span>
                  </a>
                  <a
                    href={`https://wa.me/${adminWaPhone}?text=${encodeURIComponent('Hello MLX Admin, my shop "' + (activeShop?.name || 'My Shop') + '" is pending verification. Please review and approve.')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.35rem 0.75rem',
                      borderRadius: '8px',
                      background: '#16a34a',
                      color: '#ffffff',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      textDecoration: 'none'
                    }}
                    title={`WhatsApp Admin at ${adminPhone}`}
                  >
                    <MessageCircle size={13} />
                    <span>WhatsApp Admin</span>
                  </a>
                  <a
                    href={`mailto:${adminEmail}?subject=${encodeURIComponent('Shop Verification Request - ' + (activeShop?.name || 'My Shop'))}&body=${encodeURIComponent('Hello MLX Admin,\n\nMy shop "' + (activeShop?.name || 'My Shop') + '" (' + (activeShop?.phone || '') + ') is pending verification. Please review and approve.\n\nThank you.')}`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.35rem 0.75rem',
                      borderRadius: '8px',
                      background: '#ea580c',
                      color: '#ffffff',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      textDecoration: 'none'
                    }}
                    title={`Email Admin at ${adminEmail}`}
                  >
                    <Mail size={13} />
                    <span>Email: {adminEmail}</span>
                  </a>
                </div>
              </div>
            ) : (
              <div
                style={{
                  marginTop: '0.85rem',
                  padding: '0.75rem 1rem',
                  borderRadius: '10px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                  background: isLimitReached ? '#fff1f2' : '#f0fdf4',
                  color: isLimitReached ? '#be123c' : '#166534',
                  border: isLimitReached ? '1px solid #fecdd3' : '1px solid #bbf7d0'
                }}
              >
                <div>
                  <strong>Current Plan:</strong> {currentPlan.name} (Price: ₹{currentPlan.price ?? 0}) &bull; <strong>Product Limit:</strong> {currentPlan.productLimit} &bull; <strong>Products Used:</strong> {shopProductsCount} &bull; <strong>Remaining Slots:</strong> {remainingSlots}
                </div>
                {isLimitReached && !productToEdit && (
                  <div style={{ fontWeight: 700, color: '#e11d48' }}>
                    🚫 Limit Reached! Upgrade plan to add more.
                  </div>
                )}
              </div>
            )
          )}
        </div>

        <form onSubmit={handleSubmit} className="modal-form grid-form add-edit-product-form" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
          {/* Multi-Angle Photo Inputs (File Upload Only) */}
          <div className="form-group product-editor-photos" style={{ gridColumn: 'span 2', marginBottom: '0.5rem' }}>
            <div className="product-editor-photos-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label className="form-label" style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.88rem', marginBottom: 0 }}>
                📷 Multi-Angle Product Photos (Upload Min 4, Max 7 Images) *
              </label>
              <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 500 }}>
                Select image files directly from device storage
              </span>
            </div>

            <div className="product-editor-photo-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '0.75rem' }}>
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
                    onToast('Please select a valid image file (JPG, PNG, WEBP, etc.)', 'info');
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

                      const compressedBase64 = canvas.toDataURL('image/jpeg', 0.75);
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
                    className="product-editor-photo-slot"
                    style={{
                      border: hasImage ? '1.5px solid #10b981' : isRequired ? '1.5px dashed #cbd5e1' : '1px dashed #e2e8f0',
                      borderRadius: '10px',
                      padding: '0.6rem',
                      background: hasImage ? '#f0fdf4' : '#f8fafc',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.4rem',
                      position: 'relative'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.74rem', fontWeight: 700, color: isRequired ? '#0f172a' : '#475569' }}>
                        {labels[idx] || `Photo ${idx + 1}`}
                      </span>
                      {hasImage && (
                        <span style={{ fontSize: '0.65rem', background: '#dcfce7', color: '#15803d', padding: '0.15rem 0.4rem', borderRadius: '4px', fontWeight: 700 }}>
                          ✓ Loaded
                        </span>
                      )}
                    </div>

                    {hasImage ? (
                      <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                        <img
                          src={img}
                          alt={labels[idx]}
                          style={{
                            width: '56px',
                            height: '56px',
                            objectFit: 'cover',
                            borderRadius: '8px',
                            border: '1px solid #cbd5e1'
                          }}
                        />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1 }}>
                          <label
                            style={{
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              color: '#2563eb',
                              background: '#eff6ff',
                              border: '1px solid #bfdbfe',
                              borderRadius: '6px',
                              padding: '0.25rem 0.5rem',
                              textAlign: 'center',
                              cursor: 'pointer'
                            }}
                          >
                            Change File
                            <input type="file" accept="image/*" onChange={handleFileSelect} style={{ display: 'none' }} />
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = [...formImages];
                              updated[idx] = '';
                              setFormImages(updated);
                            }}
                            style={{
                              fontSize: '0.68rem',
                              fontWeight: 600,
                              color: '#dc2626',
                              background: '#fef2f2',
                              border: '1px solid #fecaca',
                              borderRadius: '6px',
                              padding: '0.2rem 0.5rem',
                              cursor: 'pointer'
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <label
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.3rem',
                            padding: '0.9rem 0.4rem',
                            background: '#ffffff',
                            border: '1px solid #cbd5e1',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            textAlign: 'center'
                          }}
                        >
                          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#2563eb' }}>
                            📁 Choose File
                          </span>
                          <span style={{ fontSize: '0.65rem', color: '#64748b' }}>
                            Select image (PNG, JPG, WEBP)
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileSelect}
                            style={{ display: 'none' }}
                          />
                        </label>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {formImages.length < 7 && (
              <button
                type="button"
                style={{ marginTop: '0.6rem', fontSize: '0.78rem', color: '#2563eb', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                onClick={() => setFormImages([...formImages, ''])}
              >
                + Add Another Photo Angle Slot
              </button>
            )}
          </div>

          {/* Top Common Product Fields */}
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600, color: '#0f172a', marginBottom: '0.35rem', display: 'block', fontSize: '0.85rem' }}>Category *</label>
            <SearchableSelect allowCustomValue={false} options={optionsFor('category')} aria-label="category"
              className="form-select-box"
              style={{ padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%', fontSize: '0.88rem' }}
              value={productForm.category}
              onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
            >
              {availableCategoriesList.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </SearchableSelect>
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600, color: '#0f172a', marginBottom: '0.35rem', display: 'block', fontSize: '0.85rem' }}>Brand *</label>
            <CompactBrandSelect
              value={productForm.brand}
              onChange={(val) => setProductForm({ ...productForm, brand: val })}
              brands={availableBrandsList}
            />
          </div>

          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label className="form-label" style={{ fontWeight: 600, color: '#0f172a', marginBottom: '0.35rem', display: 'block', fontSize: '0.85rem' }}>Product Name / Title *</label>
            <input
              type="text"
              className="form-input-text"
              style={{ padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%', fontSize: '0.88rem', boxSizing: 'border-box' }}
              required
              placeholder={
                currentCategoryGroup === 'laptop'
                  ? "e.g. MacBook Air M2 13-inch (2023)"
                  : currentCategoryGroup === 'tablet'
                  ? "e.g. iPad Pro 11-inch M2 Wi-Fi"
                  : currentCategoryGroup === 'accessory'
                  ? "e.g. Apple Watch Ultra 2 (49mm Titanium)"
                  : "e.g. iPhone 15 Pro Max 256GB Natural Titanium"
              }
              value={productForm.name}
              onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
            />
          </div>

          {/* Pricing & Stock */}
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600, color: '#0f172a', marginBottom: '0.35rem', display: 'block', fontSize: '0.85rem' }}>Regular Price (₹) *</label>
            <input
              type="number"
              className="form-input-text"
              style={{ padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%', fontSize: '0.88rem', boxSizing: 'border-box' }}
              required
              min={0}
              placeholder="134900"
              value={productForm.price}
              onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
              onWheel={(e) => e.currentTarget.blur()}
            />
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600, color: '#0f172a', marginBottom: '0.35rem', display: 'block', fontSize: '0.85rem' }}>Discount Offer Price (₹)</label>
            <input
              type="number"
              className="form-input-text"
              style={{ padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%', fontSize: '0.88rem', boxSizing: 'border-box' }}
              min={0}
              placeholder="129900"
              value={productForm.offerPrice}
              onChange={(e) => setProductForm({ ...productForm, offerPrice: e.target.value })}
              onWheel={(e) => e.currentTarget.blur()}
            />
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600, color: '#0f172a', marginBottom: '0.35rem', display: 'block', fontSize: '0.85rem' }}>Stock Quantity *</label>
            <input
              type="number"
              className="form-input-text"
              style={{ padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%', fontSize: '0.88rem', boxSizing: 'border-box' }}
              required
              min={0}
              step={1}
              placeholder="1"
              value={productForm.stock}
              onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })}
              onWheel={(e) => e.currentTarget.blur()}
            />
          </div>

          {/* DYNAMIC TECHNICAL DETAILS SECTION HEADER */}
          <div
            className="product-editor-specs-heading"
            style={{
              gridColumn: 'span 2',
              marginTop: '0.5rem',
              marginBottom: '0.25rem',
              padding: '0.65rem 1rem',
              background: '#eff6ff',
              borderLeft: '4px solid #2563eb',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1e40af' }}>
              📋 Technical Specifications ({productForm.category})
            </span>
            <span style={{ fontSize: '0.74rem', color: '#3b82f6', fontWeight: 600 }}>
              Tailored fields for selected category
            </span>
          </div>

          {/* CATEGORY GROUP 1: MOBILE / SMART PHONES */}
          {currentCategoryGroup === 'mobile' && (
            <>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, color: '#0f172a', marginBottom: '0.35rem', display: 'block', fontSize: '0.85rem' }}>RAM *</label>
                <SearchableSelect options={optionsFor('ram')} aria-label="ram"
                  className="form-input-text"
                  style={{ padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%', fontSize: '0.88rem', boxSizing: 'border-box' }}
                  required
                  placeholder="e.g. 8GB, 12GB, 16GB"
                  value={productForm.ram}
                  onChange={(e) => setProductForm({ ...productForm, ram: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, color: '#0f172a', marginBottom: '0.35rem', display: 'block', fontSize: '0.85rem' }}>Storage *</label>
                <SearchableSelect options={optionsFor('storage')} aria-label="storage"
                  className="form-input-text"
                  style={{ padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%', fontSize: '0.88rem', boxSizing: 'border-box' }}
                  required
                  placeholder="e.g. 128GB, 256GB, 512GB"
                  value={productForm.storage}
                  onChange={(e) => setProductForm({ ...productForm, storage: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, color: '#0f172a', marginBottom: '0.35rem', display: 'block', fontSize: '0.85rem' }}>Processor / Chipset *</label>
                <SearchableSelect options={optionsFor('processor')} aria-label="processor"
                  className="form-input-text"
                  style={{ padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%', fontSize: '0.88rem', boxSizing: 'border-box' }}
                  required
                  placeholder="e.g. Apple A17 Pro, Snapdragon 8 Gen 3"
                  value={productForm.processor}
                  onChange={(e) => setProductForm({ ...productForm, processor: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, color: '#0f172a', marginBottom: '0.35rem', display: 'block', fontSize: '0.85rem' }}>Display Size *</label>
                <SearchableSelect options={optionsFor('displaySize')} aria-label="displaySize"
                  className="form-input-text"
                  style={{ padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%', fontSize: '0.88rem', boxSizing: 'border-box' }}
                  required
                  placeholder="e.g. 6.7 inches Super Retina XDR"
                  value={productForm.displaySize}
                  onChange={(e) => setProductForm({ ...productForm, displaySize: e.target.value })}
                />
              </div>

              {isAppleMobile && (<div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, color: '#0f172a', marginBottom: '0.35rem', display: 'block', fontSize: '0.85rem' }}>Battery Health (%) *</label>
                <SearchableSelect options={optionsFor('batteryHealth')} aria-label="batteryHealth"
                  className="form-input-text"
                  style={{ padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%', fontSize: '0.88rem', boxSizing: 'border-box' }}
                  required
                  placeholder="e.g. 95% Health, 100% Brand New"
                  value={productForm.batteryHealth}
                  onChange={(e) => setProductForm({ ...productForm, batteryHealth: e.target.value })}
                />
              </div>)}

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, color: '#0f172a', marginBottom: '0.35rem', display: 'block', fontSize: '0.85rem' }}>Battery Capacity (mAh) *</label>
                <SearchableSelect options={optionsFor('batteryCapacity')} aria-label="batteryCapacity"
                  className="form-input-text"
                  style={{ padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%', fontSize: '0.88rem', boxSizing: 'border-box' }}
                  placeholder="e.g. 5000 mAh"
                  value={productForm.batteryCapacity}
                  onChange={(e) => setProductForm({ ...productForm, batteryCapacity: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, color: '#0f172a', marginBottom: '0.35rem', display: 'block', fontSize: '0.85rem' }}>SIM Type *</label>
                <SearchableSelect allowCustomValue={true} options={optionsFor('simType')} aria-label="simType"
                  className="form-select-box"
                  style={{ padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%', fontSize: '0.88rem' }}
                  value={productForm.simType}
                  onChange={(e) => setProductForm({ ...productForm, simType: e.target.value })}
                >
                  <option value="Dual SIM (Nano + eSIM)">Dual SIM (Nano + eSIM)</option>
                  <option value="Dual SIM (Physical)">Dual SIM (Physical SIMs)</option>
                  <option value="Single SIM">Single SIM</option>
                  <option value="eSIM Only">eSIM Only</option>
                </SearchableSelect>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, color: '#0f172a', marginBottom: '0.35rem', display: 'block', fontSize: '0.85rem' }}>5G / 4G *</label>
                <SearchableSelect allowCustomValue={true} options={optionsFor('network')} aria-label="network"
                  className="form-select-box"
                  style={{ padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%', fontSize: '0.88rem' }}
                  value={productForm.network}
                  onChange={(e) => setProductForm({ ...productForm, network: e.target.value })}
                >
                  <option value="5G Network Supported">5G Network Supported</option>
                  <option value="4G VoLTE">4G VoLTE</option>
                  <option value="3G / 2G Only">3G / 2G Only</option>
                </SearchableSelect>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, color: '#0f172a', marginBottom: '0.35rem', display: 'block', fontSize: '0.85rem' }}>Front Camera *</label>
                <SearchableSelect options={optionsFor('frontCamera')} aria-label="frontCamera"
                  className="form-input-text"
                  style={{ padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%', fontSize: '0.88rem', boxSizing: 'border-box' }}
                  placeholder="Select or enter front camera"
                  value={productForm.frontCamera}
                  onChange={(e) => setProductForm({ ...productForm, frontCamera: e.target.value })}
                />
              </div>
<div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, color: '#0f172a', marginBottom: '0.35rem', display: 'block', fontSize: '0.85rem' }}>Rear Camera *</label>
                <SearchableSelect options={optionsFor('rearCamera')} aria-label="rearCamera"
                  className="form-input-text"
                  style={{ padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%', fontSize: '0.88rem', boxSizing: 'border-box' }}
                  placeholder="Select or enter rear camera"
                  value={productForm.rearCamera}
                  onChange={(e) => setProductForm({ ...productForm, rearCamera: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, color: '#0f172a', marginBottom: '0.35rem', display: 'block', fontSize: '0.85rem' }}>Operating System *</label>
                <SearchableSelect options={optionsFor('os')} aria-label="os"
                  className="form-input-text"
                  style={{ padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%', fontSize: '0.88rem', boxSizing: 'border-box' }}
                  required
                  placeholder="e.g. iOS 17, Android 14, OxygenOS 14"
                  value={productForm.os}
                  onChange={(e) => setProductForm({ ...productForm, os: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, color: '#0f172a', marginBottom: '0.35rem', fontSize: '0.85rem' }}>
                  <span>IMEI Number</span>
                  <span style={{ fontSize: '0.68rem', background: '#fee2e2', color: '#dc2626', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 600 }}>🔒 Hidden (Backend Only)</span>
                </label>
                <input
                  type="text"
                  className="form-input-text"
                  style={{ padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%', fontSize: '0.88rem', boxSizing: 'border-box' }}
                  placeholder="e.g. 356789123456789 (Seller verification reference)"
                  value={productForm.imeiNumber}
                  onChange={(e) => setProductForm({ ...productForm, imeiNumber: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, color: '#0f172a', marginBottom: '0.35rem', display: 'block', fontSize: '0.85rem' }}>Color *</label>
                <SearchableSelect options={optionsFor('color')} aria-label="color"
                  className="form-input-text"
                  style={{ padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%', fontSize: '0.88rem', boxSizing: 'border-box' }}
                  required
                  placeholder="e.g. Natural Titanium, Phantom Black, Deep Purple"
                  value={productForm.color}
                  onChange={(e) => setProductForm({ ...productForm, color: e.target.value })}
                />
              </div>
            </>
          )}

          {/* CATEGORY GROUP 2: LAPTOP */}
          {currentCategoryGroup === 'laptop' && (
            <>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, color: '#0f172a', marginBottom: '0.35rem', display: 'block', fontSize: '0.85rem' }}>Processor *</label>
                <SearchableSelect options={optionsFor('processor')} aria-label="processor"
                  className="form-input-text"
                  style={{ padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%', fontSize: '0.88rem', boxSizing: 'border-box' }}
                  required
                  placeholder="e.g. Intel Core i7-13700H, Apple M3 Pro, AMD Ryzen 7"
                  value={productForm.processor}
                  onChange={(e) => setProductForm({ ...productForm, processor: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, color: '#0f172a', marginBottom: '0.35rem', display: 'block', fontSize: '0.85rem' }}>RAM *</label>
                <SearchableSelect options={optionsFor('ram')} aria-label="ram"
                  className="form-input-text"
                  style={{ padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%', fontSize: '0.88rem', boxSizing: 'border-box' }}
                  required
                  placeholder="e.g. 16GB DDR5 5600MHz, 8GB Unified"
                  value={productForm.ram}
                  onChange={(e) => setProductForm({ ...productForm, ram: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, color: '#0f172a', marginBottom: '0.35rem', display: 'block', fontSize: '0.85rem' }}>Storage Type – SSD/HDD *</label>
                <SearchableSelect allowCustomValue={true} options={optionsFor('storageType')} aria-label="storageType"
                  className="form-select-box"
                  style={{ padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%', fontSize: '0.88rem' }}
                  value={productForm.storageType}
                  onChange={(e) => setProductForm({ ...productForm, storageType: e.target.value })}
                >
                  <option value="NVMe M.2 SSD">NVMe M.2 High-Speed SSD</option>
                  <option value="SATA SSD">SATA SSD</option>
                  <option value="HDD Mechanical Hard Drive">HDD Mechanical Hard Drive</option>
                  <option value="SSD + HDD Dual Drive">SSD + HDD Dual Storage Drive</option>
                </SearchableSelect>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, color: '#0f172a', marginBottom: '0.35rem', display: 'block', fontSize: '0.85rem' }}>Storage Capacity *</label>
                <SearchableSelect options={optionsFor('storageCapacity')} aria-label="storageCapacity"
                  className="form-input-text"
                  style={{ padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%', fontSize: '0.88rem', boxSizing: 'border-box' }}
                  required
                  placeholder="e.g. 512GB, 1TB SSD, 2TB"
                  value={productForm.storageCapacity}
                  onChange={(e) => setProductForm({ ...productForm, storageCapacity: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, color: '#0f172a', marginBottom: '0.35rem', display: 'block', fontSize: '0.85rem' }}>Graphics / GPU *</label>
                <SearchableSelect options={optionsFor('graphics')} aria-label="graphics"
                  className="form-input-text"
                  style={{ padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%', fontSize: '0.88rem', boxSizing: 'border-box' }}
                  required
                  placeholder="e.g. NVIDIA GeForce RTX 4060 8GB, Intel Iris Xe, Apple 14-core GPU"
                  value={productForm.graphics}
                  onChange={(e) => setProductForm({ ...productForm, graphics: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, color: '#0f172a', marginBottom: '0.35rem', display: 'block', fontSize: '0.85rem' }}>Display Size *</label>
                <SearchableSelect options={optionsFor('displaySize')} aria-label="displaySize"
                  className="form-input-text"
                  style={{ padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%', fontSize: '0.88rem', boxSizing: 'border-box' }}
                  required
                  placeholder="e.g. 15.6 inches, 14 inches, 16 inches"
                  value={productForm.displaySize}
                  onChange={(e) => setProductForm({ ...productForm, displaySize: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, color: '#0f172a', marginBottom: '0.35rem', display: 'block', fontSize: '0.85rem' }}>Resolution *</label>
                <SearchableSelect options={optionsFor('resolution')} aria-label="resolution"
                  className="form-input-text"
                  style={{ padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%', fontSize: '0.88rem', boxSizing: 'border-box' }}
                  required
                  placeholder="e.g. 1920x1080 (Full HD), 2560x1600 (Retina), 4K OLED"
                  value={productForm.resolution}
                  onChange={(e) => setProductForm({ ...productForm, resolution: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, color: '#0f172a', marginBottom: '0.35rem', display: 'block', fontSize: '0.85rem' }}>Battery Health *</label>
                <SearchableSelect options={optionsFor('batteryHealth')} aria-label="batteryHealth"
                  className="form-input-text"
                  style={{ padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%', fontSize: '0.88rem', boxSizing: 'border-box' }}
                  required
                  placeholder="e.g. 92% Health, Normal (Cycle Count: 140)"
                  value={productForm.batteryHealth}
                  onChange={(e) => setProductForm({ ...productForm, batteryHealth: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, color: '#0f172a', marginBottom: '0.35rem', display: 'block', fontSize: '0.85rem' }}>Battery Backup *</label>
                <SearchableSelect options={optionsFor('batteryBackup')} aria-label="batteryBackup"
                  className="form-input-text"
                  style={{ padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%', fontSize: '0.88rem', boxSizing: 'border-box' }}
                  required
                  placeholder="e.g. 5-6 Hours Backup, 8+ Hours"
                  value={productForm.batteryBackup}
                  onChange={(e) => setProductForm({ ...productForm, batteryBackup: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, color: '#0f172a', marginBottom: '0.35rem', display: 'block', fontSize: '0.85rem' }}>Operating System *</label>
                <SearchableSelect allowCustomValue={true} options={optionsFor('os')} aria-label="os"
                  className="form-select-box"
                  style={{ padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%', fontSize: '0.88rem' }}
                  value={productForm.os}
                  onChange={(e) => setProductForm({ ...productForm, os: e.target.value })}
                >
                  <option value="Windows 11 Home">Windows 11 Home</option>
                  <option value="Windows 11 Pro">Windows 11 Pro</option>
                  <option value="macOS Sonoma">macOS Sonoma</option>
                  <option value="Linux / Ubuntu">Linux / Ubuntu</option>
                  <option value="ChromeOS">ChromeOS</option>
                </SearchableSelect>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, color: '#0f172a', marginBottom: '0.35rem', display: 'block', fontSize: '0.85rem' }}>Keyboard Layout *</label>
                <SearchableSelect options={optionsFor('keyboardLayout')} aria-label="keyboardLayout"
                  className="form-input-text"
                  style={{ padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%', fontSize: '0.88rem', boxSizing: 'border-box' }}
                  required
                  placeholder="e.g. US English Backlit QWERTY, RGB Mechanical"
                  value={productForm.keyboardLayout}
                  onChange={(e) => setProductForm({ ...productForm, keyboardLayout: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, color: '#0f172a', marginBottom: '0.35rem', fontSize: '0.85rem' }}>
                  <span>Serial Number</span>
                  <span style={{ fontSize: '0.68rem', background: '#fee2e2', color: '#dc2626', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 600 }}>🔒 Hidden (Backend Only)</span>
                </label>
                <input
                  type="text"
                  className="form-input-text"
                  style={{ padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%', fontSize: '0.88rem', boxSizing: 'border-box' }}
                  placeholder="e.g. C02GX0XXXXXX (Hardware verification code)"
                  value={productForm.serialNumber}
                  onChange={(e) => setProductForm({ ...productForm, serialNumber: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, color: '#0f172a', marginBottom: '0.35rem', display: 'block', fontSize: '0.85rem' }}>Color *</label>
                <SearchableSelect options={optionsFor('color')} aria-label="color"
                  className="form-input-text"
                  style={{ padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%', fontSize: '0.88rem', boxSizing: 'border-box' }}
                  required
                  placeholder="e.g. Space Grey, Silver, Midnight Black"
                  value={productForm.color}
                  onChange={(e) => setProductForm({ ...productForm, color: e.target.value })}
                />
              </div>
            </>
          )}

          {/* CATEGORY GROUP 3: TABLET */}
          {currentCategoryGroup === 'tablet' && (
            <>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, color: '#0f172a', marginBottom: '0.35rem', display: 'block', fontSize: '0.85rem' }}>RAM *</label>
                <SearchableSelect options={optionsFor('ram')} aria-label="ram"
                  className="form-input-text"
                  style={{ padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%', fontSize: '0.88rem', boxSizing: 'border-box' }}
                  required
                  placeholder="e.g. 8GB Unified, 6GB RAM"
                  value={productForm.ram}
                  onChange={(e) => setProductForm({ ...productForm, ram: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, color: '#0f172a', marginBottom: '0.35rem', display: 'block', fontSize: '0.85rem' }}>Storage *</label>
                <SearchableSelect options={optionsFor('storage')} aria-label="storage"
                  className="form-input-text"
                  style={{ padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%', fontSize: '0.88rem', boxSizing: 'border-box' }}
                  required
                  placeholder="e.g. 128GB, 256GB, 512GB"
                  value={productForm.storage}
                  onChange={(e) => setProductForm({ ...productForm, storage: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, color: '#0f172a', marginBottom: '0.35rem', display: 'block', fontSize: '0.85rem' }}>Processor *</label>
                <SearchableSelect options={optionsFor('processor')} aria-label="processor"
                  className="form-input-text"
                  style={{ padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%', fontSize: '0.88rem', boxSizing: 'border-box' }}
                  required
                  placeholder="e.g. Apple M2 Chip, Snapdragon 870, Apple A14"
                  value={productForm.processor}
                  onChange={(e) => setProductForm({ ...productForm, processor: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, color: '#0f172a', marginBottom: '0.35rem', display: 'block', fontSize: '0.85rem' }}>Display Size *</label>
                <SearchableSelect options={optionsFor('displaySize')} aria-label="displaySize"
                  className="form-input-text"
                  style={{ padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%', fontSize: '0.88rem', boxSizing: 'border-box' }}
                  required
                  placeholder="e.g. 11 inches Liquid Retina, 12.9 inches Liquid Retina XDR"
                  value={productForm.displaySize}
                  onChange={(e) => setProductForm({ ...productForm, displaySize: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, color: '#0f172a', marginBottom: '0.35rem', display: 'block', fontSize: '0.85rem' }}>SIM / Wi-Fi *</label>
                <SearchableSelect allowCustomValue={true} options={optionsFor('simWifi')} aria-label="simWifi"
                  className="form-select-box"
                  style={{ padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%', fontSize: '0.88rem' }}
                  value={productForm.simWifi}
                  onChange={(e) => setProductForm({ ...productForm, simWifi: e.target.value })}
                >
                  <option value="Wi-Fi Only">Wi-Fi Only</option>
                  <option value="Wi-Fi + Cellular (5G)">Wi-Fi + Cellular (5G)</option>
                  <option value="Wi-Fi + 4G LTE">Wi-Fi + 4G LTE</option>
                </SearchableSelect>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, color: '#0f172a', marginBottom: '0.35rem', display: 'block', fontSize: '0.85rem' }}>Battery Health *</label>
                <SearchableSelect options={optionsFor('batteryHealth')} aria-label="batteryHealth"
                  className="form-input-text"
                  style={{ padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%', fontSize: '0.88rem', boxSizing: 'border-box' }}
                  required
                  placeholder="e.g. 94% Battery Health, Excellent Backup"
                  value={productForm.batteryHealth}
                  onChange={(e) => setProductForm({ ...productForm, batteryHealth: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, color: '#0f172a', marginBottom: '0.35rem', display: 'block', fontSize: '0.85rem' }}>OS *</label>
                <SearchableSelect options={optionsFor('os')} aria-label="os"
                  className="form-input-text"
                  style={{ padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%', fontSize: '0.88rem', boxSizing: 'border-box' }}
                  required
                  placeholder="e.g. iPadOS 17, Android 13 (One UI)"
                  value={productForm.os}
                  onChange={(e) => setProductForm({ ...productForm, os: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, color: '#0f172a', marginBottom: '0.35rem', display: 'block', fontSize: '0.85rem' }}>Camera Specs *</label>
                <SearchableSelect options={optionsFor('camera')} aria-label="camera"
                  className="form-input-text"
                  style={{ padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%', fontSize: '0.88rem', boxSizing: 'border-box' }}
                  required
                  placeholder="e.g. 12MP Rear + 12MP Ultra Wide Front with Center Stage"
                  value={productForm.camera}
                  onChange={(e) => setProductForm({ ...productForm, camera: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, color: '#0f172a', marginBottom: '0.35rem', display: 'block', fontSize: '0.85rem' }}>Color *</label>
                <SearchableSelect options={optionsFor('color')} aria-label="color"
                  className="form-input-text"
                  style={{ padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%', fontSize: '0.88rem', boxSizing: 'border-box' }}
                  required
                  placeholder="e.g. Space Gray, Starlight, Silver"
                  value={productForm.color}
                  onChange={(e) => setProductForm({ ...productForm, color: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, color: '#0f172a', marginBottom: '0.35rem', fontSize: '0.85rem' }}>
                  <span>IMEI / Serial Number</span>
                  <span style={{ fontSize: '0.68rem', background: '#fee2e2', color: '#dc2626', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 600 }}>🔒 Hidden (Backend Only)</span>
                </label>
                <input
                  type="text"
                  className="form-input-text"
                  style={{ padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%', fontSize: '0.88rem', boxSizing: 'border-box' }}
                  placeholder="e.g. 356789123456789 / DMPDXXXXX"
                  value={productForm.imeiSerial}
                  onChange={(e) => setProductForm({ ...productForm, imeiSerial: e.target.value })}
                />
              </div>
            </>
          )}

          {/* CATEGORY GROUP 4: ACCESSORIES & SMART WATCHES */}
          {currentCategoryGroup === 'accessory' && (
            <>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, color: '#0f172a', marginBottom: '0.35rem', display: 'block', fontSize: '0.85rem' }}>Product Type *</label>
                <SearchableSelect options={optionsFor('productType')} aria-label="productType"
                  className="form-input-text"
                  style={{ padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%', fontSize: '0.88rem', boxSizing: 'border-box' }}
                  required
                  placeholder="e.g. Smartwatch, Wireless Earbuds, Fast Wall Charger, Power Bank"
                  value={productForm.productType}
                  onChange={(e) => setProductForm({ ...productForm, productType: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, color: '#0f172a', marginBottom: '0.35rem', display: 'block', fontSize: '0.85rem' }}>Model Name / Number *</label>
                <SearchableSelect options={optionsFor('model')} aria-label="model"
                  className="form-input-text"
                  style={{ padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%', fontSize: '0.88rem', boxSizing: 'border-box' }}
                  required
                  placeholder="e.g. Watch Ultra 2 (49mm Titanium), AirPods Pro 2"
                  value={productForm.model}
                  onChange={(e) => setProductForm({ ...productForm, model: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, color: '#0f172a', marginBottom: '0.35rem', display: 'block', fontSize: '0.85rem' }}>Device Compatibility *</label>
                <SearchableSelect options={optionsFor('compatibility')} aria-label="compatibility"
                  className="form-input-text"
                  style={{ padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%', fontSize: '0.88rem', boxSizing: 'border-box' }}
                  required
                  placeholder="e.g. Universal (Android & iOS), iPhone 12-15 Series, Apple Watch 44/45/49mm"
                  value={productForm.compatibility}
                  onChange={(e) => setProductForm({ ...productForm, compatibility: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, color: '#0f172a', marginBottom: '0.35rem', display: 'block', fontSize: '0.85rem' }}>Included Items *</label>
                <SearchableSelect options={optionsFor('includedItems')} aria-label="includedItems"
                  className="form-input-text"
                  style={{ padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%', fontSize: '0.88rem', boxSizing: 'border-box' }}
                  required
                  placeholder="e.g. Magnetic Charger Cable, Extra Silicone Ear Tips, Original Packaging Box"
                  value={productForm.includedItems}
                  onChange={(e) => setProductForm({ ...productForm, includedItems: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label" style={{ fontWeight: 600, color: '#0f172a', marginBottom: '0.35rem', display: 'block', fontSize: '0.85rem' }}>Technical Specifications *</label>
                <textarea
                  className="form-textarea"
                  style={{ padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%', fontSize: '0.88rem', boxSizing: 'border-box' }}
                  required
                  rows={2}
                  placeholder="e.g. Active Noise Cancellation, IP68 Waterproof, 30 Hours Total Battery Backup, Fast Charge Support"
                  value={productForm.technicalSpecifications}
                  onChange={(e) => setProductForm({ ...productForm, technicalSpecifications: e.target.value })}
                />
              </div>
            </>
          )}

          <AdditionalSpecifications fields={specificationFields} group={currentCategoryGroup} brand={productForm.brand} values={additionalSpecs} onChange={(key, value) => setAdditionalSpecs(previous => ({ ...previous, [key]: value }))}  />
          {/* Condition & Warranty Row */}
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600, color: '#0f172a', marginBottom: '0.35rem', display: 'block', fontSize: '0.85rem' }}>Physical Condition *</label>
            <SearchableSelect allowCustomValue={true} options={optionsFor('condition')} aria-label="condition"
              className="form-select-box"
              style={{ padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%', fontSize: '0.88rem' }}
              value={productForm.condition}
              onChange={(e) => setProductForm({ ...productForm, condition: e.target.value })}
            >
              <option value="Grade A (Like New)">Grade A (Like New - Scratchless)</option>
              <option value="Grade B (Excellent)">Grade B (Minor Scuffs)</option>
              <option value="Grade C (Good)">Grade C (Fairly Used)</option>
              <option value="Refurbished Certified">Refurbished Certified</option>
              <option value="Brand New Sealed">Brand New Sealed Box</option>
              <option value="Open Box">Open Box Demo Piece</option>
            </SearchableSelect>
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600, color: '#0f172a', marginBottom: '0.35rem', display: 'block', fontSize: '0.85rem' }}>Warranty Period *</label>
            <SearchableSelect allowCustomValue={true} options={optionsFor('warranty')} aria-label="warranty"
              className="form-select-box"
              style={{ padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%', fontSize: '0.88rem' }}
              value={productForm.warranty}
              onChange={(e) => setProductForm({ ...productForm, warranty: e.target.value })}
            >
              <option value="None">None</option>
              <option value="7 Days Shop Warranty">7 Days Shop Warranty</option>
              <option value="1 Month Shop Warranty">1 Month Shop Warranty</option>
              <option value="3 Months Shop Warranty">3 Months Shop Warranty</option>
              <option value="6 Months Shop Warranty">6 Months Shop Warranty</option>
              <option value="1 Year Shop Warranty">1 Year Shop Warranty</option>
              <option value="Brand Warranty Remaining">Brand Warranty Remaining</option>
            </SearchableSelect>
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600, color: '#0f172a', marginBottom: '0.35rem', display: 'block', fontSize: '0.85rem' }}>Device Age / Purchase Date *</label>
            <SearchableSelect options={optionsFor('deviceAge')} aria-label="deviceAge"
              className="form-input-text"
              style={{ padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%', fontSize: '0.88rem', boxSizing: 'border-box' }}
              required
              placeholder="e.g. 6 Months Old, Purchased Jan 2024"
              value={productForm.deviceAge}
              onChange={(e) => setProductForm({ ...productForm, deviceAge: e.target.value })}
            />
          </div>

          {/* Included Accessories & Documents Checklist */}
          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label className="form-label" style={{ fontWeight: 600, color: '#0f172a', marginBottom: '0.35rem', display: 'block', fontSize: '0.85rem' }}>Included Accessories & Documents Checklist</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.6rem' }}>
              {[
                'Tax Invoice Bill',
                'Warranty Card / Document',
                'Original Brand Box',
                'Fast Charger & Cable',
                'Protective Silicone Case',
                'Tempered Glass Guard'
              ].map(item => (
                <label key={item} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem', background: '#f8f9fa', padding: '0.45rem 0.6rem', borderRadius: '6px', border: '1px solid #e2e8f0', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={(productForm.documents || productForm.accessories).includes(item)}
                    onChange={(e) => {
                      let updated = [...(productForm.documents || productForm.accessories)];
                      if (e.target.checked) updated.push(item);
                      else updated = updated.filter(a => a !== item);
                      setProductForm({ ...productForm, documents: updated, accessories: updated });
                    }}
                  />
                  <span>{item}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label className="form-label" style={{ fontWeight: 600, color: '#0f172a', marginBottom: '0.35rem', display: 'block', fontSize: '0.85rem' }}>Detailed Description *</label>
            <textarea
              className="form-textarea"
              style={{ padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%', fontSize: '0.88rem', boxSizing: 'border-box' }}
              required
              rows={3}
              placeholder="Include physical scuff details, warranty info, battery backup, included accessories..."
              value={productForm.description}
              onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
            />
          </div>

          <div className="form-actions-row" style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
            <button
              type="button"
              style={{ padding: '0.65rem 1.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f1f5f9', color: '#0f172a', fontWeight: 600, cursor: 'pointer', fontSize: '0.88rem' }}
              onClick={() => dispatch(setShowAddEditModal(false))}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting}
              style={{ padding: '0.65rem 1.6rem', opacity: isSubmitting ? 0.7 : 1, cursor: isSubmitting ? 'not-allowed' : 'pointer', fontSize: '0.88rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  <span>Saving Product...</span>
                </>
              ) : (
                <span>{productToEdit ? 'Save Changes' : 'Submit Device Listing'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
