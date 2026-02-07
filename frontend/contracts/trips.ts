import type {
  CreateTripInput,
  GetTripResponse,
  GetTripsResponse,
  TripResponseDto,
  TripsQuery,
  UpdateTripInput,
} from '../../backend/src/contracts/trips';

export type TripsListQuery = TripsQuery;
export type CreateTripRequest = CreateTripInput;
export type UpdateTripRequest = UpdateTripInput;
export type TripDto = TripResponseDto;
export type TripsListResponse = GetTripsResponse;
export type TripDetailsResponse = GetTripResponse;
