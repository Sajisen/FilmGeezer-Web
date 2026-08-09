import { stat } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const currentFile = fileURLToPath(import.meta.url);
const currentDirectory = dirname(currentFile);
const repositoryRoot = resolve(currentDirectory, "../..");
const imageDirectory = join(
  repositoryRoot,
  "client",
  "src",
  "assets",
  "images",
);

const MAX_BANNER_WIDTH = 1920;
const WEBP_QUALITY = 82;

const banners = [
  ["home-banner2.png", "home-banner2.webp"],
  ["movies-banner.png", "movies-banner.webp"],
  ["tvseries-banner.png", "tvseries-banner.webp"],
  ["anime-banner.png", "anime-banner.webp"],
  ["kdrama-banner.png", "kdrama-banner.webp"],
];

function formatBytes(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KiB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MiB`;
}

async function optimizeBanner(inputName, outputName) {
  const inputPath = join(imageDirectory, inputName);
  const outputPath = join(imageDirectory, outputName);

  const inputStats = await stat(inputPath);

  const result = await sharp(inputPath)
    .rotate()
    .resize({
      width: MAX_BANNER_WIDTH,
      withoutEnlargement: true,
      fit: "inside",
    })
    .webp({
      quality: WEBP_QUALITY,
      effort: 6,
      smartSubsample: true,
    })
    .toFile(outputPath);

  const savedBytes = Math.max(0, inputStats.size - result.size);
  const savedPercent =
    inputStats.size > 0 ? (savedBytes / inputStats.size) * 100 : 0;

  console.log(
    `${inputName} -> ${outputName}: ` +
      `${formatBytes(inputStats.size)} -> ${formatBytes(result.size)} ` +
      `(${savedPercent.toFixed(1)}% smaller)`,
  );
}

async function main() {
  console.log(
    `Optimizing FilmGeezer page banners to WebP ` +
      `(max ${MAX_BANNER_WIDTH}px wide, quality ${WEBP_QUALITY})...`,
  );

  for (const [inputName, outputName] of banners) {
    await optimizeBanner(inputName, outputName);
  }

  console.log("Banner optimization complete.");
}

main().catch((error) => {
  console.error("Banner optimization failed.");

  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(String(error));
  }

  process.exitCode = 1;
});
