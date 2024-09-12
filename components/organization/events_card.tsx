"use client";
import { countRegisteredUsers } from "@/lib/events";
import { createClient, getUser } from "@/lib/supabase/client";
import { Event } from "@/types/event";
import { UserGroupIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Swal from "sweetalert2";

import Link from "next/link";

const EventsCard = ({ event }: { event: Event }) => {
  const {
    eventid,
    imageUrl,
    title,
    description,
    registrationfee,
    location,
    starteventdatetime,
    endeventdatetime,
    capacity,
    eventslug,
    privacy,
  } = event;
  const hasImageUrl = !!imageUrl; // Check if imageUrl is provided
  const truncatedDescription =
    description.length > 250 ? `${description.slice(0, 245)}...` : description;

  const router = useRouter(); // Next.js router for navigation

  const formattedDateTime = (utcDateString: string) => {
    // Create a Date object from the UTC date string
    const date = new Date(utcDateString);

    // Format the PST date
    return date.toLocaleString("en-US", {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  // Determine if the location is a URL and create a clickable link
  const locationContent =
    location && location.startsWith("http") ? "Virtual Event" : location;

  // Define the base URL for your Supabase storage bucket
  const supabaseStorageBaseUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public`;

  const handleEventRegistration = async () => {
    // Initialize Supabase client
    const supabase = createClient();

    // Confirmation dialog with SweetAlert
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, join the event!",
    });

    if (result.isConfirmed) {
      // Retrieve the current user's data
      const { user } = await getUser();
      const userId = user?.id;

      // Check if the user data is retrieved successfully
      if (!userId) {
        console.error("User not found");
        toast.error("User not found. Please log in.");
        return;
      }

      const { data, error } = await supabase.from("eventregistrations").insert([
        {
          eventid: event.eventid,
          // organizationmemberid: userId,
          registrationdate: new Date().toISOString(),
          status: "registered",
        },
      ]);

      if (error) {
        console.error("Registration failed:", error);
        toast.error("Registration failed. Please try again.");
      } else {
        // console.log("Registration successful:", data);
        toast.success("You have successfully joined the event!");
        // Additional logic after successful registration (e.g., close dialog, show message)
      }
    }
  };

  // State to store the count of registered users
  const [registeredCount, setRegisteredCount] = useState(0);

  // Function to fetch and set the count of registered users
  const fetchRegisteredCount = async () => {
    const { count, error } = await countRegisteredUsers(event.eventid);
    if (error) {
      toast.error("Failed to fetch the number of registered users.");
      console.error("Error fetching registered count:", error);
    } else {
      setRegisteredCount(count ?? 0);
    }
  };

  // Format date and time
  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    };
    return new Date(dateString).toLocaleDateString("en-US", options);
  };

  // Format registration fee
  const formatFee = (fee: number) => {
    return fee && fee > 0 ? `Php ${parseFloat(fee.toString()).toFixed(2)}` : "Free";
  };

  // Determine the display text for the number of attendees
  const attendeesDisplay =
    event.capacity > 0
      ? `${registeredCount} attendees / ${event.capacity}`
      : `${registeredCount} attendees`;

  // Call fetchRegisteredCount when the component mounts
  useEffect(() => {
    fetchRegisteredCount();
  }, []);

  // Function to determine the event status
  const getEventStatus = () => {
    const now = new Date();
    const start = new Date(starteventdatetime);
    const end = new Date(endeventdatetime);

    if (now < start) {
      return "Open";
    } else if (now >= start && now <= end) {
      return "Ongoing";
    } else {
      return "Closed";
    }
  };

  const handleCardClick = () => {
    router.push(`/e/${event.eventslug}`);
  };

  return (
    <Link
      href={`/e/${event.eventslug}`}
      className="mb-4 flex w-full max-w-sm flex-col overflow-hidden rounded-md bg-eerieblack transition duration-100 hover:scale-[1.01] hover:bg-raisinblack sm:w-64 md:w-72 lg:w-64 xl:w-72"
    >
      <div className="relative h-40 w-full overflow-hidden">
        {imageUrl ? (
          <img
            src={`${supabaseStorageBaseUrl}/${imageUrl}`}
            alt={title}
            className="h-full w-full rounded-t-lg object-cover"
          />
        ) : (
          <div className="h-full w-full rounded-t-lg bg-fadedgrey" />
        )}
        <div className="absolute right-2 top-2 flex space-x-2">
          <span
            className={`rounded-full bg-opacity-75 px-2 py-1 text-xs font-medium shadow-2xl ${
              privacy === "public" ? "bg-green-500 text-white" : "bg-red-500 text-white"
            }`}
          >
            {privacy === "public" ? "Public" : "Members only"}
          </span>
          <span
            className={`rounded-full bg-opacity-75 px-2 py-1 text-xs font-medium shadow-2xl ${
              getEventStatus() === "Open"
                ? "bg-green-500 text-white"
                : getEventStatus() === "Ongoing"
                  ? "bg-yellow-500 text-white"
                  : "bg-red-500 text-white"
            }`}
          >
            {getEventStatus()}
          </span>
        </div>
      </div>
      <div className="flex flex-grow flex-col justify-between p-4 text-left">
        <div>
          <h3 className="line-clamp-2 text-lg font-semibold text-light">{title}</h3>
          <p className="mt-2 text-sm text-light">
            {`${formatDate(starteventdatetime.toString())} - ${formatDate(
              endeventdatetime.toString()
            )}`}
          </p>
          <p className="line-clamp-1 text-sm text-light">{locationContent}</p>
          <p className="mt-2 inline-block rounded-full border border-primary px-3 py-1 text-sm font-medium text-light">
            {formatFee(registrationfee)}
          </p>
        </div>
        <div className="mt-3 flex items-center text-sm text-light">
          <UserGroupIcon className="mr-2 h-5 w-5 text-primary" aria-hidden="true" />
          <span>{registeredCount} attendees</span>
        </div>
      </div>
    </Link>
  );
};

export default EventsCard;
