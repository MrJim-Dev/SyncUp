"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import MembershipCard from "./membership_card";
import { PlusCircleIcon } from "@heroicons/react/24/outline";
import { RadioGroup } from "@headlessui/react";
import { Membership } from "@/types/membership";
import { Xendit, Invoice as InvoiceClient } from "xendit-node";
import { getUser } from "@/lib/supabase/client";
import type { CreateInvoiceRequest, Invoice } from "xendit-node/invoice/models";

import { useRouter } from "next/navigation";
import { recordActivity } from "@/lib/track";
import ReactDOM from 'react-dom';

const xenditClient = new Xendit({
  secretKey: process.env.NEXT_PUBLIC_XENDIT_SECRET_KEY!,
});
const { Invoice } = xenditClient;

const xenditInvoiceClient = new InvoiceClient({
  secretKey: process.env.NEXT_PUBLIC_XENDIT_SECRET_KEY!,
});

const supabase = createClient();

interface MembershipTiersProps {
  memberships: Membership[];
  userid?: string;
  organizationid: string;
  isAuthenticated?: boolean;
  onCreateClick?: () => void;
  onDelete?: (membershipId: string) => void;
  onEdit?: (membership: Membership) => void;
  editable?: boolean;
}

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

const MembershipTiers: React.FC<MembershipTiersProps> = ({
  memberships,
  userid,
  organizationid,
  isAuthenticated = false,
  onCreateClick = undefined,
  onDelete = () => {},
  onEdit = () => {},
  editable = false,
}) => {
  const [userMemberships, setUserMemberships] = useState<string[]>([]);
  const [currentMembershipId, setCurrentMembershipId] = useState<string | null>(null);
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pendingMembershipId, setPendingMembershipId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const processingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (userid) {
      fetchUserMemberships();
    }
  }, [userid]);

  const fetchUserMemberships = async () => {
    try {
      const { data: userMembershipsData, error } = await supabase
        .from("organizationmembers")
        .select("membershipid")
        .eq("userid", userid)
        .eq("organizationid", organizationid)
        .single(); // Use .single() to get a single record

      console.log("fetchmemberships", userMembershipsData);

      // Removed error handling for no rows found
      if (error && error.code !== 'PGRST116') { // Check for specific error code for no rows
        console.error("Error fetching user memberships: ", error);
        toast.error("Error fetching user memberships. Please try again later.");
        return;
      }

      // Check if userMembershipsData is not null and extract the membership ID
      const userMemberships = userMembershipsData ? [userMembershipsData.membershipid] : []; // Set to empty array if no data
      setUserMemberships(userMemberships);
      setCurrentMembershipId(userMemberships.length > 0 ? userMemberships[0] : null);
    } catch (error) {
      console.error("Error: ", error);
      toast.error("An error occurred. Please try again later.");
    }
  };

  const handleSubscribe = useCallback(
    async (membershipId: string) => {
      if (isProcessing) {
        toast.info("Please wait, your request is being processed.");
        return;
      }

      setIsProcessing(true);
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
      }

      processingTimeoutRef.current = setTimeout(() => {
        setIsProcessing(false);
      }, 5000); // Reset after 5 seconds

      try {
        // Check if the user is a member of the organization
        const { data: orgMember, error: orgMemberError } = await supabase
          .from("organizationmembers")
          .select("*")
          .eq("userid", userid)
          .eq("organizationid", organizationid)
          .single();

        if (orgMemberError || !orgMember) {
          console.error("User is not a member of this organization");
          toast.error("You must be a member of this organization to subscribe to a plan.");
          return;
        }
        
        if (orgMember.membershipid) {
          setIsModalOpen(true);
          setPendingMembershipId(membershipId);
          setIsProcessing(false);
          return;
        }

        // Proceed with subscription process
        await processSubscription(membershipId);

      } catch (error) {
        console.error("Error: ", error);
        toast.error("An error occurred. Please try again later.");
      } finally {
        setIsProcessing(false);
        if (processingTimeoutRef.current) {
          clearTimeout(processingTimeoutRef.current);
        }
      }
    },
    [userid, userMemberships, router, organizationid, isProcessing]
  );

  const processSubscription = async (membershipId: string) => {
    try {
      const { data: membershipData, error: membershipError } = await supabase
        .from("memberships")
        .select("registrationfee, name, description")
        .eq("membershipid", membershipId)
        .single();

      if (membershipError) {
        console.error("Error fetching membership details: ", membershipError);
        toast.error("Error fetching membership details. Please try again later.");
        return;
      }

      const {
        registrationfee: amount,
        name: membershipName,
        description: membershipDescription,
      } = membershipData;

      const { user } = await getUser();

      if (amount === 0) {
        const { data: userMembershipData, error: fetchError } = await supabase
          .from("organizationmembers")
          .select("*")
          .eq("userid", userid)
          .eq("organizationid", organizationid)
          .single();

        if (fetchError && fetchError.code !== "PGRST116") {
          console.error("Error fetching user membership: ", fetchError);
          toast.error("Error fetching user membership. Please try again later.");
          return;
        }

        const { data: rolesData, error: rolesError } = await supabase
          .from("organization_roles")
          .select("role_id")
          .eq("org_id", organizationid)
          .eq("role", "User")
          .single();

        if (rolesError) {
          console.error("Error fetching role ID: ", rolesError);
          return;
        }

        const defaultRoleId = rolesData?.role_id;

        if (userMembershipData) {
          const { error: updateError } = await supabase
            .from("organizationmembers")
            .update({ membershipid: membershipId })
            .eq("userid", userid)
            .eq("organizationid", organizationid);

          if (updateError) {
            console.error("Error updating membership ID: ", updateError);
            toast.error("Error updating membership. Please try again later.");
            return;
          }

          try {
            await recordActivity({
              organization_id: organizationid,
              activity_type: "membership_subscribe",
              description: `User has subscribed to the ${membershipName} membership.`,
            });

            await recordActivity({
              activity_type: "membership_subscribe",
              description: `User subscribed to the ${membershipName} membership.`,
            });
          } catch (error) {
            console.error("Error recording activity: ", error);
            toast.error(
              "Error recording subscription activity. Please try again later."
            );
          }

          toast.success("Membership updated successfully.");
        } else {
          const { error: insertError } = await supabase
            .from("organizationmembers")
            .insert([
              {
                userid: userid,
                membershipid: membershipId,
                organizationid: organizationid,
                roleid: defaultRoleId,
              },
            ]);

          if (insertError) {
            console.error("Error inserting membership: ", insertError);
            toast.error("Error inserting membership. Please try again later.");
            return;
          }

          try {
            await recordActivity({
              organization_id: organizationid,
              activity_type: "membership_subscribe",
              description: `User has subscribed to the ${membershipName} membership.`,
            });

            await recordActivity({
              activity_type: "membership_subscribe",
              description: `User subscribed to the ${membershipName} membership.`,
            });
          } catch (error) {
            console.error("Error recording activity: ", error);
            toast.error(
              "Error recording subscription activity. Please try again later."
            );
          }

         
          toast.success(
            "Congratulations! You've successfully purchased the membership."
          );
        }

      
        setUserMemberships((prevUserMemberships) => [
          ...prevUserMemberships,
          membershipId,
        ]);
        setCurrentMembershipId(membershipId);
      } else {
        let { data: orgData, error } = await supabase
          .from("organizations")
          .select("*")
          .eq("organizationid", organizationid)
          .single();

        const data: CreateInvoiceRequest = {
          amount: amount,
          externalId: `${userid}-${membershipId}-${new Date().toISOString()}`,
          description: `Payment for ${membershipName} membership in ${orgData.name}: ${membershipDescription}`,
          currency: "PHP",
          reminderTime: 1,
          successRedirectUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/${orgData.slug}?tab=membership`,
          payerEmail: user?.email ?? "",
        };

        const invoice: Invoice = await xenditInvoiceClient.createInvoice({
          data,
        });

        if (!invoice) {
          toast.error("Error creating invoice. Please try again later.");
          return;
          
        } else {
          // toast.success("Invoice created successfully.");

          const { data, error } = await supabase
            .from("payments")
            .insert([
              {
                amount: amount,
                organizationId: organizationid,
                invoiceId: invoice.id,
                type: "membership",
                invoiceUrl: invoice.invoiceUrl,
                invoiceData: invoice,
                target_id: membershipId,
              },
            ])
            .select();

          // console.log(data, error);

          if (error) {
            toast.error("Error saving invoice. Please try again later.");
          } else {
            // toast.error("Invoice saved successfully.");
            router.push(invoice.invoiceUrl);
          }
        }
      }
    } catch (error) {
      console.error("Error: ", error);
      toast.error("An error occurred. Please try again later.");
    }
  };

  const handleConfirmSubscriptionChange = async () => {
    if (pendingMembershipId) {
      await processSubscription(pendingMembershipId);
      setIsModalOpen(false);
      setPendingMembershipId(null);
    }
  };

  return (
    <div>
      <div id="pricing" className="pb-16">
        {userid && (
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-4xl text-center">
              <p className="mt-2 text-2xl font-bold tracking-tight text-light sm:text-2xl">
                Choose Your Membership
              </p>
            </div>
          </div>
        )}

        <div className="isolate mx-8 mt-8 flex flex-wrap justify-center gap-x-8 gap-y-8 sm:mt-10 lg:max-w-none">
          {memberships.length > 0 ? (
            memberships.map((membership, index) => (
              <MembershipCard
                key={membership.membershipid}
                membership={membership}
                index={index + 1}
                totalMemberships={memberships.length}
                userid={userid}
                isAuthenticated={isAuthenticated}
                userMemberships={userMemberships}
                handleSubscribe={handleSubscribe}
                handleEditMembership={onEdit}
                handleDeleteMembership={onDelete}
                editable={editable}
                isCurrentPlan={currentMembershipId === membership.membershipid}
                isProcessing={isProcessing}
              />
            ))
          ) : (
            <p className="w-full text-center text-white">
              No memberships available. Create one to get started!
            </p>
          )}
          {editable && (
            <div className="mr-16 w-full sm:w-64">
              <PlusCircleIcon
                className={classNames(
                  "size-80 min-w-80 rounded-3xl bg-raisinblack p-8 text-charleston text-opacity-50 outline-dashed outline-2 outline-primarydark hover:bg-eerieblack hover:text-opacity-100 focus-visible:outline-primary xl:p-10",
                  "h-full"
                )}
                onClick={onCreateClick}
                strokeWidth={2}
                stroke="currentColor"
              />
            </div>
          )}
        </div>
      </div>
      {isModalOpen && ReactDOM.createPortal(
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 shadow-lg max-w-sm w-full">
            <h2 className="text-lg font-semibold mb-4">Change Subscription</h2>
            <p>You are already subscribed to a membership. Are you sure you want to change your subscription? This will replace your current plan.</p>
            <div className="mt-4 flex justify-end">
              <button
                onClick={handleConfirmSubscriptionChange}
                className="mr-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primarydark"
              >
                Yes, Change Plan
              </button>
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-gray-300 text-black rounded-md hover:bg-gray-400"
              >
                No, Keep Current Plan
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
      <ToastContainer position="bottom-right" autoClose={3000} />
    </div>
  );
};

export default MembershipTiers;
