import { fplGet } from "@/lib/fpl/client";

type BootstrapStatic = {
  events?: unknown;
  elements?: unknown;
};

export async function testFantasyPremierLeague(
  _credentials: Record<string, string>
) {
  try {
    const data = await fplGet<BootstrapStatic>("/bootstrap-static/");
    if (!(Array.isArray(data.events) && Array.isArray(data.elements))) {
      return {
        success: false,
        error: "FPL bootstrap-static did not return events and elements arrays",
      };
    }
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
