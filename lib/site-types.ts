export type SiteButtonVariant =
  | "default"
  | "secondary"
  | "outline"
  | "ghost"
  | "link";

export type LinkItem = {
  label: string;
  href: string;
};

export type SocialLink = LinkItem & {
  icon: string;
};

export type CtaLink = LinkItem & {
  variant: SiteButtonVariant;
  analyticsKey: string;
};

export type NavChild = LinkItem & {
  description?: string;
};

export type NavGroup = {
  label: string;
  href?: string;
  description?: string;
  children?: readonly NavChild[];
};

export type FooterSection = {
  title: string;
  links: readonly LinkItem[];
};

export type ProgramCardData = {
  title: string;
  type: string;
  price: string;
  summary: string;
  href: string;
  media: string;
  analyticsKey: string;
  icon: string;
};

export type TestimonialData = {
  name: string;
  meta: string;
  rating: number;
  quote: string;
};

export type StatCardData = {
  title: string;
  value: string;
  summary: string;
  icon: string;
};

export type FeatureItem = {
  title: string;
  summary: string;
  icon?: string;
  href?: string;
  ctaLabel?: string;
};

export type RequirementGroup = {
  title: string;
  items: readonly string[];
  copy?: string;
};

export type GalleryGroup = {
  title: string;
  copy: string;
  items: readonly {
    src: string;
    alt: string;
  }[];
};

export type RegistrationCourseOption = {
  key: string;
  label: string;
  price: string;
  note: string;
  icon: string;
};

export type AuthField = {
  id: string;
  label: string;
  type: "email" | "password" | "tel" | "text" | "textarea";
};

export type HeroContent = {
  eyebrow: string;
  title: string;
  intro: string;
  image: string;
  imageAlt: string;
  pills: readonly string[];
  actions: readonly CtaLink[];
  panel: {
    title: string;
    copy: string;
    items: readonly string[];
  };
};

export type SplitSectionContent = {
  title: string;
  eyebrow: string;
  copy: readonly string[];
  image: string;
  imageAlt: string;
  reverse?: boolean;
  supporting?: {
    title: string;
    copy?: readonly string[];
    list?: readonly string[];
    actions?: readonly CtaLink[];
  };
};

export type CoursePageData = {
  slug: string;
  title: string;
  description: string;
  hero: HeroContent;
  infoSection: SplitSectionContent;
  requirementsTitle: string;
  requirementsEyebrow: string;
  requirementsCopy: string;
  requirements: readonly RequirementGroup[];
  ribbon: {
    title: string;
    copy: string;
    actions: readonly CtaLink[];
  };
};

export type AuthPageData = {
  slug: string;
  title: string;
  description: string;
  hero: HeroContent;
  cardTitle: string;
  cardCopy: string;
  fields: readonly AuthField[];
  note: string;
  actions: readonly CtaLink[];
  supportTitle: string;
  supportCopy: readonly string[];
  noIndex?: boolean;
};

export type SitePageDefinition = {
  slug: string;
  title: string;
  description: string;
  kind:
    | "home"
    | "registration"
    | "program"
    | "front-office"
    | "course"
    | "faq"
    | "instructors"
    | "photos"
    | "portal"
    | "auth";
  noIndex?: boolean;
};
