#!/usr/bin/env node

import { execFile } from "node:child_process";
import { createWriteStream } from "node:fs";
import { mkdir, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { basename, extname, join, resolve } from "node:path";
import { pipeline } from "node:stream/promises";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const REQUIRED_POSTS = 10;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_VIDEO_BYTES = 25 * 1024 * 1024;
const ROOT = process.cwd();
const PUBLIC_ROOT = resolve(ROOT, "public");
const ASSET_ROOT = resolve(PUBLIC_ROOT, "assets/social");
const MANIFEST_PATH = resolve(ROOT, "lib/social-local-media-manifest.json");
const SOURCE_PATH = resolve(ROOT, "data/social-post-sources.json");
const CHECKED_AT = new Date().toISOString();

const userAgents = {
  facebookMobile:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
  instagram:
    "Instagram 219.0.0.12.117 Android (30/11; 420dpi; 1080x1920; Google; Pixel 6; oriole; oriole; en_US)",
  web:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
};

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function localPublicPath(filePath) {
  return `/${filePath.replace(PUBLIC_ROOT, "").replace(/^\/+/, "")}`;
}

function trimCaption(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
}

function titleFromCaption(value, fallback) {
  const caption = trimCaption(value);

  if (!caption) {
    return fallback;
  }

  return caption
    .replace(/[#@][\w-]+/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 70) || fallback;
}

function toIso(seconds) {
  return typeof seconds === "number" ? new Date(seconds * 1000).toISOString() : undefined;
}

async function ensureDir(path) {
  await mkdir(path, { recursive: true });
}

async function resetDir(path) {
  await rm(path, { force: true, recursive: true });
  await ensureDir(path);
}

async function sizeOf(path) {
  return (await stat(path)).size;
}

async function fetchJsonWithCurl(url, headers = {}) {
  const args = [
    "-sSL",
    "--compressed",
    "--max-time",
    "30",
    "-A",
    headers["user-agent"] ?? userAgents.web,
  ];

  for (const [name, value] of Object.entries(headers)) {
    if (name.toLowerCase() !== "user-agent") {
      args.push("-H", `${name}: ${value}`);
    }
  }

  args.push(url);

  const { stdout } = await execFileAsync("curl", args, { maxBuffer: 32 * 1024 * 1024 });
  return JSON.parse(stdout);
}

async function downloadUrl(url, outputPath, maxBytes, headers = {}) {
  const response = await fetch(url, {
    headers: {
      "user-agent": headers["user-agent"] ?? userAgents.web,
      ...headers,
    },
    redirect: "follow",
  });

  if (!response.ok || !response.body) {
    throw new Error(`Download failed ${response.status} for ${url}`);
  }

  await pipeline(response.body, createWriteStream(outputPath));

  const bytes = await sizeOf(outputPath);

  if (bytes > maxBytes) {
    throw new Error(`${basename(outputPath)} is ${bytes} bytes, above ${maxBytes}`);
  }

  return bytes;
}

function extensionForContentType(contentType, fallback = ".jpg") {
  const normalized = String(contentType ?? "").toLowerCase();

  if (normalized.includes("image/webp")) {
    return ".webp";
  }

  if (normalized.includes("image/png")) {
    return ".png";
  }

  if (normalized.includes("image/jpeg") || normalized.includes("image/jpg")) {
    return ".jpg";
  }

  if (normalized.includes("video/mp4")) {
    return ".mp4";
  }

  return fallback;
}

async function downloadUrlWithDetectedExtension(url, outputBasePath, maxBytes, headers = {}) {
  const response = await fetch(url, {
    headers: {
      "user-agent": headers["user-agent"] ?? userAgents.web,
      ...headers,
    },
    redirect: "follow",
  });

  if (!response.ok || !response.body) {
    throw new Error(`Download failed ${response.status} for ${url}`);
  }

  const outputPath = `${outputBasePath}${extensionForContentType(response.headers.get("content-type"))}`;
  await pipeline(response.body, createWriteStream(outputPath));

  const bytes = await sizeOf(outputPath);

  if (bytes > maxBytes) {
    throw new Error(`${basename(outputPath)} is ${bytes} bytes, above ${maxBytes}`);
  }

  return outputPath;
}

async function discoverInstagram() {
  const data = await fetchJsonWithCurl(
    "https://www.instagram.com/api/v1/users/web_profile_info/?username=rosevilledentalacademy",
    {
      "user-agent": userAgents.instagram,
      "x-ig-app-id": "936619743392459",
    },
  );
  const edges = data?.data?.user?.edge_owner_to_timeline_media?.edges ?? [];

  return edges.slice(0, 12).map(({ node }, index) => {
    const isVideo = node.__typename === "GraphVideo" || node.is_video;
    const caption = trimCaption(node.edge_media_to_caption?.edges?.[0]?.node?.text);
    const shortcode = node.shortcode;
    const sourceUrl = `https://www.instagram.com/${isVideo ? "reel" : "p"}/${shortcode}/`;

    return {
      alt: `Roseville Dental Academy Instagram ${isVideo ? "video" : "photo"} ${index + 1}`,
      caption,
      comments: node.edge_media_to_comment?.count,
      id: shortcode,
      label: new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short" }).format(
        new Date(node.taken_at_timestamp * 1000),
      ),
      likes: node.edge_liked_by?.count,
      mediaType: isVideo ? "video" : "image",
      platform: "instagram",
      publishedAt: toIso(node.taken_at_timestamp),
      sourceMediaUrl: isVideo ? node.video_url : node.display_url,
      sourcePosterUrl: node.display_url || node.thumbnail_src,
      sourceUrl,
      title: titleFromCaption(caption, `Instagram post ${index + 1}`),
    };
  });
}

async function importInstagram() {
  const discovered = await discoverInstagram();
  const outputDir = resolve(ASSET_ROOT, "instagram");
  await resetDir(outputDir);
  const posts = [];
  const errors = [];

  for (const [index, item] of discovered.entries()) {
    try {
      const baseName = `${String(index + 1).padStart(2, "0")}-${slugify(item.id)}`;
      const mediaExt = item.mediaType === "video" ? ".mp4" : ".jpg";
      const mediaPath = join(outputDir, `${baseName}${mediaExt}`);
      const posterPath = join(outputDir, `${baseName}-poster.jpg`);

      await downloadUrl(
        item.sourceMediaUrl,
        mediaPath,
        item.mediaType === "video" ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES,
        { "user-agent": userAgents.web },
      );

      if (item.sourcePosterUrl) {
        await downloadUrl(item.sourcePosterUrl, posterPath, MAX_IMAGE_BYTES, {
          "user-agent": userAgents.web,
        });
      }

      posts.push({
        alt: item.alt,
        caption: item.caption,
        comments: item.comments,
        label: item.label,
        likes: item.likes,
        localSrc: localPublicPath(mediaPath),
        mediaType: item.mediaType,
        platform: "instagram",
        posterSrc: item.sourcePosterUrl ? localPublicPath(posterPath) : localPublicPath(mediaPath),
        publishedAt: item.publishedAt,
        sourceUrl: item.sourceUrl,
        title: item.title,
      });
    } catch (error) {
      errors.push(`${item.sourceUrl}: ${error.message}`);
    }
  }

  return {
    errors,
    posts,
    status: posts.length >= REQUIRED_POSTS ? "ready" : "blocked",
  };
}

async function ytDlpJson(args) {
  const { stdout } = await execFileAsync("uvx", ["--from", "yt-dlp", "yt-dlp", ...args], {
    maxBuffer: 64 * 1024 * 1024,
  });

  return stdout
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

async function discoverTikTok(sourceConfig) {
  const urls = sourceConfig.sourceUrls?.length
    ? sourceConfig.sourceUrls
    : [sourceConfig.profileUrl].filter(Boolean);
  const entries = [];

  for (const sourceUrl of urls) {
    const args = sourceUrl.includes("/video/")
      ? ["--dump-json", "--no-playlist", sourceUrl]
      : ["--flat-playlist", "--dump-json", "--playlist-end", "20", sourceUrl];
    const discovered = await ytDlpJson(args);

    for (const item of discovered) {
      const url = item.webpage_url || item.url || item.original_url;

      if (url?.includes("tiktok.com") && !entries.some((entry) => entry.sourceUrl === url)) {
        entries.push({
          alt: `Roseville Dental Academy TikTok video ${entries.length + 1}`,
          caption: trimCaption(item.description || item.title),
          comments: item.comment_count,
          id: item.id,
          label: item.upload_date
            ? new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short" }).format(
                new Date(
                  `${item.upload_date.slice(0, 4)}-${item.upload_date.slice(4, 6)}-${item.upload_date.slice(6, 8)}T00:00:00Z`,
                ),
              )
            : `TikTok ${entries.length + 1}`,
          likes: item.like_count,
          mediaType: "video",
          platform: "tiktok",
          publishedAt: item.timestamp ? toIso(item.timestamp) : undefined,
          sourceUrl: url,
          title: titleFromCaption(item.title || item.description, `TikTok video ${entries.length + 1}`),
        });
      }
    }
  }

  return entries.slice(0, 20);
}

async function findDownloadedFile(outputDir, id, extensions) {
  const files = await readdir(outputDir);
  const match = files.find((file) => file.startsWith(id) && extensions.includes(extname(file)));
  return match ? join(outputDir, match) : undefined;
}

async function removePartialDownloads(outputDir, baseName) {
  const files = await readdir(outputDir).catch(() => []);

  await Promise.all(
    files
      .filter((file) => file.startsWith(baseName))
      .map((file) => rm(join(outputDir, file), { force: true })),
  );
}

async function importTikTok(sourceConfig) {
  const outputDir = resolve(ASSET_ROOT, "tiktok");
  await resetDir(outputDir);
  const discovered = await discoverTikTok(sourceConfig);
  const posts = [];
  const errors = [];

  for (const [index, item] of discovered.entries()) {
    if (posts.length >= REQUIRED_POSTS) {
      break;
    }

    try {
      const baseName = `${String(index + 1).padStart(2, "0")}-${item.id}`;
      const outputTemplate = join(outputDir, `${baseName}.%(ext)s`);
      const { stdout } = await execFileAsync(
        "uvx",
        [
          "--from",
          "yt-dlp",
          "yt-dlp",
          "-f",
          "b[height<=720][ext=mp4]/best[height<=720][ext=mp4]/best[ext=mp4]/best",
          "--no-playlist",
          "--write-thumbnail",
          "--no-warnings",
          "--print",
          "after_move:filepath",
          "-o",
          outputTemplate,
          item.sourceUrl,
        ],
        { maxBuffer: 64 * 1024 * 1024 },
      );
      const mediaPath =
        stdout
          .split("\n")
          .map((line) => line.trim())
          .find((line) => line.endsWith(".mp4")) || (await findDownloadedFile(outputDir, baseName, [".mp4"]));
      let posterPath = await findDownloadedFile(outputDir, baseName, [
        ".jpg",
        ".jpeg",
        ".png",
        ".webp",
        ".image",
      ]);

      if (!mediaPath) {
        throw new Error("yt-dlp did not produce an MP4 file");
      }

      const mediaBytes = await sizeOf(mediaPath);

      if (mediaBytes > MAX_VIDEO_BYTES) {
        throw new Error(`${basename(mediaPath)} is ${mediaBytes} bytes, above ${MAX_VIDEO_BYTES}`);
      }

      if (posterPath?.endsWith(".image")) {
        const normalizedPosterPath = posterPath.replace(/\.image$/, ".jpg");
        await rename(posterPath, normalizedPosterPath);
        posterPath = normalizedPosterPath;
      }

      if (posterPath && (await sizeOf(posterPath)) > MAX_IMAGE_BYTES) {
        throw new Error(`${basename(posterPath)} is above poster size limit`);
      }

      posts.push({
        alt: item.alt,
        caption: item.caption,
        comments: item.comments,
        label: item.label,
        likes: item.likes,
        localSrc: localPublicPath(mediaPath),
        mediaType: "video",
        platform: "tiktok",
        posterSrc: posterPath ? localPublicPath(posterPath) : undefined,
        publishedAt: item.publishedAt,
        sourceUrl: item.sourceUrl,
        title: item.title,
      });
    } catch (error) {
      await removePartialDownloads(outputDir, `${String(index + 1).padStart(2, "0")}-${item.id}`);
      errors.push(`${item.sourceUrl}: ${error.message}`);
    }
  }

  return {
    errors,
    posts,
    status: posts.length >= REQUIRED_POSTS ? "ready" : "blocked",
  };
}

function facebookMobileProfileUrl(sourceConfig) {
  const profileUrl = sourceConfig.profileUrl || "https://www.facebook.com/rosevilledentalacademy/";

  try {
    const url = new URL(profileUrl);
    url.hostname = "m.facebook.com";
    url.pathname = url.pathname || "/rosevilledentalacademy/";
    return url.toString();
  } catch {
    return "https://m.facebook.com/rosevilledentalacademy/";
  }
}

function facebookMediaIdFromUrl(url) {
  const filename = url.split("?")[0].split("/").pop() ?? "";
  const match = filename.match(/^\d+_(\d+)_/);

  return match?.[1] ?? slugify(filename);
}

function facebookPostUrlFromMedia(item) {
  if (item.videoId) {
    return `https://www.facebook.com/rosevilledentalacademy/videos/${item.videoId}/`;
  }

  if (item.postId) {
    return `https://www.facebook.com/rosevilledentalacademy/posts/${item.postId}/`;
  }

  const mediaId = facebookMediaIdFromUrl(item.sourceMediaUrl);

  return mediaId
    ? `https://www.facebook.com/photo/?fbid=${mediaId}`
    : "https://www.facebook.com/rosevilledentalacademy/";
}

function facebookPublishedAtFromLabel(label) {
  const now = new Date(CHECKED_AT);
  const relative = label.match(/^(\d+)([dw])$/i);

  if (relative) {
    const amount = Number(relative[1]);
    const days = relative[2].toLowerCase() === "w" ? amount * 7 : amount;
    const date = new Date(now);
    date.setUTCDate(date.getUTCDate() - days);
    return date.toISOString();
  }

  const absolute = label.match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}$/i);

  if (absolute) {
    const candidate = new Date(`${label}, ${now.getUTCFullYear()} 12:00:00 UTC`);

    if (!Number.isNaN(candidate.valueOf())) {
      if (candidate > now) {
        candidate.setUTCFullYear(candidate.getUTCFullYear() - 1);
      }

      return candidate.toISOString();
    }
  }

  return undefined;
}

function cleanFacebookText(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .replace(/\s+\.\.\.\s+See more$/i, "")
    .replace(/\s+See more$/i, "")
    .trim();
}

async function discoverFacebook(sourceConfig) {
  const { chromium } = await import("playwright");
  const profileUrl = facebookMobileProfileUrl(sourceConfig);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    deviceScaleFactor: 3,
    hasTouch: true,
    isMobile: true,
    locale: "en-US",
    timezoneId: "America/Los_Angeles",
    userAgent: userAgents.facebookMobile,
    viewport: { height: 844, width: 390 },
  });
  const page = await context.newPage();

  try {
    await page.goto(profileUrl, { timeout: 45000, waitUntil: "domcontentloaded" });
    await page.waitForTimeout(8000);

    const { profilePhotos, timelinePosts } = await page.evaluate(() => {
      const clean = (value) =>
        String(value ?? "")
          .replace(/\s+/g, " ")
          .trim();
      const labelFromHeader = (block) => {
        const publicLabel = [...block.querySelectorAll("[aria-label]")]
          .map((node) => node.getAttribute("aria-label") ?? "")
          .find((value) => value.includes("Public"));

        if (!publicLabel) {
          return undefined;
        }

        const relative = publicLabel.match(/(\d+)\s+(day|week)s?\s+ago/i);

        if (relative) {
          return `${relative[1]}${relative[2].toLowerCase().startsWith("week") ? "w" : "d"}`;
        }

        return publicLabel.split(",")[0];
      };
      const mediaIdFromUrl = (url) => {
        const filename = url.split("?")[0].split("/").pop() ?? "";
        const match = filename.match(/^\d+_(\d+)_/);

        return match?.[1] ?? filename;
      };
      const isContentImage = (image) => {
        const src = image.currentSrc || image.src;
        const width = image.naturalWidth || 0;
        const height = image.naturalHeight || 0;

        return (
          (src.includes("scontent-") || src.includes("external-")) &&
          width >= 300 &&
          height >= 300 &&
          !src.includes("/t39.30808-1/") &&
          !src.includes("470991501_1326725708298478")
        );
      };
      const blocks = [...document.querySelectorAll("div.bg-s4.displayed")]
        .map((block) => {
          const rect = block.getBoundingClientRect();
          const mediaElement = block.querySelector("[data-video-id]");
          let videoExtra;
          let videoTracking;

          try {
            videoTracking = JSON.parse(mediaElement?.getAttribute("data-video-tracking") ?? "null");
          } catch {
            videoTracking = undefined;
          }

          try {
            videoExtra = JSON.parse(mediaElement?.getAttribute("data-extra") ?? "null");
          } catch {
            videoExtra = undefined;
          }

          const videoSource = (videoExtra?.dash_prefetch_representations?.representations ?? [])
            .filter(
              (representation) =>
                representation?.mime_type === "video/mp4" &&
                representation?.base_url &&
                Number(representation?.width) > 0 &&
                Number(representation?.width) <= 720,
            )
            .sort((a, b) => Number(b.width) - Number(a.width))[0]?.base_url;

          return {
            dateLabel: labelFromHeader(block),
            images: [...block.querySelectorAll("img")].filter(isContentImage).map((image) => ({
              alt: image.alt || image.getAttribute("aria-label") || "",
              id: mediaIdFromUrl(image.currentSrc || image.src),
              src: image.currentSrc || image.src,
            })),
            text: clean(block.innerText),
            top: rect.top,
            videoId: mediaElement?.getAttribute("data-video-id") ?? undefined,
            videoSource,
            postId: videoTracking?.top_level_post_id ?? videoTracking?.mf_story_key ?? undefined,
          };
        })
        .filter((block) => block.top > 1200)
        .sort((a, b) => a.top - b.top);
      const posts = [];
      let current;

      const commit = () => {
        if (!current?.media.length) {
          return;
        }

        const media = current.media[0];

        posts.push({
          alt: media.alt || `Roseville Dental Academy Facebook post ${posts.length + 1}`,
          caption: current.caption || "Recent Facebook update from Roseville Dental Academy.",
          id: current.postId || current.videoId || media.id || `facebook-${posts.length + 1}`,
          label: current.label,
          mediaType: current.videoSource ? "video" : "image",
          postId: current.postId,
          sourceMediaUrl: media.src,
          sourceVideoUrl: current.videoSource,
          title: current.caption || `Facebook post ${posts.length + 1}`,
          videoId: current.videoId,
        });
      };

      for (const block of blocks) {
        if (block.text.includes("There's more to see")) {
          break;
        }

        if (block.dateLabel && block.text.includes("Roseville Dental Academy")) {
          commit();
          current = {
            caption: "",
            label: block.dateLabel,
            media: [],
            postId: undefined,
            videoId: undefined,
            videoSource: undefined,
          };
          continue;
        }

        if (!current) {
          continue;
        }

        if (block.videoId) {
          current.videoId = block.videoId;
          current.videoSource = block.videoSource;
          current.postId = block.postId || current.postId;
        }

        if (block.images.length > 0) {
          current.media.push(...block.images);
        }

        if (
          block.text &&
          !block.text.includes("󰤦") &&
          !block.text.includes("󰍸") &&
          !block.text.includes("GIPHY") &&
          !/^\w+(?:\s+\w+)* and \d+ others/.test(block.text)
        ) {
          current.caption = current.caption ? `${current.caption} ${block.text}` : block.text;
        }
      }

      commit();

      const profilePhotos = [];
      const seenProfilePhotos = new Set(posts.map((post) => mediaIdFromUrl(post.sourceMediaUrl)));

      for (const image of document.querySelectorAll("img")) {
        if (!isContentImage(image)) {
          continue;
        }

        const src = image.currentSrc || image.src;
        const id = mediaIdFromUrl(src);

        if (seenProfilePhotos.has(id)) {
          continue;
        }

        seenProfilePhotos.add(id);
        profilePhotos.push({
          alt: image.alt || "Roseville Dental Academy Facebook photo",
          caption: "Recent photo from Roseville Dental Academy on Facebook.",
          id,
          label: "Facebook photo",
          mediaType: "image",
          sourceMediaUrl: src,
          title: `Facebook photo ${profilePhotos.length + 1}`,
        });

        if (profilePhotos.length >= 12) {
          break;
        }
      }

      return { profilePhotos, timelinePosts: posts };
    });

    const seenMediaIds = new Set(timelinePosts.map((post) => facebookMediaIdFromUrl(post.sourceMediaUrl)));
    const discovered = [...timelinePosts];

    for (const photo of profilePhotos) {
      const mediaId = facebookMediaIdFromUrl(photo.sourceMediaUrl);

      if (seenMediaIds.has(mediaId)) {
        continue;
      }

      seenMediaIds.add(mediaId);
      discovered.push(photo);

      if (discovered.length >= REQUIRED_POSTS) {
        break;
      }
    }

    if (discovered.length < REQUIRED_POSTS) {
      await page.goto(`${profileUrl.replace(/\/$/, "")}/photos/`, {
        timeout: 45000,
        waitUntil: "domcontentloaded",
      });
      await page.waitForTimeout(5000);

      const photoPosts = await page.evaluate(() => {
        const mediaIdFromUrl = (url) => {
          const filename = url.split("?")[0].split("/").pop() ?? "";
          const match = filename.match(/^\d+_(\d+)_/);

          return match?.[1] ?? filename;
        };

        return [...document.querySelectorAll("img")]
          .map((image) => ({
            alt: image.alt || "Roseville Dental Academy Facebook photo",
            id: mediaIdFromUrl(image.currentSrc || image.src),
            sourceMediaUrl: image.currentSrc || image.src,
          }))
          .filter(
            (image) =>
              image.sourceMediaUrl.includes("scontent-") &&
              !image.sourceMediaUrl.includes("/t39.30808-1/") &&
              !image.sourceMediaUrl.includes("470991501_1326725708298478"),
          );
      });

      for (const photo of photoPosts) {
        const mediaId = facebookMediaIdFromUrl(photo.sourceMediaUrl);

        if (seenMediaIds.has(mediaId)) {
          continue;
        }

        seenMediaIds.add(mediaId);
        discovered.push({
          alt: photo.alt,
          caption: "Recent photo from Roseville Dental Academy on Facebook.",
          id: mediaId,
          label: "Facebook photo",
          mediaType: "image",
          sourceMediaUrl: photo.sourceMediaUrl,
          title: `Facebook photo ${discovered.length + 1}`,
        });

        if (discovered.length >= REQUIRED_POSTS) {
          break;
        }
      }
    }

    return discovered.slice(0, REQUIRED_POSTS).map((post, index) => ({
      alt: post.alt || `Roseville Dental Academy Facebook post ${index + 1}`,
      caption: cleanFacebookText(post.caption),
      id: post.id || `facebook-${index + 1}`,
      label: post.label || `Facebook ${index + 1}`,
      mediaType: post.mediaType || "image",
      platform: "facebook",
      publishedAt: facebookPublishedAtFromLabel(post.label || ""),
      sourceMediaUrl: post.sourceMediaUrl,
      sourceVideoUrl: post.sourceVideoUrl,
      sourceUrl: facebookPostUrlFromMedia(post),
      title: titleFromCaption(post.title || post.caption, `Facebook post ${index + 1}`),
    }));
  } finally {
    await browser.close();
  }
}

async function importFacebook(sourceConfig) {
  const outputDir = resolve(ASSET_ROOT, "facebook");
  const sourceUrls = sourceConfig.sourceUrls ?? [];

  await resetDir(outputDir);

  try {
    const discovered = await discoverFacebook(sourceConfig);
    const posts = [];
    const errors = [];

    for (const [index, item] of discovered.entries()) {
      try {
        const baseName = `${String(index + 1).padStart(2, "0")}-${slugify(item.id)}`;
        const posterPath = await downloadUrlWithDetectedExtension(
          item.sourceMediaUrl,
          join(outputDir, `${baseName}-poster`),
          MAX_IMAGE_BYTES,
          { "user-agent": userAgents.facebookMobile },
        );
        const mediaPath =
          item.mediaType === "video" && item.sourceVideoUrl
            ? await downloadUrlWithDetectedExtension(
                item.sourceVideoUrl,
                join(outputDir, baseName),
                MAX_VIDEO_BYTES,
                { "user-agent": userAgents.facebookMobile },
              )
            : posterPath;

        posts.push({
          alt: item.alt,
          caption: item.caption,
          label: item.label,
          localSrc: localPublicPath(mediaPath),
          mediaType: item.mediaType,
          platform: "facebook",
          posterSrc: localPublicPath(posterPath),
          publishedAt: item.publishedAt,
          sourceUrl: item.sourceUrl,
          title: item.title,
        });
      } catch (error) {
        errors.push(`${item.sourceUrl}: ${error.message}`);
      }
    }

    if (posts.length >= REQUIRED_POSTS) {
      return {
        errors,
        posts,
        status: "ready",
      };
    }

    if (errors.length > 0 && sourceUrls.length < REQUIRED_POSTS) {
      return {
        errors,
        posts,
        status: "blocked",
      };
    }
  } catch (error) {
    if (sourceUrls.length < REQUIRED_POSTS) {
      return {
        errors: [`Facebook public mobile discovery failed: ${error.message}`],
        posts: [],
        status: "blocked",
      };
    }
  }

  if (sourceUrls.length < REQUIRED_POSTS) {
    return {
      errors: [
        `Facebook source manifest has ${sourceUrls.length} post URLs; ${REQUIRED_POSTS} are required before import.`,
      ],
      posts: [],
      status: "blocked",
    };
  }

  const posts = [];
  const errors = [];

  for (const [index, sourceUrl] of sourceUrls.entries()) {
    if (posts.length >= REQUIRED_POSTS) {
      break;
    }

    const baseName = `${String(index + 1).padStart(2, "0")}-${slugify(sourceUrl)}`;

    try {
      const metadata = (await ytDlpJson(["--dump-json", "--no-playlist", sourceUrl]))[0] ?? {};
      const outputTemplate = join(outputDir, `${baseName}.%(ext)s`);
      const { stdout } = await execFileAsync(
        "uvx",
        [
          "--from",
          "yt-dlp",
          "yt-dlp",
          "-f",
          "b[height<=720][ext=mp4]/best[height<=720][ext=mp4]/best[ext=mp4]/best",
          "--no-playlist",
          "--write-thumbnail",
          "--no-warnings",
          "--print",
          "after_move:filepath",
          "-o",
          outputTemplate,
          sourceUrl,
        ],
        { maxBuffer: 64 * 1024 * 1024 },
      );
      const mediaPath =
        stdout
          .split("\n")
          .map((line) => line.trim())
          .find((line) => line.endsWith(".mp4")) || (await findDownloadedFile(outputDir, baseName, [".mp4"]));
      let posterPath = await findDownloadedFile(outputDir, baseName, [
        ".jpg",
        ".jpeg",
        ".png",
        ".webp",
        ".image",
      ]);

      if (!mediaPath) {
        throw new Error("yt-dlp did not produce an MP4 file");
      }

      const mediaBytes = await sizeOf(mediaPath);

      if (mediaBytes > MAX_VIDEO_BYTES) {
        throw new Error(`${basename(mediaPath)} is ${mediaBytes} bytes, above ${MAX_VIDEO_BYTES}`);
      }

      if (posterPath?.endsWith(".image")) {
        const normalizedPosterPath = posterPath.replace(/\.image$/, ".jpg");
        await rename(posterPath, normalizedPosterPath);
        posterPath = normalizedPosterPath;
      }

      if (posterPath && (await sizeOf(posterPath)) > MAX_IMAGE_BYTES) {
        throw new Error(`${basename(posterPath)} is above poster size limit`);
      }

      const caption = trimCaption(metadata.description || metadata.title);

      posts.push({
        alt: `Roseville Dental Academy Facebook video ${index + 1}`,
        caption,
        comments: metadata.comment_count,
        label: metadata.upload_date
          ? new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short" }).format(
              new Date(
                `${metadata.upload_date.slice(0, 4)}-${metadata.upload_date.slice(4, 6)}-${metadata.upload_date.slice(6, 8)}T00:00:00Z`,
              ),
            )
          : `Facebook ${index + 1}`,
        likes: metadata.like_count,
        localSrc: localPublicPath(mediaPath),
        mediaType: "video",
        platform: "facebook",
        posterSrc: posterPath ? localPublicPath(posterPath) : undefined,
        publishedAt: metadata.timestamp ? toIso(metadata.timestamp) : undefined,
        sourceUrl,
        title: titleFromCaption(caption, `Facebook video ${index + 1}`),
      });
    } catch (error) {
      await removePartialDownloads(outputDir, baseName);
      errors.push(`${sourceUrl}: ${error.message}`);
    }
  }

  return {
    errors,
    posts,
    status: posts.length >= REQUIRED_POSTS ? "ready" : "blocked",
  };
}

function statusFor(platform, result, sourceUrls = []) {
  return {
    checkedAt: CHECKED_AT,
    errors: result.errors,
    foundCount: result.posts.length,
    message:
      result.status === "ready"
        ? `${platform} local media import produced ${result.posts.length} playable posts.`
        : `${platform} local media import is blocked until ${REQUIRED_POSTS} downloadable posts are available.`,
    requiredCount: REQUIRED_POSTS,
    sourceUrls,
    status: result.status,
  };
}

async function main() {
  const sourceConfig = JSON.parse(await readFile(SOURCE_PATH, "utf8"));
  await ensureDir(ASSET_ROOT);

  const instagram = await importInstagram();
  const tiktok = await importTikTok(sourceConfig.tiktok ?? {});
  const facebook = await importFacebook(sourceConfig.facebook ?? {});
  const statuses = {
    facebook: statusFor("Facebook", facebook, sourceConfig.facebook?.sourceUrls ?? []),
    instagram: statusFor("Instagram", instagram, ["https://www.instagram.com/rosevilledentalacademy/"]),
    tiktok: statusFor("TikTok", tiktok, [
      ...(sourceConfig.tiktok?.sourceUrls ?? []),
      sourceConfig.tiktok?.profileUrl,
    ].filter(Boolean)),
  };
  const manifest = {
    checkedAt: CHECKED_AT,
    minimumPostsPerPlatform: REQUIRED_POSTS,
    posts: [...facebook.posts, ...instagram.posts, ...tiktok.posts],
    statuses,
  };
  const blockers = Object.fromEntries(
    Object.entries(statuses)
      .filter(([, status]) => status.status !== "ready")
      .map(([platform, status]) => [platform, status.message]),
  );

  await writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  console.log(
    JSON.stringify(
      {
        blockers,
        manifestPath: MANIFEST_PATH,
        status: statuses,
        totalPosts: manifest.posts.length,
        wroteManifest: true,
      },
      null,
      2,
    ),
  );

  if (Object.keys(blockers).length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
