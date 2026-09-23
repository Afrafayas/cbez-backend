export interface ShopProfileCompletion {
  completionPercentage: number;
  completedFields: string[];
  missingFields: string[];
  totalFieldsCount: number;
  completedFieldsCount: number;
  isFullyCompleted: boolean;
}

export function calculateShopProfileCompletion(shop?: any, ownerEmail?: string): ShopProfileCompletion {
  const allMandatoryLabels = [
    'Owner Name', 'Profile Image', 'Shop Name', 'Address', 'City',
    'District', 'Country', 'Email Address', 'Aadhaar Number',
    'PAN Number', 'Subscription Plan', 'Latitude', 'Longitude'
  ];

  if (!shop) {
    return {
      completionPercentage: 0,
      completedFields: [],
      missingFields: allMandatoryLabels,
      totalFieldsCount: 13,
      completedFieldsCount: 0,
      isFullyCompleted: false,
    };
  }

  const emailVal = shop.email || ownerEmail || shop.owner?.email;

  const mandatoryFields = [
    { key: 'ownerName', label: 'Owner Name', isCompleted: Boolean(shop.ownerName && String(shop.ownerName).trim()) },
    { key: 'profileImage', label: 'Profile Image', isCompleted: Boolean(shop.profileImage && String(shop.profileImage).trim()) },
    { key: 'name', label: 'Shop Name', isCompleted: Boolean(shop.name && String(shop.name).trim()) },
    { key: 'address', label: 'Address', isCompleted: Boolean(shop.address && String(shop.address).trim()) },
    { key: 'city', label: 'City', isCompleted: Boolean(shop.city && String(shop.city).trim()) },
    { key: 'district', label: 'District', isCompleted: Boolean(shop.district && String(shop.district).trim()) },
    { key: 'country', label: 'Country', isCompleted: Boolean(shop.country && String(shop.country).trim()) },
    { key: 'email', label: 'Email Address', isCompleted: Boolean(emailVal && String(emailVal).trim()) },
    { key: 'aadhaarNumber', label: 'Aadhaar Number', isCompleted: Boolean(shop.aadhaarNumber && String(shop.aadhaarNumber).trim()) },
    { key: 'panNumber', label: 'PAN Number', isCompleted: Boolean(shop.panNumber && String(shop.panNumber).trim()) },
    {
      key: 'subscriptionPlanId',
      label: 'Subscription Plan',
      isCompleted: Boolean(
        (shop.subscriptionPlanId && String(shop.subscriptionPlanId).trim()) ||
        shop.subscription?.planId ||
        shop.subscription?.plan ||
        (shop.subscriptionUsage && shop.subscriptionUsage.planName && shop.subscriptionUsage.planName !== 'None')
      ),
    },
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
    isFullyCompleted: completedFieldsCount === totalFieldsCount,
  };
}

export const SELLER_VERIFICATION_MESSAGE =
  'Your profile is under verification. After verification only you can create a product and access all the features.';

export function formatShopModel(shop: any, currentProductsCount?: number, fallbackOwnerEmail?: string) {
  if (!shop) return null;

  const currentProducts = currentProductsCount !== undefined
    ? currentProductsCount
    : (shop._count?.products ?? (Array.isArray(shop.products) ? shop.products.length : 0));

  const plan = shop.subscription?.plan;
  const productLimit = plan ? plan.productLimit : 0;
  const remaining = Math.max(0, productLimit - currentProducts);

  const isVerified = Boolean(shop.verified);

  const subscriptionUsage = {
    planName: plan ? plan.name : 'None',
    productLimit,
    currentProducts,
    remaining,
    isLimitReached: productLimit > 0 ? currentProducts >= productLimit : false,
    canAddProduct: Boolean(isVerified && (productLimit > 0 ? currentProducts < productLimit : false)),
    verificationRequired: !isVerified,
  };

  const effectiveOwnerEmail = shop.owner?.email || fallbackOwnerEmail || shop.email;

  const profileCompletion = calculateShopProfileCompletion({
    ...shop,
    subscriptionUsage,
  }, effectiveOwnerEmail);

  return {
    id: shop.id,
    name: shop.name,
    ownerName: shop.ownerName,
    phone: shop.phone,
    whatsapp: shop.whatsapp,
    address: shop.address,
    city: shop.city,
    district: shop.district || 'Ernakulam',
    country: shop.country || 'India',
    aadhaarNumber: shop.aadhaarNumber || null,
    panNumber: shop.panNumber || null,
    profileImage: shop.profileImage || null,
    gstNumber: shop.gstNumber || null,
    websiteUrl: shop.websiteUrl || null,
    businessHours: shop.businessHours || null,
    businessDescription: shop.businessDescription || null,
    alternatePhone: shop.alternatePhone || null,
    category: shop.category,
    verified: isVerified,
    isApproved: isVerified,
    verificationStatus: isVerified ? 'VERIFIED' : 'UNDER_VERIFICATION',
    verificationMessage: isVerified
      ? 'Shop is approved and verified'
      : SELLER_VERIFICATION_MESSAGE,
    rating: shop.rating,
    latitude: shop.latitude !== null && shop.latitude !== undefined && !isNaN(Number(shop.latitude)) ? Number(shop.latitude) : null,
    longitude: shop.longitude !== null && shop.longitude !== undefined && !isNaN(Number(shop.longitude)) ? Number(shop.longitude) : null,
    createdAt: shop.createdAt,
    updatedAt: shop.updatedAt,
    ownerId: shop.ownerId,
    owner: shop.owner ? {
      id: shop.owner.id,
      name: shop.owner.name,
      email: shop.owner.email,
      phone: shop.owner.phone,
      role: shop.owner.role,
      latitude: shop.owner.latitude !== null && shop.owner.latitude !== undefined && !isNaN(Number(shop.owner.latitude)) ? Number(shop.owner.latitude) : null,
      longitude: shop.owner.longitude !== null && shop.owner.longitude !== undefined && !isNaN(Number(shop.owner.longitude)) ? Number(shop.owner.longitude) : null,
    } : undefined,
    subscription: shop.subscription || null,
    subscriptionPlanId: shop.subscription?.planId || null,
    subscriptionUsage,
    profileCompletion,
    productsCount: currentProducts,
    products: shop.products || undefined,
  };
}

// Strip internal placeholder email used to avoid MongoDB null-unique collision
export function stripPlaceholderEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  if (email.startsWith('noemail_') && email.endsWith('@placeholder.cbez')) return null;
  return email;
}

export function formatUserModel(user: any) {
  if (!user) return null;
  const { password, token, tokenExpiry, ...userWithoutPassword } = user;
  // Replace placeholder email with null so it never leaks to the frontend
  userWithoutPassword.email = stripPlaceholderEmail(userWithoutPassword.email);
  const formattedShop = user.shop
    ? formatShopModel(
        {
          ...user.shop,
          owner: user.shop.owner || {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role,
            latitude: user.latitude,
            longitude: user.longitude,
          },
        },
        undefined,
        user.email,
      )
    : null;

  const isSeller = user.role === 'seller';
  const isApproved = isSeller ? Boolean(user.shop?.verified) : true;
  const verificationStatus = isSeller
    ? (user.shop?.verified ? 'VERIFIED' : 'UNDER_VERIFICATION')
    : 'VERIFIED';
  const verificationMessage = isSeller && !user.shop?.verified
    ? SELLER_VERIFICATION_MESSAGE
    : undefined;

  return {
    ...userWithoutPassword,
    latitude: user.latitude !== null && user.latitude !== undefined && !isNaN(Number(user.latitude)) ? Number(user.latitude) : null,
    longitude: user.longitude !== null && user.longitude !== undefined && !isNaN(Number(user.longitude)) ? Number(user.longitude) : null,
    isApproved,
    verificationStatus,
    verificationMessage,
    shop: formattedShop,
    profileCompletion: formattedShop?.profileCompletion || (user.shop ? calculateShopProfileCompletion(user.shop, user.email) : undefined),
  };
}

