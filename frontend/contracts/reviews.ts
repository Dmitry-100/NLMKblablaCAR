import type {
  CreateReviewInput,
  CreateReviewResponse,
  PendingReviewResponseDto,
  PendingReviewsResponse,
  ReviewResponseDto,
  SkipReviewInput,
  SkipReviewResponse,
  UserReviewsResponse,
} from '../../backend/src/contracts/reviews';

export type CreateReviewRequest = CreateReviewInput;
export type SkipReviewRequest = SkipReviewInput;
export type ReviewDto = ReviewResponseDto;
export type PendingReviewDto = PendingReviewResponseDto;
export type SubmitReviewResponse = CreateReviewResponse;
export type SkipReviewResult = SkipReviewResponse;
export type PendingReviewsResult = PendingReviewsResponse;
export type UserReviewsResult = UserReviewsResponse;
