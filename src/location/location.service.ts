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

    if (!this.apiKey || this.apiKey === 'YOUR_GOOGLE_MAPS_API_KEY') {
      throw new BadRequestException('Google Maps API key is missing or invalid in backend configuration');
    }

    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${this.apiKey}`;

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (data.status !== 'OK' || !data.results || data.results.length === 0) {
        throw new BadRequestException(`Geocoding failed: ${data.status} ${data.error_message || ''}`);
      }

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
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException(`Failed to connect to Google Maps API: ${error.message}`);
    }
  }

  /**
   * Convert Lat/Lng coordinates to a human-readable address
   */
  async reverseGeocode(lat: number, lng: number) {
    if (lat === undefined || lng === undefined) {
      throw new BadRequestException('Latitude and Longitude parameters are required');
    }

    if (!this.apiKey || this.apiKey === 'YOUR_GOOGLE_MAPS_API_KEY') {
      throw new BadRequestException('Google Maps API key is missing or invalid in backend configuration');
    }

    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${this.apiKey}`;

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (data.status !== 'OK' || !data.results || data.results.length === 0) {
        throw new BadRequestException(`Reverse geocoding failed: ${data.status} ${data.error_message || ''}`);
      }

      const result = data.results[0];

      return {
        success: true,
        latitude: lat,
        longitude: lng,
        formattedAddress: result.formatted_address,
        placeId: result.place_id,
        addressComponents: result.address_components,
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException(`Failed to connect to Google Maps API: ${error.message}`);
    }
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
