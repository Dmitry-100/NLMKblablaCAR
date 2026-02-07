import type {
  CreateRequestInput,
  GetRequestResponse,
  GetRequestsResponse,
  RequestResponseDto,
  RequestStatsResponse,
  RequestsQuery,
  UpdateRequestInput,
} from '../../backend/src/contracts/requests';

export type RequestDto = RequestResponseDto;
export type CreateRequestRequest = CreateRequestInput;
export type UpdateRequestRequest = UpdateRequestInput;
export type RequestsListQuery = RequestsQuery;
export type RequestsListResponse = GetRequestsResponse;
export type RequestDetailsResponse = GetRequestResponse;
export type RequestsStatsResponse = RequestStatsResponse;
