import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "assets/**",
    "blobby/**",
    "public/**",
    "signals/**",
    "g/**",
    "gfonts/**",
    "isteam/**",
    "markup/**",
    "research/**",
    "scripts/**",
    "bls-cpr-1/**",
    "ceph-p3-01/**",
    "coronal-polish/**",
    "dental-assisting-program/**",
    "faqs-1/**",
    "front-office-program/**",
    "infection-control/**",
    "m/**",
    "meet-the-instructors/**",
    "photos/**",
    "radiation-safety/**",
    "registration/**",
    "resume-portal-dr-oms-only/**",
    "sealants/**",
  ]),
]);

export default eslintConfig;
