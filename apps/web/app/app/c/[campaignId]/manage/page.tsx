import { redirect } from "next/navigation";

/** The former standalone Manage-campaign screen — merged into the tabbed
 *  campaign Settings dialog (Players & Invites tab). Old links land there. */
export default async function ManageCampaignPage({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const { campaignId } = await params;
  redirect(`/journal/c/${campaignId}/settings`);
}
