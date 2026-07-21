/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SAMPLE_HOST_BACKEND_BASE_URL?: string;
  readonly VITE_SAMPLE_HOST_BACKEND_TRANSPORT?: 'http' | 'in-memory';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
