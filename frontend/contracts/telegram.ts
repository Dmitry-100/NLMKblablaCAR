import type {
  TelegramAuthInput,
  TelegramAuthResponse,
  TelegramLinkResponse,
  TelegramUnlinkResponse,
  TelegramWebhookResponse,
} from '../../backend/src/contracts/telegram';

export type TelegramAuthRequest = TelegramAuthInput;
export type TelegramLoginResponse = TelegramAuthResponse;
export type TelegramLinkResult = TelegramLinkResponse;
export type TelegramUnlinkResult = TelegramUnlinkResponse;
export type TelegramWebhookResult = TelegramWebhookResponse;
