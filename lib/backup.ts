import { api } from "./api-client";

// Full-farm JSON export — the rebuild's equivalent of the prototype's
// localStorage exportData(). Admin-only (gated by the caller); fetches every
// entity fresh rather than relying on whatever's already cached in React Query,
// since the user may be sitting on the Dashboard without having visited every
// section yet.
export async function exportFarmBackup(): Promise<void> {
  const [
    finance,
    poultry,
    eggs,
    incubations,
    poultryHealth,
    vegetables,
    vegetableHealth,
    rabbits,
    rabbitPairings,
    dogs,
    dogHeats,
  ] = await Promise.all([
    api.get("finance"),
    api.get("poultry"),
    api.get("eggs"),
    api.get("incubations"),
    api.get("poultry-health"),
    api.get("vegetables"),
    api.get("vegetable-health"),
    api.get("rabbits"),
    api.get("rabbit-pairings"),
    api.get("dogs"),
    api.get("dog-heats"),
  ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    finance,
    poultry,
    eggs,
    incubations,
    poultryHealth,
    vegetables,
    vegetableHealth,
    rabbits,
    rabbitPairings,
    dogs,
    dogHeats,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ravia-backup-${new Date().toISOString().split("T")[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
