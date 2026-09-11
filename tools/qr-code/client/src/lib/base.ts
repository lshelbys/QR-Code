export const BASE_URL = import.meta.env.BASE_URL;
export const homeHref = BASE_URL;
export const generatorHref = `${BASE_URL}#generator`;
export const hubHref = BASE_URL.includes("/tools/qr-code")
  ? BASE_URL.replace(/tools\/qr-code\/?$/, "")
  : BASE_URL;
