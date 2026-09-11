import { copyFileSync, cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const docs = path.join(root, "docs");
const assetsSrc = path.join(docs, "assets");
const assetsDest = path.join(root, "assets");

if (!existsSync(path.join(docs, "index.html"))) {
  throw new Error("docs/index.html is missing. Run the Vite pages build first.");
}

if (existsSync(assetsDest)) {
  rmSync(assetsDest, { recursive: true, force: true });
}
if (existsSync(assetsSrc)) {
  mkdirSync(assetsDest, { recursive: true });
  cpSync(assetsSrc, assetsDest, { recursive: true });
}

copyFileSync(path.join(docs, "index.html"), path.join(root, "index.html"));
copyFileSync(path.join(docs, "index.html"), path.join(root, "404.html"));
writeFileSync(path.join(root, ".nojekyll"), "");

const faviconSrc = path.join(docs, "favicon.svg");
if (existsSync(faviconSrc)) {
  copyFileSync(faviconSrc, path.join(root, "favicon.svg"));
}

console.log("Published GitHub Pages files for Image Studio.");
