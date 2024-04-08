import StatisticSection from "@/components/app/Statistics";
import { getUser } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const { user } = await getUser();

  return (
    <>
      <StatisticSection />
      {/* <pre>{JSON.stringify(user, null, 2)}</pre> */}
    </>
  );
}