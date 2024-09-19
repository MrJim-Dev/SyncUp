import { createClient } from "@/lib/supabase/client";
import AnalyticsDashboard from "@/components/dashboard/analytics";
import RequestsTable from "@/components/organization/requests_table";
import { fetchOrganizationBySlug } from "@/lib/organization";
import DeleteButton from "@/components/organization/delete_button";
import ActivityFeed from "@/components/acitivty_feed";

const supabase = createClient();

async function fetchOrganizationRequests(organizationId: string) {
  const { data, error } = await supabase
    .from("organization_requests_view")
    .select("*")
    .eq("organizationid", organizationId);

  if (error) {
    console.error("Error fetching organization requests:", error);
    return [];
  } else {
    console.log("Fetched requests:", data); // Log the fetched data
    if (data && data.length > 0) {
      // Check if the data is not empty
      console.log("Data is not empty");
      data.forEach((request, index) => {
        console.log(`Request ${index + 1}:`, request);
      });
      return data;
    } else {
      console.log("No requests found for this organization");
      return [];
    }
  }
}

async function fetchOrganizationActivities(organizationId: string) {
  const { data, error } = await supabase
    .from("activities")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    console.error("Error fetching organization activities:", error);
    return [];
  }
  return data || [];
}

export default async function SettingsPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const { data: organization, error } = await fetchOrganizationBySlug(slug);

  if (error || !organization) {
    return <div>Error loading organization data</div>;
  }

  const organizationRequests = await fetchOrganizationRequests(
    organization.organizationid
  );

  const activities = await fetchOrganizationActivities(organization.organizationid);

  return (
    <div className="min-h-full flex-1 flex-col justify-center bg-eerieblack px-6 py-12 lg:px-8">
      <AnalyticsDashboard organizationid={organization.organizationid} />
      <div className="flex flex-col gap-4">
        <div className=" max-w-lg rounded-lg bg-charleston p-4 text-light">
          <h2 className="mb-4 text-lg font-bold text-light">Recent Activities</h2>
          {activities && activities.length > 0 ? (
            <ActivityFeed activities={activities} />
          ) : (
            <p>No activities yet</p>
          )}
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <a
          className="border-1 rounded-md border border-primary bg-primarydark p-1 px-2 text-sm text-gray-100 hover:cursor-pointer"
          href={`/${slug}/dashboard/edit`}
        >
          Edit Organization
        </a>
        <DeleteButton organizationId={organization.organizationid} />
      </div>
      <div className="mt-8">
        <RequestsTable requests={organizationRequests} />
      </div>
    </div>
  );
}
