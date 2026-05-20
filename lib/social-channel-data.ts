import type { LiveRoute } from "@/lib/live-route-data";
import localSocialMediaManifest from "@/lib/social-local-media-manifest.json";
import { socialLinks } from "@/lib/site-data";
import type { SocialBrand } from "@/lib/site-types";

export type SocialChannelSlug = SocialBrand;

export const SOCIAL_IMPORT_REQUIRED_POSTS = 10;

export type SocialPostMediaType = "image" | "video";

export type SocialChannelPost = {
  alt: string;
  caption: string;
  comments?: number;
  label: string;
  likes?: number;
  localSrc: string;
  mediaType: SocialPostMediaType;
  platform: SocialChannelSlug;
  posterSrc?: string;
  publishedAt?: string;
  sourceUrl: string;
  title: string;
};

export type SocialChannelImportStatus = {
  checkedAt: string;
  errors?: string[];
  foundCount: number;
  message: string;
  requiredCount: number;
  sourceUrls: string[];
  status: "blocked" | "ready";
};

export type SocialChannelPageData = {
  audience: string;
  description: string;
  followLabel: string;
  heroAlt: string;
  heroImage: string;
  icon: SocialBrand;
  intro: string;
  metaTitle: string;
  name: string;
  path: `/${SocialChannelSlug}`;
  platform: string;
  profileHref: string;
  scrapeStatus: SocialChannelImportStatus;
  slug: SocialChannelSlug;
  socialPosts: SocialChannelPost[];
  tagline: string;
};

type LocalSocialMediaManifest = {
  posts: SocialChannelPost[];
  statuses: Record<SocialChannelSlug, SocialChannelImportStatus>;
};

const localSocialMedia = localSocialMediaManifest as LocalSocialMediaManifest;

function getProfileHref(label: string) {
  const match = socialLinks.find((link) => link.label === label);

  if (!match) {
    throw new Error(`Missing ${label} social link`);
  }

  return match.href;
}

function getLocalSocialPosts(platform: SocialChannelSlug) {
  return localSocialMedia.posts.filter((post) => post.platform === platform);
}

function getLocalSocialStatus(platform: SocialChannelSlug): SocialChannelImportStatus {
  return (
    localSocialMedia.statuses[platform] ?? {
      checkedAt: "",
      errors: [`Missing local media import status for ${platform}`],
      foundCount: 0,
      message: `${platform} local media import has not been generated.`,
      requiredCount: SOCIAL_IMPORT_REQUIRED_POSTS,
      sourceUrls: [],
      status: "blocked",
    }
  );
}

export const socialChannelPages: SocialChannelPageData[] = [
  {
    audience: "Best for academy announcements, class reminders, and community updates.",
    description:
      "Follow Roseville Dental Academy on Facebook for class announcements, student moments, and academy updates.",
    followLabel: "Follow on Facebook",
    heroAlt: "Roseville Dental Academy students holding completion certificates outside the academy.",
    heroImage: "/assets/live/drive/recent-certificates-banner.jpg",
    icon: "facebook",
    intro:
      "Facebook is the place to catch academy announcements, public reminders, and student milestones in one easy feed.",
    metaTitle: "Roseville Dental Academy on Facebook",
    name: "Roseville Dental Academy Facebook",
    path: "/facebook",
    platform: "Facebook",
    profileHref: getProfileHref("Facebook"),
    scrapeStatus: getLocalSocialStatus("facebook"),
    slug: "facebook",
    socialPosts: getLocalSocialPosts("facebook"),
    tagline: "Class reminders and academy news",
  },
  {
    audience: "Best for student photos, behind-the-scenes class moments, and visual updates.",
    description:
      "Follow Roseville Dental Academy on Instagram for student photos, hands-on training moments, and course updates.",
    followLabel: "Follow on Instagram",
    heroAlt: "Roseville Dental Academy students gathered for a class photo in scrubs.",
    heroImage: "/assets/live/drive/class-group-scrubs.jpg",
    icon: "instagram",
    intro:
      "Instagram highlights the academy visually: class photos, certificate moments, chairside practice, and the energy of students learning together.",
    metaTitle: "Roseville Dental Academy on Instagram",
    name: "Roseville Dental Academy Instagram",
    path: "/instagram",
    platform: "Instagram",
    profileHref: getProfileHref("Instagram"),
    scrapeStatus: getLocalSocialStatus("instagram"),
    slug: "instagram",
    socialPosts: getLocalSocialPosts("instagram"),
    tagline: "Photos and student moments",
  },
  {
    audience: "Best for short-form training clips, quick reminders, and high-energy class moments.",
    description:
      "Follow Roseville Dental Academy on TikTok for short-form training moments, class updates, and student life.",
    followLabel: "Follow on TikTok",
    heroAlt: "Dental assistant student practicing on a typodont during hands-on training.",
    heroImage: "/assets/live/drive/typodont-practice.jpg",
    icon: "tiktok",
    intro:
      "TikTok is built for quick looks at the academy in motion: skills practice, classroom energy, and reminders students can catch fast.",
    metaTitle: "Roseville Dental Academy on TikTok",
    name: "Roseville Dental Academy TikTok",
    path: "/tiktok",
    platform: "TikTok",
    profileHref: getProfileHref("TikTok"),
    scrapeStatus: getLocalSocialStatus("tiktok"),
    slug: "tiktok",
    socialPosts: getLocalSocialPosts("tiktok"),
    tagline: "Short-form class updates",
  },
];

export function getSocialChannelPage(slug: SocialChannelSlug) {
  return socialChannelPages.find((page) => page.slug === slug);
}

export function getSocialChannelRoute(page: SocialChannelPageData): LiveRoute {
  return {
    aliases: [],
    assetRoot: "",
    contentBaselinePath: "",
    description: page.description,
    htmlPath: "",
    id: page.slug,
    kind: "mirror",
    noindex: false,
    route: page.path,
    shellVariant: "public",
    sitemap: true,
    sourcePath: page.path,
    status: 200,
    title: page.metaTitle,
    visualBaselines: {},
    visualMasks: [],
    widgetSlots: [],
  };
}
