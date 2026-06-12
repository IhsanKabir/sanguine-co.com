import { requirePermission } from "@/lib/auth-utils";
import { getAudioSettingsUncached } from "@/lib/audio-settings";
import AudioClient from "./AudioClient";

export const dynamic = "force-dynamic";

export default async function AdminAudioPage() {
  await requirePermission("settings");
  const settings = await getAudioSettingsUncached();
  return <AudioClient initial={settings} />;
}
