import { CheckIcon } from "@heroicons/react/20/solid";
import { TrashIcon } from "@heroicons/react/20/solid";
import { Membership } from "@/types/membership"; 
import { useState } from 'react';
import ReactDOM from 'react-dom';

import { createClient } from '@/lib/supabase/client';
import { useRouter } from "next/navigation";
import { recordActivity } from "@/lib/track";

const supabase = createClient();

interface MembershipCardProps {
  membership: Membership;
  index: number;
  totalMemberships: number;
  userid?: string;
  isAuthenticated: boolean;
  userMemberships: string[];
  handleSubscribe: (membershipId: string, organizationid: string) => void;
  handleEditMembership: (membership: Membership, organizationid: string) => void;
  handleDeleteMembership: (membershipId: string) => void;
  editable: boolean;
  isCurrentPlan: boolean;
  isProcessing: boolean;
}

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

const MembershipCard: React.FC<MembershipCardProps> = ({
  membership,
  index,
  totalMemberships,
  userid,
  isAuthenticated = false,
  userMemberships,
  handleSubscribe,
  handleEditMembership,
  handleDeleteMembership,
  editable = false,
  isCurrentPlan,
  isProcessing,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const isPurchased = userMemberships.includes(membership.membershipid);
  const router = useRouter();

  const registrationFee = membership.registrationfee;
  const isFree = registrationFee <= 0;

  const handleCancelPlan = async () => {
    const { data, error } = await supabase
      .from('organizationmembers')
      .update({ membershipid: null })
      .eq('membershipid', membership.membershipid)
      .eq('userid', userid);

    if (error) {
      console.error('Error updating membershipid to null:', error);
    } else {
      await recordActivity({
        activity_type: "membership_cancel",
        description: `User has cancelled the ${membership.name} membership.`,
      });
    }

    window.location.reload();
    setIsModalOpen(false);
  };

  return (
    <div
      key={membership.membershipid}
      className={classNames(
        membership.mostPopular
          ? "bg-white/5 ring-2 ring-primary"
          : "ring-1 ring-white/10",
        "max-w-sm bg-white/5 sm:w-auto rounded-3xl p-8 xl:p-10"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-center justify-between gap-x-4">
        <h3
          id={membership.membershipid}
          className="text-lg font-semibold leading-8 text-white"
        >
          {membership.name}
        </h3>
        {membership.mostPopular ? (
          <p className="rounded-full bg-primary px-2.5 py-1 text-xs font-semibold leading-5 text-white">
            Most popular
          </p>
        ) : null}
      </div>
      <p className="mt-4 text-sm leading-6 text-gray-300">{membership.description}</p>
      {isFree ? (
        <p className="mt-6 flex items-baseline gap-x-1">
          <span className="text-4xl font-bold tracking-tight text-white">Free</span>
        </p>
      ) : (
        <p className="mt-6 flex items-baseline justify-center gap-x-2">
          <span className="text-4xl font-bold tracking-tight text-white">
            Php {registrationFee.toFixed(2)}
          </span>
          <span className="text-sm font-semibold leading-6 text-gray-300">
            /{membership.cycletype === 'monthly' ? 'month' : 'year'}
          </span>
        </p>
      )}

      {userid ? (
        <button
          onClick={() => {
            if (isCurrentPlan && isHovered) {
              setIsModalOpen(true);
            } else if (!isProcessing) {
              handleSubscribe(
                membership.membershipid,
                membership.organizationid || ""
              );
            }
          }}
          aria-describedby={membership.membershipid}
          className={classNames(
            "mt-6 block w-full rounded-md px-3 py-2 text-center text-sm font-semibold leading-6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
            isCurrentPlan
              ? isHovered
                ? "bg-red-600 text-white"
                : "cursor-not-allowed bg-gray-300 text-white"
              : membership.mostPopular
                ? "bg-primary text-white shadow-sm hover:bg-primarydark focus-visible:outline-primary"
                : "bg-white/10 text-white hover:bg-white/20 focus-visible:outline-white",
            isProcessing ? "opacity-50 cursor-not-allowed" : ""
          )}
          disabled={isCurrentPlan && !isHovered || isProcessing}
        >
          {isProcessing
            ? "Processing..."
            : isCurrentPlan
              ? (isHovered ? "Cancel Plan" : "Current Plan")
              : isFree ? "Join Plan" : "Subscribe"}
        </button>
      ) : null}

      {/* Confirmation Modal */}
      {isModalOpen && ReactDOM.createPortal(
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 shadow-lg max-w-sm w-full">
            <h2 className="text-lg font-semibold mb-4">Cancel Plan</h2>
            <p>Are you sure you want to cancel your plan?</p>
            <div className="mt-4 flex justify-end">
              <button
                onClick={handleCancelPlan}
                className="mr-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Yes, Cancel
              </button>
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-gray-300 text-black rounded-md hover:bg-gray-400"
              >
                No, Keep Plan
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {editable ? (
        <div className="flex flex-row gap-2">
          <button
            aria-describedby={membership.membershipid}
            onClick={() =>
              handleEditMembership(membership, membership.organizationid || "")
            }
            className="mt-6 block w-full rounded-md bg-primary px-3 py-2 text-center text-sm font-semibold leading-6 text-white shadow-sm hover:bg-primarydark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            disabled={isProcessing}
          >
            Edit Membership
          </button>

          <button
            aria-describedby={membership.membershipid}
            onClick={() => handleDeleteMembership(membership.membershipid)}
            className="mt-6 block rounded-md bg-red-900 px-3 py-2 text-center text-sm font-semibold leading-6 text-white hover:bg-red-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-900"
            disabled={isProcessing}
          >
            <TrashIcon className="size-5 text-white"></TrashIcon>
          </button>
        </div>
      ) : null}

      <ul role="list" className="mt-8 space-y-3 text-sm leading-6 text-gray-300 xl:mt-10">
        {membership.features &&
          membership.features.map((feature) => (
            <li key={feature} className="flex gap-x-3">
              <CheckIcon className="h-6 w-5 flex-none text-primary" aria-hidden="true" />
              {feature}
            </li>
          ))}
      </ul>
    </div>
  );
};

export default MembershipCard;
