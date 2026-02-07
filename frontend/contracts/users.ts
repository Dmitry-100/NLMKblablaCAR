import type {
  UpdateUserInput,
  UserBookingResponseDto,
  UserBookingsResponse,
  UserProfileResponse,
  UserTripResponseDto,
  UserTripsResponse,
} from '../../backend/src/contracts/users';

export type UpdateUserRequest = UpdateUserInput;
export type UserDto = UserProfileResponse['user'];
export type UserProfileResult = UserProfileResponse;
export type UserTripDto = UserTripResponseDto;
export type UserTripsResult = UserTripsResponse;
export type UserBookingDto = UserBookingResponseDto;
export type UserBookingsResult = UserBookingsResponse;
