import manifest from "@/lib/social-local-media-manifest.json";
import type { SocialChannelPost } from "@/lib/social-channel-data";

function instagramPost(shortcode: string): SocialChannelPost {
  const post = manifest.posts.find(
    (item) => item.platform === "instagram" && item.sourceUrl.includes(`/${shortcode}/`),
  );
  if (!post) throw new Error(`Missing academy media: ${shortcode}`);
  return post as SocialChannelPost;
}

export const academyClassPhotos = [
  instagramPost("DdNORlQOPke"),
  instagramPost("Ddcj-vSv65N"),
  instagramPost("DcJwsRChkzh"),
  instagramPost("Dc4nCx7B-bk"),
  {
    ...instagramPost("DYOKXdApx2M"),
    title: "Learning together in dental assisting",
    alt: "Roseville Dental Academy dental assisting students gathered outdoors in scrubs.",
  },
  {
    ...instagramPost("DXAUWC4Ese_"),
    title: "Continuing the journey with certifications",
    alt: "Roseville Dental Academy students gathered outdoors after returning for further training.",
  },
] as const;

export const academyTrainingVideos = [
  instagramPost("DdusCGsR_Ar"),
  instagramPost("DdIPod1NOtQ"),
  {
    ...instagramPost("DXXrGAKkqHB"),
    title: "What students learn in week three",
    alt: "Dental assisting students sharing their class takeaways inside the academy clinic.",
  },
  {
    ...instagramPost("DXKwHb3Eu9w"),
    title: "Learning and practicing together",
    alt: "Roseville Dental Academy students learning and practicing in the classroom.",
  },
  {
    ...instagramPost("DYA2WFOSI08"),
    title: "Students preparing for their next steps",
    alt: "Roseville Dental Academy dental assisting students gathered in the clinic with a student milestone message.",
  },
  {
    ...instagramPost("DXc7rAYjdGX"),
    title: "Meet Dr. Mike",
    alt: "Roseville Dental Academy's introduction to Dr. Mike in the dental office.",
  },
] as const;

export const academyTeamMedia = [instagramPost("DdS81OOBwxd"), academyTrainingVideos[5]] as const;
