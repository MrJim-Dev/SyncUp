"use client";
import { check_permissions } from "@/lib/organization";
import { createClient } from "@/lib/supabase/client";
// import { EventProps } from "@/lib/types";
import { ArrowLongLeftIcon, ArrowLongRightIcon } from "@heroicons/react/20/solid";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import EventsCard from "./events_card";

interface OrganizationEventsComponentProps {
  events: any;
  userid: string;
  organizationId: string;
}

const OrganizationEventsComponent: React.FC<OrganizationEventsComponentProps> = ({
  events,
  userid,
  organizationId,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [isAdmin, setIsAdmin] = useState(false);
  const [organizationSlug, setOrganizationSlug] = useState<string | null>(null);
  const [canCreateEvents, setCanCreateEvents] = useState(false);
  const eventsPerPage = 6;
  const supabase = createClient();
  const router = useRouter();

  const indexOfLastEvent = currentPage * eventsPerPage;
  const indexOfFirstEvent = indexOfLastEvent - eventsPerPage;
  const currentEvents = events.slice(indexOfFirstEvent, indexOfLastEvent);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  const isFirstPage = currentPage === 1;
  const isLastPage = indexOfLastEvent >= events.length;

  useEffect(() => {
    const fetchOrganizationData = async () => {
      try {
        const { data: organization, error } = await supabase
          .from("organizations")
          .select("adminid, slug")
          .eq("organizationid", organizationId)
          .single();

        if (error) {
          throw error;
        }

        if (organization) {
          setOrganizationSlug(organization.slug);
          if (organization.adminid === userid) {
            setIsAdmin(true);
          }
        }
      } catch (error) {
        console.error("Failed to fetch organization data", error);
      }
    };

    fetchOrganizationData();
  }, [organizationId, userid]);

  useEffect(() => {
    const checkPermissions = async () => {
      try {
        const permission = await check_permissions(
          userid || "",
          organizationId,
          "create_events"
        );
        setCanCreateEvents(permission);
      } catch (error) {
        console.error("Failed to check permissions", error);
      }
    };

    checkPermissions();
  }, [userid, organizationId]);

  return (
    <div className="mx-auto max-w-7xl px-6 lg:px-8">
      <div className="mx-auto max-w-7xl text-center">
        <p className="mt-2 text-2xl font-bold tracking-tight text-light sm:text-2xl lg:mx-32 lg:px-96">
          Our Events
        </p>
      </div>

      <div className="my-4 text-right">
        {canCreateEvents && (
          <Link
            className="rounded-lg bg-primary px-4 py-2 text-white hover:bg-primarydark"
            href={`/events/create/${organizationSlug}`}
          >
            Create Event
          </Link>
        )}
      </div>

      <div className="isolate mx-auto mt-8 grid max-w-lg grid-cols-1 justify-items-center gap-x-1 gap-y-8 sm:mt-12 md:mx-auto md:max-w-lg md:grid-cols-2 md:gap-x-4 lg:mx-0 lg:max-w-none lg:grid-cols-4">
        {currentEvents.map((event: any, index: number) => (
          <EventsCard
            key={index}
            event={{
              id: event.eventid, // Add the missing 'id' property
              eventid: event.eventid, // Add the missing 'eventid' property
              eventphoto: event.eventphoto, // Add the missing 'eventphoto' property
              capacity: event.capacity, // Add the missing 'capacity' property
              organizationid: event.organizationid, // Add the missing 'organizationid' property
              imageUrl: event.eventphoto,
              title: event.title,
              description: event.description,
              registrationfee: event.registrationfee,
              starteventdatetime: event.starteventdatetime,
              endeventdatetime: event.endeventdatetime,
              location: event.location,
              eventslug: event.eventslug,
              tags: event.tags, // Add the missing 'tags' property
              privacy: event.privacy, // Add the missing 'privacy' property
              createdat: event.createdat, // Add the missing 'createdat' property
            }}
          />
        ))}
      </div>

      {currentEvents.length <= 0 && (
        <div
          className="mb-4 rounded-lg bg-gray-800 p-4 text-center text-sm text-blue-400"
          role="alert"
        >
          The organization has no events available for you.
        </div>
      )}
      <nav className="flex items-center justify-between border-t border-gray-200 px-4 sm:px-0">
        <div className="-mt-px flex w-0 flex-1">
          <button
            disabled={isFirstPage}
            onClick={() => paginate(currentPage - 1)}
            className={`inline-flex items-center border-t-2 border-transparent pr-1 pt-4 text-sm font-medium ${
              isFirstPage
                ? "cursor-not-allowed text-gray-500"
                : "text-light hover:border-primary hover:text-primary"
            }`}
          >
            <ArrowLongLeftIcon className="mr-3 h-5 w-5 text-light" aria-hidden="true" />
            Previous
          </button>
        </div>
        <div className="hidden md:-mt-px md:flex">
          {Array.from(
            { length: Math.ceil(events.length / eventsPerPage) },
            (_, index) => (
              <button
                key={index}
                onClick={() => paginate(index + 1)}
                className={`inline-flex items-center border-t-2 border-transparent px-4 pt-4 text-sm font-medium ${
                  currentPage === index + 1
                    ? "border-primarydark text-primary"
                    : "text-light hover:border-primary hover:text-primary"
                }`}
              >
                {index + 1}
              </button>
            )
          )}
        </div>
        <div className="-mt-px flex w-0 flex-1 justify-end">
          <button
            disabled={isLastPage}
            onClick={() => paginate(currentPage + 1)}
            className={`inline-flex items-center border-t-2 border-transparent pl-1 pt-4 text-sm font-medium ${
              isLastPage
                ? "cursor-not-allowed text-gray-500"
                : "text-light hover:border-primary hover:text-primary"
            }`}
          >
            Next
            <ArrowLongRightIcon className="ml-3 h-5 w-5 text-light" aria-hidden="true" />
          </button>
        </div>
      </nav>
    </div>
  );
};

export default OrganizationEventsComponent;
