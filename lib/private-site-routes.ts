/** Private academy tools do not participate in marketing measurement. */
export function isPrivateSiteRoute(pathname: string | null | undefined) {
  const path = (pathname || "").split(/[?#]/, 1)[0];
  return ["/student-jobs", "/enrollment-pilot", "/api/student-jobs", "/api/enrollment"].some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}
