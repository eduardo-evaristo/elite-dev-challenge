export type CatalogType = 'movie' | 'show';

export type ExternalSource = 'TMDB' | 'TICKETMASTER';

export interface CatalogItem {
  externalId: string;
  externalSource: ExternalSource;
  type: CatalogType;
  title: string;
  overview: string;
  posterUrl: string | null;
  date: string | null;
  rating?: number;
  venue?: string;
  externalUrl?: string;
}

export interface CatalogItemDetail extends CatalogItem {
  runtime?: number;
  genres?: string[];
  tagline?: string;
  city?: string;
  priceRange?: { min: number; max: number; currency: string };
  certification?: string;
}

export interface SearchParams {
  query?: string;
  page?: number;
  size?: number;
}

export interface CatalogSearchParams extends SearchParams {
  type: CatalogType;
}

export interface PaginatedCatalogResult {
  items: CatalogItem[];
  page: number;
  totalPages: number;
  totalResults: number;
}

export type EventType = 'MOVIE' | 'SHOW';
export type EventStatus = 'DRAFT' | 'PUBLISHED' | 'CANCELLED';
export type SeatStatus = 'AVAILABLE' | 'RESERVED' | 'SOLD';

export interface SeatRequest {
  row: string;
  number: number;
}

export interface TicketTypeRequest {
  name: string;
  price: number;
  capacity: number;
}

export interface CreateEventRequest {
  name: string;
  date: string;
  location: string;
  type: 'movie' | 'show';
  externalId: string;
  externalSource: ExternalSource;
  imageUrl?: string;
  eventClassification: string;
  description?: string;
  duration: number;
  seats?: SeatRequest[];
  ticketTypes?: TicketTypeRequest[];
  status?: 'draft' | 'published';
}

export interface UpdateEventRequest {
  name?: string;
  date?: string;
  location?: string;
  status?: EventStatus;
  imageUrl?: string;
  eventClassification?: string;
  description?: string;
  duration?: number;
}

export interface QueryEventsParams {
  page?: number;
  size?: number;
  query?: string;
  type?: EventType;
}

export interface SeatResponse {
  id: string;
  row: string;
  number: number;
  status: SeatStatus;
}

export interface TicketTypeResponse {
  id: string;
  name: string;
  price: number;
  capacity: number;
  availableCount: number;
}

export interface EventItem {
  id: string;
  name: string;
  date: string;
  location: string;
  type: EventType;
  status: EventStatus;
  externalId: string;
  externalSource: ExternalSource;
  imageUrl: string | null;
  eventClassification: string;
  description: string | null;
  duration: number;
  organizerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface EventDetailResponse extends EventItem {
  seats: SeatResponse[];
  ticketTypes: TicketTypeResponse[];
}

export interface PaginatedEventResult {
  items: EventItem[];
  page: number;
  totalPages: number;
  totalResults: number;
}

export interface MovieListItem {
  externalId: string;
  name: string;
  imageUrl: string | null;
  description: string | null;
  eventClassification: string;
  duration: number;
  nextSessionDate: string;
  sessionCount: number;
}

export interface PaginatedMovieListResult {
  items: MovieListItem[];
  page: number;
  totalPages: number;
  totalResults: number;
}

export interface MovieSession {
  id: string;
  date: string;
}

export interface MovieSessionsByLocation {
  location: string;
  sessions: MovieSession[];
}

export interface MovieAggregatedDetail {
  externalId: string;
  name: string;
  imageUrl: string | null;
  description: string | null;
  eventClassification: string;
  duration: number;
  sessionsByLocation: MovieSessionsByLocation[];
}

export interface CreateReservationRequest {
  eventId: string;
  seatId?: string;
  ticketTypeId?: string;
}

export interface ReservationResponse {
  id: string;
  eventId: string;
  userId: string;
  seatId: string | null;
  ticketTypeId: string | null;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
  createdAt: string;
}

export interface PayReservationRequest {
  cardNumber: string;
}

export interface PaymentApprovedResponse {
  id: string;
  reservationId: string;
  userId: string;
  event: {
    id: string;
    name: string;
    date: string;
    location: string;
  };
  seat: {
    id: string;
    row: string;
    number: number;
  } | null;
  ticketType: {
    id: string;
    name: string;
  } | null;
  used: boolean;
  usedAt: string | null;
  createdAt: string;
  signature: string;
  qrContent: string;
}

export type PublicTicketResponse = Omit<
  PaymentApprovedResponse,
  'signature' | 'qrContent'
>;

export interface PaymentDeclinedResponse {
  status: 'DECLINED';
  message: string;
}

export type PaymentResultResponse =
  | PaymentApprovedResponse
  | PaymentDeclinedResponse;
