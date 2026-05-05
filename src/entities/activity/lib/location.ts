import type { Activity } from '../model/types';
import { chinaCities } from '@/static/city';
import { MUNICIPALITY_CITIES_ARR } from '@/utils/const';

const extractCities = (str: string): string[] => {
  const locations = [];
  let match;
  const pattern = /([\u4e00-\u9fa5]{2,}(市|自治州|特别行政区|盟|地区))/g;
  while ((match = pattern.exec(str)) !== null) {
    locations.push(match[0]);
  }

  return locations;
};

const extractDistricts = (str: string): string[] => {
  const locations = [];
  let match;
  const pattern = /([\u4e00-\u9fa5]{2,}(区|县))/g;
  while ((match = pattern.exec(str)) !== null) {
    locations.push(match[0]);
  }

  return locations;
};

const extractCoordinate = (str: string): [number, number] | null => {
  const pattern = /'latitude': ([-]?\d+\.\d+).*?'longitude': ([-]?\d+\.\d+)/;
  const match = str.match(pattern);

  if (match) {
    const latitude = parseFloat(match[1]);
    const longitude = parseFloat(match[2]);
    return [longitude, latitude];
  }

  return null;
};

const cities = chinaCities.map((c) => c.name);
const locationCache = new Map<number, ReturnType<typeof locationForRun>>();

const locationForRun = (
  run: Activity
): {
  country: string;
  province: string;
  city: string;
  coordinate: [number, number] | null;
} => {
  if (locationCache.has(run.run_id)) {
    return locationCache.get(run.run_id)!;
  }

  const location = run.location_country;
  let [city, province, country] = ['', '', ''];
  let coordinate = null;

  if (location) {
    const cityMatch = extractCities(location);
    const provinceMatch = location.match(/[\u4e00-\u9fa5]{2,}(省|自治区)/);

    if (cityMatch) {
      city = cities.find((value) => cityMatch.includes(value)) ?? '';
    }

    if (provinceMatch) {
      [province] = provinceMatch;
      coordinate = extractCoordinate(location);
    }

    const locationParts = location.split(',');
    let countryMatch = locationParts[locationParts.length - 1].match(
      /[\u4e00-\u9fa5].*[\u4e00-\u9fa5]/
    );

    if (!countryMatch && locationParts.length >= 3) {
      countryMatch = locationParts[2].match(/[\u4e00-\u9fa5].*[\u4e00-\u9fa5]/);
    }

    if (countryMatch) {
      [country] = countryMatch;
    }
  }

  if (MUNICIPALITY_CITIES_ARR.includes(city)) {
    province = city;
    if (location) {
      const districtMatch = extractDistricts(location);
      if (districtMatch.length > 0) {
        city = districtMatch[districtMatch.length - 1];
      }
    }
  }

  const result = { country, province, city, coordinate };
  locationCache.set(run.run_id, result);
  return result;
};

export { locationForRun };
