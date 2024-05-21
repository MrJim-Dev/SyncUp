"use client";
import CreateMembershipForm from "@/components/memberships/create_membership_form";
import CreateOrganizationForm from "@/components/create_organization_form";
import { fetchOrganizationBySlug } from "@/lib/organization";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { StepsProvider } from "react-step-builder";

export default function Example() {
  const router = useRouter();

  const { slug } = useParams();

  const [organization, setOrganization] = useState(null);
  const [error, setError] = useState(null);
const [showModal, setShowModal] = useState(false);
  
  useEffect(() => {
    const fetchOrganization = async () => {
      try {
        const { data, error } = await fetchOrganizationBySlug(slug);
        if (error) {
          setError(error);
          console.error(error);
        } else {
          setOrganization(data);
        }
      } catch (err) {
        console.error("Failed to fetch organization:", err);
        setError(err.message);
      }
    };

    if (slug) {
      fetchOrganization();
    }
  }, [slug]);

  if (!organization) {
    return <div>Loading...</div>;
  }


  

  return (
    <>
      <div className="flex min-h-full flex-1 flex-col justify-center bg-eerieblack px-6 py-12  lg:px-8">
        <div className="fixed top-10 text-gray-100 hover:cursor-pointer">
          <a
            onClick={() => router.back()}
            className=" flex items-center gap-2 hover:opacity-80"
          >
            <ArrowLeftIcon className="h-5 w-5" /> Back
          </a>
        </div>

        <div className="sm:mx-auto sm:w-full sm:max-w-sm">
          <img className="mx-auto h-10 w-auto" src="/Symbian.png" alt="SyncUp" />
          <h2 className="mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-white">
            Create a Membership
          </h2>
        </div>

        <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-lg">
          <StepsProvider>
            {/* <CreateOrganizationForm formValues={formValues} /> */}
            <CreateMembershipForm organizationId={organization.organizationid} />
          </StepsProvider>
        </div>
      </div>
    </>
  );
}
