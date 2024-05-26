"use client";
import CreateEventForm from "@/components/create_event_form";
import { fetchEventById } from "@/lib/events";
import { check_permissions } from "@/lib/organization";
import { getUser } from "@/lib/supabase/client";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function EditEventPage() {
  const router = useRouter();
  const { eventId } = useParams(); // Assume eventId is part of the URL params
  const [event, setEvent] = useState(null); // State to hold the event data
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch event
        const eventResponse = await fetchEventById(eventId.toString()); // Convert eventId to string
        if (eventResponse.error) {
          setError(eventResponse.error.message);
          console.error(eventResponse.error);
        } else {
          setEvent(eventResponse.data);
          // console.log(eventResponse.data);
        }
      } catch (err) {
        console.error("Failed to fetch data:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
      }
    };

    if (eventId) {
      fetchData();
    }
    async function checkPermissions() {
      const { user } = await getUser();
      try {
        const events = await fetchEventById(eventId as string);
        if ("organizationid" in events.data) {
          const permission = await check_permissions(
            user?.id || "",
            events.data.organizationid,
            "edit_events"
          );
          setHasPermission(permission);
        }
      } catch (error) {
        console.error("Failed to check permissions", error);
      }
    }
    checkPermissions();
  }, [eventId]);

  if (!event || hasPermission == null) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-light">Loading...</h2>
        </div>
      </div>
    );
  }

  if (!hasPermission) {
    return (
      <div className="bg-raisin flex min-h-screen items-center justify-center p-10 font-sans text-white">
        <div className="text-center">
          <h1 className="mb-4 text-3xl">Event Modification</h1>
          <p className="text-lg">
            You do not have permission to modify events for this organization.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex min-h-full flex-1 flex-col justify-center bg-eerieblack px-6 py-12 lg:px-8">
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
            Edit this Event
          </h2>
        </div>
        <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-lg">
          <CreateEventForm organizationid="" event={event} />
        </div>
      </div>
    </>
  );
}
