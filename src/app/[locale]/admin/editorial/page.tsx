import { getBrand } from "@/lib/actions/admin";
import { getCopyOverrides, flattenMessages } from "@/lib/copy";
import EditorialClient from "./EditorialClient";
import { requirePermission } from "@/lib/auth-utils";
import enMessages from "@/messages/en.json";
import bnMessages from "@/messages/bn.json";

export const dynamic = "force-dynamic";

export default async function AdminEditorialPage() {
  await requirePermission("editorial");

  // Defaults are the static JSON shipped with the build. They become the
  // placeholder text in the form and the fall-back when an override is empty.
  const defaultsEn = flattenMessages(enMessages as Record<string, unknown>);
  const defaultsBn = flattenMessages(bnMessages as Record<string, unknown>);

  const [overrides, brand] = await Promise.all([
    getCopyOverrides(),
    getBrand(),
  ]);

  return (
    <EditorialClient
      email={brand?.email ?? "concierge@saanguine.com"}
      defaultsEn={defaultsEn}
      defaultsBn={defaultsBn}
      overridesEn={overrides.en}
      overridesBn={overrides.bn}
    />
  );
}
