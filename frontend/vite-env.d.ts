/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_YANDEX_MAPS_API_KEY: string;
  readonly VITE_GEMINI_API_KEY?: string;
  readonly VITE_ENABLE_DEV_LOGIN?: string;
  readonly VITE_DEV_LOGIN_EMAIL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
