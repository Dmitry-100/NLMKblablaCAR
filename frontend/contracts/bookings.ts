import type {
  BookingResponseDto,
  CreateBookingResponse,
  GetBookingResponse,
  GetMyBookingsResponse,
} from '../../backend/src/contracts/bookings';

export type BookingDto = BookingResponseDto;
export type MyBookingsResponse = GetMyBookingsResponse;
export type BookingDetailsResponse = GetBookingResponse;
export type BookTripResponse = CreateBookingResponse;
