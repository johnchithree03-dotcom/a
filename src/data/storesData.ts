export type StoreCategory = 'food' | 'clothes' | 'hardware';

export interface OpeningHours {
  [day: string]: {
    open: string;
    close: string;
  };
}

export interface Store {
  id: string;
  storeName: string;
  storeAddress: string;
  logo: string;
  rating: number;
  reviewCount?: number;
  address: string;
  category: StoreCategory;
  openingHours?: OpeningHours;
  // Placeholders for future implementation
  distance_km?: number;
  delivery_time?: string;
}

export interface Product {
  id: string;
  name: string;
  imageUrl: string;
  price: number;
  category?: string;
}

