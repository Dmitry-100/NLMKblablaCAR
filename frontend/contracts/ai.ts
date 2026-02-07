import type {
  AssistantErrorResponse,
  AssistantInput,
  AssistantResponse,
} from '../../backend/src/contracts/ai';

export type AssistantRequest = AssistantInput;
export type AssistantResult = AssistantResponse;
export type AssistantError = AssistantErrorResponse;
