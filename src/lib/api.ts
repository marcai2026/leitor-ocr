const DEFAULT_API_BASE = 'http://localhost:3001/api/v1';

export function getApiBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '') || DEFAULT_API_BASE
  );
}

export const apiRoutes = {
  classify: () => `${getApiBaseUrl()}/documents/classify`,
  extractNf: () => `${getApiBaseUrl()}/documents/extract-nf`,
  extractCp: () => `${getApiBaseUrl()}/documents/extract-cp`,
  extractCnh: () => `${getApiBaseUrl()}/documents/extract-cnh`,
};
