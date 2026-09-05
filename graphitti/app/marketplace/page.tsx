import { redirect } from "next/navigation";

export default function MarketplaceRedirect() {
  redirect("/hub?tab=marketplace");
}
