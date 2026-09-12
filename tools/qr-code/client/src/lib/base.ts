export const BASE_URL = import.meta.env.BASE_URL;
const pagesRelative = BASE_URL === "./";
export const homeHref = pagesRelative ? "./" : BASE_URL;
export const generatorHref = pagesRelative ? "./#generator" : `${BASE_URL}#generator`;
export const hubHref = pagesRelative
  ? "../../"
  : BASE_URL.includes("/tools/qr-code")
    ? BASE_URL.replace(/tools\/qr-code\/?$/, "")
    : BASE_URL;
export const imageStudioHref = pagesRelative
  ? "../image-studio/"
  : `${hubHref.endsWith("/") ? hubHref : `${hubHref}/`}tools/image-studio/`;
