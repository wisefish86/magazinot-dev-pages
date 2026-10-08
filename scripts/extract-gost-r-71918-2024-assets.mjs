import fs from "node:fs/promises";
import path from "node:path";

const SOURCE_URL = "https://allgosts.ru/amp/23/040/gost_r_71918-2024";
const OUT_DIR = path.resolve("pages/assets/gost-r-71918-2024");

const names = [
  "table-1-color-green.png",
  "table-1-color-red.png",
  "table-1-color-blue.png",
  "table-1-color-yellow.png",
  "table-1-color-orange.png",
  "table-1-color-violet.png",
  "table-1-color-brown.png",
  "table-1-color-gray.png",
  "section-5-half-circumference-symbol.png",
  "table-2-color-red.png",
  "table-2-color-yellow.png",
  "table-2-color-green.png",
  "figure-1-warning-rings.png",
  "figure-2-warning-signs.png",
  "figure-3-marking-shields.png",
  "figure-4-marking-inscriptions.png",
  "figure-5-viewing-distance.png",
  "appendix-a-chromaticity-diagram.png",
  "appendix-a-color-green.png",
  "appendix-a-color-red.png",
  "appendix-a-color-blue.png",
  "appendix-a-color-yellow.png",
  "appendix-a-color-orange.png",
  "appendix-a-color-violet.png",
  "appendix-a-color-brown.png",
  "appendix-a-color-gray.png",
  "appendix-b-chromaticity-diagram.png",
  "appendix-b-color-red.png",
  "appendix-b-color-yellow.png",
  "appendix-b-color-green.png",
  "appendix-v-symbol-01.png",
  "appendix-v-symbol-02.png",
  "appendix-v-symbol-03.png",
  "appendix-v-symbol-04.png",
  "appendix-v-example-01.png",
  "appendix-v-example-02.png",
  "appendix-v-example-03.png",
  "appendix-v-example-04.png",
  "appendix-v-example-05.png",
  "appendix-v-example-06.png",
  "appendix-v-example-07.png",
  "appendix-v-example-08.png",
  "appendix-v-example-09.png",
  "appendix-v-example-10.png"
];

const response = await fetch(SOURCE_URL, {
  headers: { "user-agent": "Mozilla/5.0 (compatible; MagazinOT-DEV/1.0)" }
});
if (!response.ok) throw new Error(`Failed to fetch ГОСТ source: ${response.status}`);

const html = await response.text();

const articleMatch = html.match(/<(?:article|div)\b[^>]*\bid=(?:"article"|'article'|article)[^>]*>/i);
let articleStart;
let articleEnd;

if (articleMatch && articleMatch.index != null) {
  articleStart = articleMatch.index;
  articleEnd = html.indexOf("</article>", articleStart);
  if (articleEnd < 0) articleEnd = html.indexOf("</main>", articleStart);
} else {
  const marker = "Текст ГОСТ Р 71918-2024";
  articleStart = html.indexOf(marker);
  articleEnd = html.indexOf("</main>", articleStart);
}

if (articleStart < 0 || articleEnd < 0) throw new Error("ГОСТ content block not found");

const article = html.slice(articleStart, articleEnd);
const imageSources = [...article.matchAll(/<img\b[^>]*?\bsrc=(?:"([^"]+)"|'([^']+)'|([^\s>]+))/gi)]
  .map(match => match[1] || match[2] || match[3])
  .filter(Boolean);

if (imageSources.length !== names.length) {
  throw new Error(`Expected ${names.length} ГОСТ images, found ${imageSources.length}. Source layout may have changed.`);
}

await fs.rm(OUT_DIR, { recursive: true, force: true });
await fs.mkdir(OUT_DIR, { recursive: true });

for (let i = 0; i < imageSources.length; i++) {
  const src = imageSources[i];
  let buffer;

  if (src.startsWith("data:image/")) {
    const base64 = src.slice(src.indexOf(",") + 1);
    buffer = Buffer.from(base64, "base64");
  } else {
    const imageUrl = new URL(src, SOURCE_URL);
    const imageResponse = await fetch(imageUrl, {
      headers: { "user-agent": "Mozilla/5.0 (compatible; MagazinOT-DEV/1.0)" }
    });
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image ${imageUrl}: ${imageResponse.status}`);
    }
    buffer = Buffer.from(await imageResponse.arrayBuffer());
  }

  await fs.writeFile(path.join(OUT_DIR, names[i]), buffer);
}

const manifest = {
  source: SOURCE_URL,
  standard: "ГОСТ Р 71918-2024",
  count: names.length,
  files: names
};
await fs.writeFile(path.join(OUT_DIR, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n", "utf8");

console.log(`Extracted ${names.length} normative images to ${OUT_DIR}`);
