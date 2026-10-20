export function missingSchoolTabError(provider: string, urls: string[]): string {
  const origins = urls.flatMap(value => { try { return [new URL(value).origin]; } catch { return []; } });
  if (provider.startsWith("inschool") && origins.includes("https://idp.feide.no")) return "inschool_login_required";
  if (provider.startsWith("teams") && origins.includes("https://login.microsoftonline.com")) return "teams_login_required";
  return "browser_bridge_matching_signed_in_tab_not_found";
}
