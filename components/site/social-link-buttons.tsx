import { SocialBrandLogo } from "@/components/site/social-brand-logo";
import type { SocialLink } from "@/lib/site-types";

type SocialLinkButtonsProps = {
  idScope?: string;
  links: readonly SocialLink[];
  variant: "footer" | "inline" | "nav";
};

export function SocialLinkButtons({ idScope, links, variant }: SocialLinkButtonsProps) {
  const iconIdScope = idScope ? `${variant}-${idScope}` : variant;

  return (
    <div className={`rda-social-buttons rda-social-buttons-${variant}`} aria-label="Social links">
      {links.map((link, index) => (
        <a
          aria-label={link.label}
          className={`rda-social-button rda-social-button-${link.icon}`}
          data-rda-social-button={link.icon}
          href={link.href}
          key={link.href}
          rel="noreferrer"
          target="_blank"
          title={link.label}
        >
          <span className="rda-social-button-icon" aria-hidden="true">
            <SocialBrandLogo
              idPrefix={`rda-social-${iconIdScope}-${link.icon}-${index}`}
              platform={link.icon}
            />
          </span>
          <span className="rda-social-button-label">{link.label}</span>
        </a>
      ))}
    </div>
  );
}
