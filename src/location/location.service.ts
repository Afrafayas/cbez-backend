import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LocationService {
  private readonly apiKey: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.apiKey = this.configService.get<string>('GOOGLE_MAPS_API_KEY') || process.env.GOOGLE_MAPS_API_KEY || '';
  }

  /**
   * Convert an address string to Lat/Lng coordinates using Google Geocoding API
   */
  async geocodeAddress(address: string) {
    if (!address) {
      throw new BadRequestException('Address parameter is required');
    }

    if (this.apiKey && this.apiKey !== 'YOUR_GOOGLE_MAPS_API_KEY') {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${this.apiKey}`;
      try {
        const response = await fetch(url);
        const data = await response.json();
        if (data.status === 'OK' && data.results && data.results.length > 0) {
          const result = data.results[0];
          const { lat, lng } = result.geometry.location;
          return {
            success: true,
            address: address,
            formattedAddress: result.formatted_address,
            latitude: lat,
            longitude: lng,
            placeId: result.place_id,
          };
        }
      } catch (error) {
        // Continue to fallback below
      }
    }

    // Fallback: OpenStreetMap Nominatim API (Free, no key required)
    try {
      const nomUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;
      const response = await fetch(nomUrl, {
        headers: { 'User-Agent': 'CbezBackend/1.0' },
      });
      const data = await response.json();

      if (Array.isArray(data) && data.length > 0) {
        const first = data[0];
        return {
          success: true,
          address: address,
          formattedAddress: first.display_name,
          latitude: parseFloat(first.lat),
          longitude: parseFloat(first.lon),
          placeId: String(first.place_id),
        };
      }
    } catch (error) {
      // Continue below
    }

    throw new BadRequestException(`Could not geocode location for address: "${address}". Please select coordinates directly.`);
  }

  /**
   * Convert Lat/Lng coordinates to a human-readable address
   */
  async reverseGeocode(lat: number, lng: number) {
    if (lat === undefined || lng === undefined) {
      throw new BadRequestException('Latitude and Longitude parameters are required');
    }

    if (this.apiKey && this.apiKey !== 'YOUR_GOOGLE_MAPS_API_KEY') {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${this.apiKey}`;
      try {
        const response = await fetch(url);
        const data = await response.json();
        if (data.status === 'OK' && data.results && data.results.length > 0) {
          const result = data.results[0];
          return {
            success: true,
            latitude: lat,
            longitude: lng,
            formattedAddress: result.formatted_address,
            placeId: result.place_id,
            addressComponents: result.address_components,
          };
        }
      } catch (error) {
        // Continue to fallback below
      }
    }

    // Fallback: OpenStreetMap Nominatim API (Free, no key required)
    try {
      const nomUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
      const response = await fetch(nomUrl, {
        headers: { 'User-Agent': 'CbezBackend/1.0' },
      });
      const data = await response.json();

      if (data && data.display_name) {
        return {
          success: true,
          latitude: lat,
          longitude: lng,
          formattedAddress: data.display_name,
          placeId: String(data.place_id || 'osm'),
          addressComponents: data.address || {},
        };
      }
    } catch (error) {
      // Continue below
    }

    return {
      success: true,
      latitude: lat,
      longitude: lng,
      formattedAddress: `Coordinates (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
      placeId: 'coords_fallback',
    };
  }

  /**
   * Find shops near a given lat/lng within a radius (km) sorted by distance
   */
  async findNearbyShops(lat: number, lng: number, radiusKm: number = 10, category?: string) {
    const whereCondition: any = {};
    if (category) {
      whereCondition.category = category;
    }

    const allShops = await this.prisma.shop.findMany({
      where: whereCondition,
      include: {
        _count: {
          select: { products: true, followers: true },
        },
      },
    });

    const nearbyShops = allShops
      .filter((shop) => shop.latitude !== null && shop.longitude !== null && shop.latitude !== undefined && shop.longitude !== undefined)
      .map((shop) => {
        const distanceKm = this.calculateHaversineDistance(lat, lng, shop.latitude!, shop.longitude!);
        return {
          ...shop,
          distanceKm: Math.round(distanceKm * 10) / 10, // Round to 1 decimal place
        };
      })
      .filter((shop) => shop.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm);

    return {
      success: true,
      userLocation: { latitude: lat, longitude: lng },
      radiusKm,
      totalFound: nearbyShops.length,
      data: nearbyShops,
    };
  }

  /**
   * Location autocomplete predictions for a search query
   */
  async autocomplete(q?: string) {
    if (!q || !q.trim()) {
      return { success: true, predictions: [] };
    }

    const query = q.trim();

    // 1. Google Places Autocomplete API if API key is provided
    if (this.apiKey && this.apiKey !== 'YOUR_GOOGLE_MAPS_API_KEY') {
      try {
        const googleUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&components=country:in&key=${this.apiKey}`;
        const res = await fetch(googleUrl);
        const data = await res.json();
        if (data.status === 'OK' && Array.isArray(data.predictions)) {
          const predictions = data.predictions.map((item: any) => ({
            placeId: item.place_id,
            description: item.description,
            mainText: item.structured_formatting?.main_text || item.description,
            secondaryText: item.structured_formatting?.secondary_text || '',
          }));
          return { success: true, predictions };
        }
      } catch (error) {
        // Fallback to OpenStreetMap below
      }
    }

    // 2. OpenStreetMap Nominatim API (Free, called safely from backend without CORS restrictions)
    try {
      const nomUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=in&addressdetails=1&limit=8`;
      const response = await fetch(nomUrl, {
        headers: { 'User-Agent': 'CbezBackend/1.0' },
      });
      const data = await response.json();

      if (Array.isArray(data)) {
        const predictions = data.map((item: any) => {
          const addr = item.address || {};
          const mainText =
            addr.shop ||
            addr.amenity ||
            addr.building ||
            addr.suburb ||
            addr.neighbourhood ||
            addr.city ||
            addr.town ||
            addr.village ||
            item.display_name.split(',')[0];
          const secParts = [addr.county, addr.state_district, addr.state, 'India'].filter(Boolean);
          const secondaryText = Array.from(new Set(secParts)).join(', ');

          return {
            placeId: String(item.place_id || item.osm_id),
            description: item.display_name,
            mainText: mainText || item.display_name,
            secondaryText: secondaryText || '',
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon),
          };
        });

        return { success: true, predictions };
      }
    } catch (error) {
      // Return empty predictions on error
    }

    return { success: true, predictions: [] };
  }

  /**
   * Calculate distance in kilometers between two coordinates using Haversine Formula
   */
  private calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}
