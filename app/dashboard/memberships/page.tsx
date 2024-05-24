import OrganizationsTable from "@/components/app/OrganizationsTable";
import UsersTable from "@/components/app/UsersTable";
import { createClient, getUser } from "@/lib/supabase/server";
import MembershipsTable from "@/components/memberships/MembershipsTable";
import MembershipTiers from "@/components/memberships/membership_tiers";

export default async function MembershipsPage() {
  const { user } = await getUser();
  const supabase = createClient();

  let organizationsQuery = supabase.from("organizations_memberships_view").select("*");

  if (user?.role !== "superadmin") {
    organizationsQuery = organizationsQuery.eq("adminid", user?.id);
  }

  const { data: organizations_memberships_view, error: orgsMemError } =
    (await organizationsQuery) ?? [];

  if (orgsMemError) {
    console.error("Error fetching organizations:", orgsMemError);
  }

  return <MembershipsTable orgsMemView={organizations_memberships_view || []} />;
}
