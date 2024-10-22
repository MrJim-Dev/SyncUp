"use server";

import { createClient } from "@/lib/supabase/server";

export async function insertEvent(formData: any, organizationid: string) {
  const {
    certificate_enabled,
    release_option,
    scheduled_release_date,
    certificate_background,
    signatories,
    discounts,
    ...eventData
  } = formData;

  // Prepare data for the events table
  const insertValues = {
    title: eventData.title,
    description: eventData.description,
    starteventdatetime: eventData.starteventdatetime,
    endeventdatetime: eventData.endeventdatetime,
    location: eventData.location,
    capacity: eventData.capacity,
    registrationfee: eventData.registrationfee,
    onsite: eventData.onsite,
    privacy: eventData.privacy,
    organizationid: organizationid,
    eventphoto: eventData.eventphoto,
    tags: eventData.tags,
    eventslug: eventData.eventslug,
  };

  const supabase = createClient();
  try {
    // Insert into events table
    const { data: eventDataInserted, error } = await supabase
      .from("events")
      .insert([insertValues])
      .select();

    if (error) {
      console.error("Error inserting event:", error);
      return {
        data: null,
        error: { message: error.message || "An unknown error occurred" },
      };
    }

    if (!eventDataInserted || eventDataInserted.length === 0) {
      return {
        data: null,
        error: { message: "Event insertion failed" },
      };
    }

    const eventId = eventDataInserted[0].eventid;

    // Handle event_certificate_settings insertion
    if (certificate_enabled) {
      const certificateSettings = {
        event_id: eventId,
        certificate_enabled,
        release_option,
        scheduled_release_date,
        certificate_background,
      };
      const { error: certError } = await supabase
        .from("event_certificate_settings")
        .insert(certificateSettings);
      if (certError) {
        console.error("Error inserting certificate settings:", certError);
        return { data: null, error: { message: certError.message } };
      }
    }

    // Handle event_signatories insertion
    if (signatories && signatories.length > 0) {
      const signatoryInserts = signatories.map((signatory: any) => ({
        event_id: eventId,
        name: signatory.name,
        signature: signatory.signature,
        position: signatory.position,
      }));
      const { error: signatoryError } = await supabase
        .from("event_signatories")
        .insert(signatoryInserts);
      if (signatoryError) {
        console.error("Error inserting signatories:", signatoryError);
        return { data: null, error: { message: signatoryError.message } };
      }
    }

    // Handle event_discounts insertion
    if (discounts && discounts.length > 0) {
      const discountInserts = discounts.map((discount: any) => ({
        eventid: eventId,
        role: discount.roles,
        membership_tier: discount.memberships,
        discount_percent: discount.discount,
      }));
      const { error: discountError } = await supabase
        .from("event_discounts")
        .insert(discountInserts);
      if (discountError) {
        console.error("Error inserting discounts:", discountError);
        return { data: null, error: { message: discountError.message } };
      }
    }

    return { data: eventDataInserted, error: null };
  } catch (e: any) {
    console.error("Unexpected error:", e);
    return {
      data: null,
      error: { message: e.message || "An unexpected error occurred" },
    };
  }
}

export async function updateEvent(eventId: string, formData: any) {
  const {
    certificate_enabled,
    release_option,
    scheduled_release_date,
    certificate_background,
    signatories,
    discounts,
    ...eventData
  } = formData;
  // console.log("Form data:", formData);

  // Exclude fields that should not be updated
  const { eventid, organizationid, createdat, adminid, ...updateValues } = eventData;

  // Convert date fields to ISO strings
  if (updateValues.starteventdatetime) {
    updateValues.starteventdatetime = new Date(
      updateValues.starteventdatetime
    ).toISOString();
  }
  if (updateValues.endeventdatetime) {
    updateValues.endeventdatetime = new Date(updateValues.endeventdatetime).toISOString();
  }

  // Ensure numerical fields are numbers
  if (updateValues.capacity !== undefined && updateValues.capacity !== null) {
    updateValues.capacity = Number(updateValues.capacity);
  }
  if (
    updateValues.registrationfee !== undefined &&
    updateValues.registrationfee !== null
  ) {
    updateValues.registrationfee = Number(updateValues.registrationfee);
  }

  // Remove undefined values
  Object.keys(updateValues).forEach(
    (key) => updateValues[key] === undefined && delete updateValues[key]
  );

  const supabase = createClient();
  try {
    // Update the event
    const { data: eventDataUpdated, error } = await supabase
      .from("events")
      .update(updateValues)
      .eq("eventid", eventId)
      .select();

    if (error) {
      console.error("Error updating event:", error);
      return {
        data: null,
        error: { message: error.message || "An unknown error occurred" },
      };
    }

    if (!eventDataUpdated || eventDataUpdated.length === 0) {
      return {
        data: null,
        error: { message: "Event update failed" },
      };
    }

    // Handle discounts
    const { error: deleteDiscountError } = await supabase
      .from("event_discounts")
      .delete()
      .eq("eventid", eventId);
    if (deleteDiscountError) {
      console.error("Error deleting old discounts:", deleteDiscountError);
      return { data: null, error: { message: deleteDiscountError.message } };
    }

    if (discounts && discounts.length > 0) {
      const discountInserts = discounts.map((discount: any) => ({
        eventid: eventId,
        role: discount.roles,
        membership_tier: discount.memberships,
        discount_percent: discount.discount,
      }));
      const { error: discountError } = await supabase
        .from("event_discounts")
        .insert(discountInserts);
      if (discountError) {
        console.error("Error inserting new discounts:", discountError);
        return { data: null, error: { message: discountError.message } };
      }
    }

    // Handle certificate settings
    if (certificate_enabled) {
      const certificateSettings = {
        event_id: eventId,
        certificate_enabled,
        release_option,
        scheduled_release_date,
        certificate_background,
      };
      const { error: certError } = await supabase
        .from("event_certificate_settings")
        .upsert(certificateSettings, { onConflict: "event_id" });
      if (certError) {
        console.error("Error inserting/updating certificate settings:", certError);
        return { data: null, error: { message: certError.message } };
      }
    } else {
      const { error: certDeleteError } = await supabase
        .from("event_certificate_settings")
        .delete()
        .eq("event_id", eventId);
      if (certDeleteError) {
        console.error("Error deleting certificate settings:", certDeleteError);
        return { data: null, error: { message: certDeleteError.message } };
      }
    }

    // Handle signatories
    // Delete existing signatories
    const { error: deleteSignatoriesError } = await supabase
      .from("event_signatories")
      .delete()
      .eq("event_id", eventId);
    if (deleteSignatoriesError) {
      console.error("Error deleting existing signatories:", deleteSignatoriesError);
      return { data: null, error: { message: deleteSignatoriesError.message } };
    }

    // Insert new signatories
    if (signatories && signatories.length > 0) {
      const signatoryInserts = signatories.map((signatory: any) => ({
        event_id: eventId,
        name: signatory.name,
        signature: signatory.signature,
        position: signatory.position,
      }));
      const { error: signatoryError } = await supabase
        .from("event_signatories")
        .insert(signatoryInserts);
      if (signatoryError) {
        console.error("Error inserting signatories:", signatoryError);
        return { data: null, error: { message: signatoryError.message } };
      }
    }

    return { data: eventDataUpdated, error: null };
  } catch (e: any) {
    console.error("Unexpected error:", e);
    return {
      data: null,
      error: { message: e.message || "An unexpected error occurred" },
    };
  }
}

export async function fetchEvents(organizationid: string) {
  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("organizationid", organizationid)
      .order("createdat", { ascending: false });

    if (!error) {
      return { data, error: null };
    } else {
      return {
        data: null,
        error: { message: error?.message || "An unknown error occurred" },
      };
    }
  } catch (e: any) {
    console.error("Unexpected error:", e);
    return {
      data: null,
      error: { message: e.message || "An unexpected error occurred" },
    };
  }
}

export async function fetchEventById(eventId: string) {
  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from("events")
      .select(
        `
        *,
        event_certificate_settings (
          certificate_enabled,
          release_option,
          scheduled_release_date,
          certificate_background
        )
      `
      )
      .eq("eventid", eventId)
      .single();

    if (!error && data) {
      type EventData = typeof data & {
        event_certificate_settings?: {
          certificate_enabled?: boolean;
          release_option?: string;
          scheduled_release_date?: string;
          certificate_background?: string;
        };
      };

      const flattenedData: EventData = {
        ...data,
        certificate_enabled:
          data.event_certificate_settings?.certificate_enabled || false,
        release_option: data.event_certificate_settings?.release_option || null,
        scheduled_release_date:
          data.event_certificate_settings?.scheduled_release_date || null,
        certificate_background:
          data.event_certificate_settings?.certificate_background || null,
      };
      delete flattenedData.event_certificate_settings;
      return { data: flattenedData, error: null };
    } else {
      return { data: null, error: { message: error?.message || "Event not found" } };
    }
  } catch (e: any) {
    console.error("Unexpected error:", e);
    return {
      data: null,
      error: { message: e.message || "An unexpected error occurred" },
    };
  }
}

export async function deleteEvent(eventId: string) {
  const supabase = createClient();

  try {
    const { data: eventData, error: fetchError } = await supabase
      .from("events")
      .select("eventphoto")
      .eq("eventid", eventId)
      .single();

    if (fetchError) {
      return { data: null, error: { message: fetchError.message } };
    }

    const { data, error: deleteError } = await supabase
      .from("events")
      .delete()
      .eq("eventid", eventId);

    if (deleteError) {
      return { data: null, error: { message: deleteError.message } };
    }

    // Check if eventData.eventphoto exists before processing
    if (eventData.eventphoto) {
      const fileName = eventData.eventphoto.split("/").pop();

      const { error: storageError } = await supabase.storage
        .from("event-images")
        .remove([fileName]);

      if (storageError) {
        console.error("Error deleting event photo:", storageError.message);
        return {
          data,
          error: {
            message:
              "Event deleted, but failed to delete event photo: " + storageError.message,
          },
        };
      }
    }

    return { data, error: null };
  } catch (e: any) {
    console.error("Unexpected error:", e);
    return {
      data: null,
      error: { message: e.message || "An unexpected error occurred" },
    };
  }
}

export async function countRegisteredUsers(eventId: string) {
  const supabase = createClient();
  try {
    const { data, error, count } = await supabase
      .from("eventregistrations")
      .select("*", { count: "exact" })
      .eq("eventid", eventId)
      .in("status", ["registered", "pending"]);

    if (!error) {
      return { count, error: null };
    } else {
      return { count: null, error: { message: error.message } };
    }
  } catch (e: any) {
    console.error("Unexpected error:", e);
    return {
      count: null,
      error: { message: e.message || "An unexpected error occurred" },
    };
  }
}

export async function getEventBySlug(slug: string) {
  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("slug", slug)
      .single();

    if (!error && data) {
      return { data, error: null };
    } else {
      return { data: null, error: { message: error?.message || "Event not found" } };
    }
  } catch (e: any) {
    console.error("Unexpected error:", e);
    return {
      data: null,
      error: { message: e.message || "An unexpected error occurred" },
    };
  }
}

export async function registerForEvent(
  eventId: string,
  userId: string,
  paymentMethod: "onsite" | "offsite"
) {
  const supabase = createClient();

  try {
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("privacy, organizationid, onsite")
      .eq("eventid", eventId)
      .single();

    if (eventError || !event) {
      return { data: null, error: { message: eventError?.message || "Event not found" } };
    }

    const registrationStatus = paymentMethod === "onsite" ? "pending" : "registered";

    if (event.privacy === "private") {
      const { data: membership, error: membershipError } = await supabase
        .from("organizationmembers")
        .select("organizationmemberid")
        .eq("userid", userId)
        .eq("organizationid", event.organizationid)
        .single();

      if (membershipError || !membership) {
        return {
          data: null,
          error: { message: "User is not a member of the organization" },
        };
      }

      const organizationMemberId = membership.organizationmemberid;

      const { data: registrationData, error: registrationError } = await supabase
        .from("eventregistrations")
        .insert([
          {
            eventid: eventId,
            organizationmemberid: organizationMemberId,
            registrationdate: new Date().toISOString(),
            status: registrationStatus,
            userid: userId,
          },
        ]);

      if (registrationError) {
        return { data: null, error: { message: registrationError.message } };
      }

      if (registrationData) {
        const { data: certificateSettings, error: certSettingsError } = await supabase
          .from("event_certificate_settings")
          .select("*")
          .eq("event_id", eventId)
          .single();

        if (
          certificateSettings?.certificate_enabled &&
          certificateSettings.release_option === "immediate"
        ) {
          await supabase.from("certificates").insert({
            event_id: eventId,
            user_id: userId,
            release_status: "released",
          });
        }
      }

      if (registrationData) {
        const { data: certificateSettings, error: certSettingsError } = await supabase
          .from("event_certificate_settings")
          .select("*")
          .eq("event_id", eventId)
          .single();

        if (
          certificateSettings?.certificate_enabled &&
          certificateSettings.release_option === "immediate"
        ) {
          await supabase.from("certificates").insert({
            event_id: eventId,
            user_id: userId,
            release_status: "released",
          });
        }
      }

      return { data: registrationData, error: null };
    } else {
      const { data: registrationData, error: registrationError } = await supabase
        .from("eventregistrations")
        .insert([
          {
            eventid: eventId,
            registrationdate: new Date().toISOString(),
            status: registrationStatus,
            userid: userId,
          },
        ]);

      if (registrationError) {
        return { data: null, error: { message: registrationError.message } };
      }

      return { data: registrationData, error: null };
    }
  } catch (e: any) {
    console.error("Unexpected error:", e);
    return {
      data: null,
      error: { message: e.message || "An unexpected error occurred" },
    };
  }
}

export async function checkUserRegistration(eventId: string, userId: string) {
  const supabase = createClient();

  try {
    const { data: registration, error } = await supabase
      .from("eventregistrations")
      .select("status")
      .eq("eventid", eventId)
      .eq("userid", userId)
      .single();

    if (error && error.code !== "PGRST116") {
      throw error;
    }

    const isRegistered =
      registration?.status === "registered" || registration?.status === "pending";
    return { isRegistered, error: null };
  } catch (e: any) {
    console.error("Unexpected error:", e);
    return {
      isRegistered: false,
      error: { message: e.message || "An unexpected error occurred" },
    };
  }
}

export async function checkEventPrivacyAndMembership(eventId: string, userId: string) {
  const supabase = createClient();

  try {
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("privacy, organizationid")
      .eq("eventid", eventId)
      .single();

    if (eventError || !event) {
      throw new Error(eventError?.message || "Event not found");
    }

    if (event.privacy === "public") {
      return { isMember: true, error: null };
    }

    const { data: membership, error: membershipError } = await supabase
      .from("organizationmembers")
      .select("organizationmemberid")
      .eq("userid", userId)
      .eq("organizationid", event.organizationid)
      .single();

    if (membershipError && membershipError.code !== "PGRST116") {
      throw membershipError;
    }

    const isMember = !!membership;
    return { isMember, error: null };
  } catch (e: any) {
    console.error("Unexpected error:", e);
    return {
      isMember: false,
      error: { message: e.message || "An unexpected error occurred" },
    };
  }
}

export async function unregisterFromEvent(eventId: string, userId: string) {
  const supabase = createClient();

  try {
    const { data, error } = await supabase
      .from("eventregistrations")
      .delete()
      .eq("eventid", eventId)
      .eq("userid", userId);

    if (error) {
      throw error;
    }

    return { data, error: null };
  } catch (e: any) {
    console.error("Unexpected error:", e);
    return {
      data: null,
      error: { message: e.message || "An unexpected error occurred" },
    };
  }
}

export async function fetchRegisteredUsersForEvent(eventId: string) {
  const supabase = createClient();

  try {
    const { data: registrations, error: registrationsError } = await supabase
      .from("eventregistrations_view")
      .select("userid")
      .eq("eventid", eventId)
      .in("attendance", ["present", "late"]);

    if (registrationsError) {
      throw registrationsError;
    }

    const userIds = registrations.map((registration: any) => registration.userid);

    const { data: users, error: usersError } = await supabase
      .from("userprofiles")
      .select("userid, first_name, last_name, profilepicture")
      .in("userid", userIds);

    if (usersError) {
      throw usersError;
    }

    return { users, error: null };
  } catch (error: any) {
    console.error("Error fetching registered users:", error);
    return {
      users: null,
      error: { message: error.message || "An unexpected error occurred" },
    };
  }
}

export async function fetchEventsForUser(userId: string) {
  const supabase = createClient();

  try {
    const { data: registrations, error: registrationsError } = await supabase
      .from("eventregistrations")
      .select("eventid")
      .eq("userid", userId);

    if (registrationsError) {
      throw registrationsError;
    }

    const eventIds = registrations.map((registration: any) => registration.eventid);

    if (eventIds.length === 0) {
      return { data: [], error: null };
    }

    const { data: events, error: eventsError } = await supabase
      .from("events")
      .select("*")
      .in("eventid", eventIds);

    if (eventsError) {
      throw eventsError;
    }

    return { data: events, error: null };
  } catch (error: any) {
    console.error("Error fetching events for user:", error);
    return {
      data: null,
      error: { message: error.message || "An unexpected error occurred" },
    };
  }
}

export async function isEventFull(eventId: string) {
  const supabase = createClient();
  try {
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("capacity")
      .eq("eventid", eventId)
      .single();

    if (eventError || !event) {
      throw new Error(eventError?.message || "Event not found");
    }

    const { count, error: registrationError } = await supabase
      .from("eventregistrations")
      .select("*", { count: "exact" })
      .eq("eventid", eventId)
      .eq("status", "registered");

    if (registrationError) {
      throw new Error(registrationError.message);
    }

    const isFull = count !== null && count >= event.capacity;
    return { isFull, error: null };
  } catch (e: any) {
    console.error("Unexpected error:", e);
    return {
      isFull: false,
      error: { message: e.message || "An unexpected error occurred" },
    };
  }
}

export async function checkMembership(userId: string, organizationid: string) {
  const supabase = createClient();

  try {
    const { data: membership, error } = await supabase
      .from("organizationmembers")
      .select("organizationmemberid")
      .eq("userid", userId)
      .eq("organizationid", organizationid)
      .single();

    if (error && error.code !== "PGRST116") {
      throw error;
    }

    const isMember = !!membership;
    return { isMember, error: null };
  } catch (e: any) {
    console.error("Unexpected error:", e);
    return {
      isMember: false,
      error: { message: e.message || "An unexpected error occurred" },
    };
  }
}

export async function fetchEventsForUserAdmin(userId: string) {
  const supabase = createClient();

  try {
    const { data: registrations, error: registrationsError } = await supabase
      .from("eventregistrations")
      .select("eventid")
      .eq("adminid", userId);

    if (registrationsError) {
      throw registrationsError;
    }

    const eventIds = registrations.map((registration: any) => registration.eventid);

    if (eventIds.length === 0) {
      return { data: [], error: null };
    }

    const { data: events, error: eventsError } = await supabase
      .from("events")
      .select("*")
      .in("eventid", eventIds);

    if (eventsError) {
      throw eventsError;
    }

    return { data: events, error: null };
  } catch (error: any) {
    console.error("Error fetching events for user:", error);
    return {
      data: null,
      error: { message: error.message || "An unexpected error occurred" },
    };
  }
}

export async function fetchCertificatesForUser(userId: string) {
  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from("certificates")
      .select("*, events(title, starteventdatetime)")
      .eq("user_id", userId)
      .eq("release_status", "released");
    if (!error) {
      return { data, error: null };
    } else {
      return { data: null, error };
    }
  } catch (e: any) {
    return { data: null, error: e };
  }
}

export async function fetchSignatoriesForEvent(eventId: string) {
  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from("event_signatories")
      .select("*")
      .eq("event_id", eventId);
    if (error) {
      throw error;
    }
    return { data, error: null };
  } catch (e: any) {
    console.error("Error fetching signatories:", e);
    return {
      data: null,
      error: { message: e.message || "An unexpected error occurred" },
    };
  }
}

/**
 * Fetch certificate settings for a given event ID.
 * @param eventId - The UUID of the event.
 * @returns An object containing certificate_enabled and other settings.
 */
export const fetchCertificateSettings = async (eventId: string) => {
  const supabase = createClient();
  // console.log(`Fetching certificate settings for event ID: ${eventId}`);
  const { data, error } = await supabase
    .from("event_certificate_settings")
    .select("certificate_enabled, release_option, scheduled_release_date")
    .eq("event_id", eventId)
    .single();

  if (error) {
    console.error("Error fetching certificate settings:", error);
    return { error };
  }

  // console.log("Fetched certificate settings:", data);
  return { data };
};

export async function releaseCertificatesNow(eventId: string) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/events/${eventId}/release_certificates`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    const contentType = response.headers.get("Content-Type");

    let data;
    if (contentType && contentType.includes("application/json")) {
      data = await response.json();
    } else {
      const text = await response.text();
      throw new Error(`Unexpected response format: ${text}`);
    }

    if (!response.ok) {
      return { success: false, error: data.error || "Failed to release certificates" };
    }

    // console.log("Input JSON:", JSON.stringify(data, null, 2));

    return { success: true };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred";
    return { success: false, error: errorMessage };
  }
}
