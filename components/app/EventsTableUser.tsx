"use client";
import { Event, Organization } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useState } from "react";
import EventOptions from "./event_options"; // Assuming you have EventOptions component

export default function EventsTableUser({
  organization,
  events,
}: {
  organization: Organization;
  events: Event[];
}) {
  const router = useRouter();

  // Redirect to the create event page for the selected organization
  const handleCreateEvent = () => {
    router.push(`/events/create/${organization.slug}`);
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="justify-between sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-base font-semibold leading-6 text-light">Events</h1>
          <p className="mt-2 text-sm text-light">
            A list of all the events including their title, date and time, location,
            registration fee, capacity, and privacy.
          </p>
        </div>
        <div className="mt-4 sm:flex sm:items-center sm:space-x-2">
          {/* Create event button */}
          <button
            onClick={handleCreateEvent}
            className="rounded-md bg-primary px-4 py-2 text-sm text-white hover:bg-primarydark"
          >
            Create Event
          </button>
        </div>
      </div>

      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
              <table className="min-w-full divide-y divide-[#525252]">
                <thead className="bg-charleston">
                  <tr>
                    <th
                      scope="col"
                      className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-light sm:pl-6"
                    >
                      Title
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-light"
                    >
                      Date & Time
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-light"
                    >
                      Location
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-light"
                    >
                      Registration Fee
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-light"
                    >
                      Capacity
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-light"
                    >
                      Privacy
                    </th>
                    <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                      <span className="sr-only">Edit</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#525252] bg-raisinblack">
                  {events.map((event, index) => (
                    <EventRow key={index} event={event} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EventRow({ event }: { event: Event }) {
  const [open, setOpen] = useState(false);
  // Convert eventdatetime to PST
  const formattedDateTime = (utcDateString: string) => {
    const date = new Date(utcDateString);
    return date.toLocaleString("en-US", {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  // Call the formattedDateTime function with the event's datetime
  const eventDateTimePST = formattedDateTime(event.eventdatetime.toString());
  return (
    <tr key={event.id}>
      <td
        className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-light sm:pl-6"
        onClick={() => setOpen(!open)}
      >
        <a href="#" className="hover:text-primary" onClick={() => setOpen(!open)}>
          {event.title}
        </a>
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-sm text-light">
        {eventDateTimePST}
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-sm text-light">{event.location}</td>
      <td className="whitespace-nowrap px-3 py-4 text-sm text-light">
        {event.registrationfee || "N/A"}
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-sm text-light">
        {event.capacity || "N/A"}
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-sm text-light">{event.privacy}</td>
      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
        <EventOptions selectedEvent={event} open={open} setOpen={setOpen} />
      </td>
    </tr>
  );
}
