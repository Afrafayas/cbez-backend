export interface SubscriptionPlan {
  price?: number;
  id: string;
  ownerId?: string;
  name: string;
  description: string;
  productLimit: number;
  status: 'ACTIVE' | 'INACTIVE';
  durationDays?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ShopProfileCompletion {
  completionPercentage: number;
  completedFields: string[];
  missingFields: string[];
  totalFieldsCount: number;
  completedFieldsCount: number;
  isFullyCompleted: boolean;
}

export interface Shop {
  subscription?: {
    id: string;
    planId: string;
    plan?: SubscriptionPlan;
    startDate?: string;
    endDate?: string;
    durationDays?: number;
    status?: string;
  };
  id: string;
  ownerId?: string;
  name: string;
  ownerName: string;
  phone: string;
  whatsapp: string;
  address: string;
  city: string;
  category: string;
  verified: boolean;
  rating: number;
  joinedDate: string;
  createdAt?: string;
  subscriptionPlanId?: string;
  isSubscriptionExpired?: boolean;
  subscriptionStartDate?: string;
  subscriptionEndDate?: string;
  subscriptionExpiresAt?: string;
  subscriptionUsage?: {
    planName: string;
    productLimit: number;
    currentProducts: number;
    remaining: number;
    isLimitReached: boolean;
    durationDays?: number;
    startDate?: string | null;
    endDate?: string | null;
    expiresAt?: string;
    daysLeft?: number;
    isExpired?: boolean;
    daysRemaining?: number;
    isExpiringSoon?: boolean;
    canAddProduct?: boolean;
    expirationMessage?: string | null;
  };
  district?: string;
  country?: string;
  aadhaarNumber?: string;
  panNumber?: string;
  profileImage?: string;
  gstNumber?: string;
  websiteUrl?: string;
  latitude?: number;
  longitude?: number;
  lat?: number;
  lng?: number;
  distanceKm?: number;
  businessHours?: string;
  businessDescription?: string;
  alternatePhone?: string;
  email?: string;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  verificationStatus?: 'VERIFIED' | 'UNDER_VERIFICATION' | string;
  isApproved?: boolean;
  productsCount?: number;
  profileCompletion?: ShopProfileCompletion;
}

export function calculateShopProfileCompletion(shop?: Partial<Shop> | null, ownerEmail?: string): ShopProfileCompletion {
  const allMandatoryLabels = [
    'Owner Name', 'Profile Image', 'Shop Name', 'Address', 'City',
    'District', 'Country', 'Email Address', 'Aadhaar Number',
    'PAN Number', 'Latitude', 'Longitude'
  ];

  if (!shop) {
    return {
      completionPercentage: 0,
      completedFields: [],
      missingFields: allMandatoryLabels,
      totalFieldsCount: 12,
      completedFieldsCount: 0,
      isFullyCompleted: false
    };
  }

  const emailVal = shop.email || ownerEmail;

  const mandatoryFields = [
    { key: 'ownerName', label: 'Owner Name', isCompleted: Boolean(shop.ownerName && shop.ownerName.trim()) },
    { key: 'profileImage', label: 'Profile Image', isCompleted: Boolean(shop.profileImage && shop.profileImage.trim()) },
    { key: 'name', label: 'Shop Name', isCompleted: Boolean(shop.name && shop.name.trim()) },
    { key: 'address', label: 'Address', isCompleted: Boolean(shop.address && shop.address.trim()) },
    { key: 'city', label: 'City', isCompleted: Boolean(shop.city && shop.city.trim()) },
    { key: 'district', label: 'District', isCompleted: Boolean(shop.district && shop.district.trim()) },
    { key: 'country', label: 'Country', isCompleted: Boolean(shop.country && shop.country.trim()) },
    { key: 'email', label: 'Email Address', isCompleted: Boolean(emailVal && emailVal.trim()) },
    { key: 'aadhaarNumber', label: 'Aadhaar Number', isCompleted: Boolean(shop.aadhaarNumber && shop.aadhaarNumber.trim()) },
    { key: 'panNumber', label: 'PAN Number', isCompleted: Boolean(shop.panNumber && shop.panNumber.trim()) },
    { key: 'latitude', label: 'Latitude', isCompleted: shop.latitude !== null && shop.latitude !== undefined && !isNaN(Number(shop.latitude)) },
    { key: 'longitude', label: 'Longitude', isCompleted: shop.longitude !== null && shop.longitude !== undefined && !isNaN(Number(shop.longitude)) },
  ];

  const completedFields: string[] = [];
  const missingFields: string[] = [];

  for (const item of mandatoryFields) {
    if (item.isCompleted) {
      completedFields.push(item.label);
    } else {
      missingFields.push(item.label);
    }
  }

  const completedFieldsCount = completedFields.length;
  const totalFieldsCount = mandatoryFields.length;
  const completionPercentage = Math.round((completedFieldsCount / totalFieldsCount) * 100);

  return {
    completionPercentage,
    completedFields,
    missingFields,
    totalFieldsCount,
    completedFieldsCount,
    isFullyCompleted: completionPercentage === 100
  };
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role?: string;
  latitude?: number | null;
  longitude?: number | null;
  shop?: Shop | null;
  location?: string;
  city?: string;
  locationName?: string;
  address?: string;
}

export interface Category {
  specConfig?: import('./utils/categorySpecifications').SpecificationField[];
  id: string;
  name: string;
  slug: string;
  image?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Brand {
  id: string;
  name: string;
  logo?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Banner {
  id: string;
  title: string;
  details?: string | null;
  image: string;
  type: 'banner' | 'ads';
  shopId?: string | null;
  shop?: {
    id: string;
    name: string;
    phone?: string;
    whatsapp?: string;
    city?: string;
    district?: string;
    profileImage?: string;
  } | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}


export interface Lead {
  id: string;
  shopId: string;
  productId?: string;
  productName: string;
  customerName: string;
  customerPhone: string;
  contactType: 'call' | 'whatsapp';
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  brand: string;
  category: string;
  description: string;
  price: number;
  offerPrice?: number;
  stock: number;
  shopId: string;
  specs: Record<string, string>;
  images?: string[];
  storage?: string;
  ram?: string;
  batteryHealth?: string;
  condition?: string;
  warranty?: string;
  color?: string;
  simType?: string;
  network?: string;
  originalBill?: boolean;
  accessories?: string[];
  purchasedFromAmazon?: boolean;
  isAmazonRefurbished?: boolean;
  isSoldOut?: boolean;
  deviceAge?: string;
  imeiNumber?: string;
  documents?: string[];
  shop?: Shop | null;
  distanceKm?: number;
  createdAt?: string;
  updatedAt?: string;

  // Mobile / Tablet specs
  processor?: string;
  displaySize?: string;
  batteryPercentage?: string;
  batteryCapacity?: string;
  frontCamera?: string;
  rearCamera?: string;
  camera?: string;
  os?: string;
  simWifi?: string;
  imeiSerial?: string;

  // Laptop specs
  storageType?: string;
  storageCapacity?: string;
  graphics?: string;
  resolution?: string;
  batteryBackup?: string;
  keyboardLayout?: string;
  serialNumber?: string;

  // Accessories & Smart Watches specs
  productType?: string;
  model?: string;
  compatibility?: string;
  includedItems?: string;
  technicalSpecifications?: string;
}

export interface WishlistItem {
  id: string;
  userId: string;
  productId: string;
  createdAt: string;
  product: Product & { shop?: Shop };
}

export interface SourcingToast {
  id: number;
  message: string;
  type: 'info' | 'success' | 'warning';
}

export interface ReduxState {
  auth: {
    activeShop: Shop | null;
    activeUser: User | null;
    showAuthModal: boolean;
    authTab: 'login' | 'register';
    authRole: 'customer' | 'seller';
  };
  products: {
    items: Product[];
    shops: Shop[];
    leads: Lead[];
    subscriptionPlans: SubscriptionPlan[];
    selectedProduct: Product | null;
    showAddEditModal: boolean;
    productToEdit: Product | null;
  };
  filters: {
    searchQuery: string;
    searchCategory: string;
    selectedCategory: string;
    filterBrand: string;
    filterMinPrice: string;
    filterMaxPrice: string;
    filterInStockOnly: boolean;
    filterCity: string;
    filterMaxBudget: string;
    sortBy: 'featured' | 'price-asc' | 'price-desc' | 'stock';
  };
  ui: {
    toasts: SourcingToast[];
    activeView: 'marketplace' | 'seller-dashboard' | 'customer-dashboard';
    dashboardTab: 'listings' | 'profile' | 'leads';
  };
}

export interface SellerCustomerLog {
  id: string;
  action: 'WHATSAPP_CLICK' | 'CALL_CLICK' | 'LOCATION_CLICK' | 'DIRECTIONS_CLICK' | 'WISHLIST' | 'PRODUCT_CLICK';
  createdAt: string;
  details: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  isLocked: boolean;
  requiresPremium: boolean;
  customer: {
    id?: string | null;
    name: string;
    email?: string | null;
    phone?: string | null;
    isMasked?: boolean;
  };
  product: {
    id: string;
    name: string;
    price: number;
    category?: string;
    brand?: string;
    image?: string | null;
  };
}

export interface SellerCustomerLogsResponse {
  shop: {
    id: string;
    name: string;
    ownerName: string;
    city: string;
  };
  subscription: {
    planName: string;
    isPremium: boolean;
  };
  stats: {
    total: number;
    whatsappCount: number;
    callCount: number;
    locationCount: number;
    wishlistCount: number;
    productClicksCount: number;
  };
  logs: SellerCustomerLog[];
}
