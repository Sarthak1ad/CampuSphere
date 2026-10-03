/**
 * CORE DATA MODELS AND INTERFACES
 */

export type Role = 'admin' | 'organizer' | 'student';

export interface User {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: Role;
  interests?: string[];
  isActive: boolean;
  emailVerified: boolean;
  organizerProfile?: {
    orgName: string;
    registrationNumber: string;
    verificationStatus: 'pending' | 'verified' | 'rejected';
    complianceNotes?: string;
    rating?: number;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface Venue {
  _id: string;
  name: string;
  location: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };
  address: {
    building?: string;
    roomNumber?: string;
    street?: string;
    city: string;
    state?: string;
    zipCode?: string;
  };
  capacity: number;
  amenities: string[];
  images?: string[];
  isArchived?: boolean;
}

export type EventCategory = 'Academic' | 'Cultural' | 'Sports' | 'Social' | 'Workshop' | 'Seminar';
export type EventStatus = 'draft' | 'pending' | 'published' | 'rejected' | 'cancelled' | 'completed' | 'archived';

export interface EventBudget {
  total: number;
  breakdown: Array<{
    item: string;
    amount: number;
  }>;
}

export interface Event {
  _id: string;
  title: string;
  description: string;
  category: EventCategory;
  organizer: User | string;
  venue: Venue | string;
  startDate: string;
  endDate: string;
  capacity: number;
  registeredCount: number;
  status: EventStatus;
  posterUrl?: string;
  budget?: EventBudget;
  views: number;
  clicks: number;
  tags?: string[];
  avgRating?: number;
  ratingCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export type RegistrationStatus = 'registered' | 'waitlisted' | 'checked-in' | 'cancelled' | 'no-show';

export interface Registration {
  _id: string;
  event: Event | string;
  student: User | string;
  status: RegistrationStatus;
  qrToken?: string;
  qrDataUrl?: string;
  checkedInAt?: string;
  createdAt: string;
}

export interface Feedback {
  _id: string;
  event: Event | string;
  student: User | string;
  rating: number;
  answers: {
    eventQuality: number;
    organization: number;
    venueSuitability: number;
    contentRelevance: number;
    overallValue: number;
  };
  comment?: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
  organizerReply?: string;
  createdAt: string;
}

export interface Notification {
  _id: string;
  user: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  isArchived: boolean;
  createdAt: string;
}

export interface PlatformFeedback {
  _id: string;
  user: User;
  type: 'suggestion' | 'bug';
  title: string;
  description: string;
  screenshotUrl?: string;
  status: 'open' | 'planned' | 'in-progress' | 'done';
  createdAt: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  count?: number;
  pagination?: {
    page: number;
    limit: number;
    totalPages: number;
    totalDocs: number;
  };
  errors?: any[];
}
