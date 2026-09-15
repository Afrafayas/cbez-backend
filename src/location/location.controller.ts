import { Controller, Get, Query } from '@nestjs/common';
import { LocationService } from './location.service';
import { GeocodeDto } from './dto/geocode.dto';
import { ReverseGeocodeDto } from './dto/reverse-geocode.dto';
import { NearbyShopsDto } from './dto/nearby-shops.dto';

@Controller('location')
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  @Get('geocode')
  async geocode(@Query() dto: GeocodeDto) {
    return this.locationService.geocodeAddress(dto.address);
  }

  @Get('reverse-geocode')
  async reverseGeocode(@Query() dto: ReverseGeocodeDto) {
    return this.locationService.reverseGeocode(dto.lat, dto.lng);
  }

  @Get('nearby-shops')
  async getNearbyShops(@Query() dto: NearbyShopsDto) {
    return this.locationService.findNearbyShops(
      dto.lat,
      dto.lng,
      dto.radiusKm ? Number(dto.radiusKm) : 10,
      dto.category,
    );
  }
}
