import type {
  AuthMeResponse,
  AuthSuccessResponse,
  AuthUserResponseDto,
  LoginInput,
  RefreshInput,
  RegisterInput,
} from '../../backend/src/contracts/auth';

export type LoginRequest = LoginInput;
export type RegisterRequest = RegisterInput;
export type RefreshRequest = RefreshInput;
export type AuthUserDto = AuthUserResponseDto;
export type LoginResponse = AuthSuccessResponse;
export type RefreshResponse = AuthSuccessResponse;
export type MeResponse = AuthMeResponse;
