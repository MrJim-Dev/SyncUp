"use server";
import { createClient } from "@/lib/supabase/server";

export async function insertEvent(formData: any, organizationId: string) {
  const insertValues = {
    title: formData.title,
    description: formData.description,
    eventdatetime: formData.eventDateTime, // Assuming this is a time string in HH:MM format
    location: formData.location,
    capacity: formData.capacity,
    registrationfee: formData.registrationFee,
    privacy: formData.privacy,
    organizationid: organizationId, // Include organizationId in the insertValues object
    eventphoto: formData.photo,
  };

  const supabase = createClient();
  try {
    const { data, error } = await supabase.from("events").insert([insertValues]).select();

    if (!error) {
      return { data, error: null };
    } else {
      return { data: null, error: { message: error.message } };
    }
  } catch (e: any) {
    console.error("Unexpected error:", e);
    return {
      data: null,
      error: { message: e.message || "An unexpected error occurred" },
    };
  }
}

export async function fetchEvents(
  organizationId: string,
  currentPage: number,
  eventsPerPage: number
) {
  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("organizationid", organizationId)
      .range(currentPage * eventsPerPage - eventsPerPage, currentPage * eventsPerPage)
      .order("createdat", { ascending: false });

    if (!error) {
      return { data, error: null };
    } else {
      return { data: null, error: { message: error.message } };
    }
  } catch (e: any) {
    console.error("Unexpected error:", e);
    return {
      data: null,
      error: { message: e.message || "An unexpected error occurred" },
    };
  }
}
export async function updateEvent(eventId: string, formData: any) {
  const updateValues = {
    title: formData.title,
    description: formData.description,
    eventdatetime: formData.eventDateTime, // Assuming this is a time string in HH:MM format
    location: formData.location,
    capacity: formData.capacity,
    registrationfee: formData.registrationFee,
    privacy: formData.privacy,
    eventphoto: formData.photo,
  };

  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from("events")
      .update(updateValues)
      .eq("eventid", eventId)
      .select();

    if (!error) {
      return { data, error: null };
    } else {
      return { data: null, error: { message: error.message } };
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
      .select("*")
      .eq("eventid", eventId)
      .single(); // Use .single() to return only one record

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

export async function deleteEvent(eventId: string) {
  const supabase = createClient();
  try {
    const { data, error } = await supabase.from("events").delete().eq("eventid", eventId);

    if (!error) {
      return { data, error: null };
    } else {
      return { data: null, error: { message: error.message } };
    }
  } catch (e: any) {
    console.error("Unexpected error:", e);
    return {
      data: null,
      error: { message: e.message || "An unexpected error occurred" },
    };
  }
}
