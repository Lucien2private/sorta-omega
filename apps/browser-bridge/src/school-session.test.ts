import { describe, expect, it } from "vitest";
import { missingSchoolTabError } from "./school-session.js";

describe("missing school session", () => {
  it.each(["inschool", "inschool-attendance", "inschool-assessments"])("reports Feide sign-in for %s", provider => {
    expect(missingSchoolTabError(provider, ["https://idp.feide.no/simplesaml/module.php/core/loginuserpass.php?private=value"])).toBe("inschool_login_required");
  });
  it("does not confuse Feide with a Teams sign-in or trust a lookalike host", () => {
    expect(missingSchoolTabError("teams-assignments", ["https://idp.feide.no/"])).toBe("browser_bridge_matching_signed_in_tab_not_found");
    expect(missingSchoolTabError("inschool", ["https://idp.feide.no.example.org/"])).toBe("browser_bridge_matching_signed_in_tab_not_found");
  });
  it("reports Microsoft sign-in without exposing any URL or token", () => {
    expect(missingSchoolTabError("teams-powerpoints", ["https://login.microsoftonline.com/auth?code=private"])).toBe("teams_login_required");
    expect(missingSchoolTabError("teams-chats", ["not a url"])).toBe("browser_bridge_matching_signed_in_tab_not_found");
  });
});
