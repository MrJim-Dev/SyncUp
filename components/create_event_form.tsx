import { insertEvent, updateEvent } from "@/lib/events";
import { getUser, createClient } from "@/lib/supabase/client";
import { PhotoIcon, PlusIcon, TrashIcon } from "@heroicons/react/20/solid";
import { zodResolver } from "@hookform/resolvers/zod";
import Tagify from "@yaireo/tagify";
import TagsInput from "./custom/tags-input";
import Select, { MultiValue } from 'react-select';
import "@yaireo/tagify/dist/tagify.css";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { z } from "zod";
import "../app/tags.css";
import { recordActivity } from "@/lib/track";

const isFutureDate = (value: Date) => {
  if (value instanceof Date) {
    const now = new Date();
    return value > now;
  }
  return false;
};

const isValidEventPeriod = (start: Date, end: Date) => {
  return start < end;
};

const EventSchema = z
  .object({
    title: z.string().min(3, "Event Title is required"),
    description: z.string().min(3, "Description is required"),
    starteventdatetime: z.date().refine((value) => isFutureDate(value), {
      message: "Start Event Date & Time should be in the future",
    }),
    endeventdatetime: z.date(),
    location: z.string().min(3, "Location is required"),
    capacity: z
      .number()
      .int()
      .min(1, "Capacity must be at least 1")
      .refine((value) => value !== 0, "Capacity cannot be zero")
      .optional()
      .nullable(),
    registrationfee: z
      .number()
      .nonnegative("Registration Fee cannot be negative")
      .optional()
      .nullable(),
    onsite: z.boolean().optional().nullable(),
  })
  .refine((data) => isValidEventPeriod(data.starteventdatetime, data.endeventdatetime), {
    message: "End Event Date & Time should be after Start Event Date & Time",
    path: ["endeventdatetime"],
  });

interface EventFormValues {
  eventid?: string; // Make eventid optional
  title: string;
  description: string;
  starteventdatetime: Date;
  endeventdatetime: Date;
  location: string;
  capacity?: number | null;
  registrationfee?: number | null;
  privacy: any;
  organizationid: string;
  eventphoto: string | null;
  tags: string[];
  eventslug?: string;
  onsite?: boolean | null;
}

type TagData = {
  value: string;
  [key: string]: any;
};

type OptionType = {
  value: string;
  label: string;
};

const CreateEventForm = ({
  organizationid,
  event,
}: {
  organizationid: string;
  event?: EventFormValues;
}) => {
  const [eventphoto, setEventPhoto] = useState<string | null>(event?.eventphoto || null);
  const [previousPhotoUrl, setPreviousPhotoUrl] = useState<string | null>(
    event?.eventphoto || null
  );
  const [capacityValue, setCapacityValue] = useState<number | null>(
    event?.capacity || null
  );
  const [registrationFeeValue, setRegistrationFeeValue] = useState<number | null>(
    event?.registrationfee || null
  );
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [removeImageFlag, setRemoveImageFlag] = useState(false);
  const [imageError, setImageError] = useState("");

  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedMemberships, setSelectedMemberships] = useState<string[]>([]);
  const [privacyType, setPrivacyType] = useState<string>(event?.privacy.type || "public");

  const [roleSuggestions, setRoleSuggestions] = useState<string[]>([]);
  const [membershipSuggestions, setMembershipSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true); // Loading state for suggestions
  const [privacyValue, setPrivacyValue] = useState<string>(event?.privacy || "public");

  const [allowAllRoles, setAllowAllRoles] = useState<boolean>(
    event?.privacy.allow_all_roles || false
  );
  const [allowAllMemberships, setAllowAllMemberships] = useState<boolean>(
    event?.privacy.allow_all_memberships || false
  );

  const [onsitePayment, setOnsitePayment] = useState<boolean | null>(
    event?.onsite || false
  );

  const roleOptions: OptionType[] = roleSuggestions.map((role) => ({
    value: role,
    label: role,
  }));
  
  const membershipOptions: OptionType[] = membershipSuggestions.map((membership) => ({
    value: membership,
    label: membership,
  }));
  

  const [discounts, setDiscounts] = useState<Array<{
    roles: string[];
    memberships: string[];
    discount: number;
  }>>([
    {
      roles: [], // Allow multiple roles
      memberships: [], // Allow multiple membership tiers
      discount: 0,
    },
  ]);
  

  const customStyles = {
    control: (provided: any, state: any) => ({
      ...provided,
      backgroundColor: '#2A2A2A',
      color: '#E0E0E0',
      fontSize: '14px', // Set font size for the input
      borderColor: state.isFocused ? '#379a7b' : 'rgba(255, 255, 255, 0.1)', // Focus border color and unfocused border color
      boxShadow: 'none', // Remove box shadow to eliminate blue border
      '&:hover': {
        borderColor: '#379a7b', // Hover border color when input is focused or hovered
      },
      '&:focus': {
        outline: 'none', // Remove blue border on focus
        boxShadow: 'none', // Remove blue focus shadow
      },
    }),
    input: (provided: any) => ({
      ...provided,
      color: '#ffffff', // Set the text color in the input to white
      '&:focus': {
        outline: 'none', // Remove default focus outline
        boxShadow: 'none', // Remove box shadow on focus
      },
    }),
    menu: (provided: any) => ({
      ...provided,
      backgroundColor: '#2A2A2A',
      fontSize: '14px', // Set font size for menu items
    }),
    option: (provided: any, state: any) => ({
      ...provided,
      backgroundColor: state.isFocused ? '#379a7b' : provided.backgroundColor,
      color: state.isFocused ? '#ffffff' : '#E0E0E0', // Option text color on hover
      fontSize: '14px', // Set font size for options
    }),
    multiValue: (provided: any) => ({
      ...provided,
      backgroundColor: '#379a7b',
      fontSize: '14px', // Set font size for selected items
      borderRadius: '4px',
      padding: '1px 4px',
    }),
    multiValueLabel: (provided: any) => ({
      ...provided,
      color: '#ffffff', // Label color for multiValue items
      fontSize: '14px', // Set font size for selected items
      borderRadius: '6px',
    }),
    multiValueRemove: (provided: any, state: any) => ({
      ...provided,
      color: '#ffffff', // Color of the delete icon in selected items
      fontSize: '14px', // Set font size for selected items
      '&:hover': {
        backgroundColor: '#379a7b', // Hover background color for delete button
        color: '#bcbcbc', // Hover color for delete icon in selected items
      },
    }),
    singleValue: (provided: any) => ({
      ...provided,
      color: '#E0E0E0',
      fontSize: '14px', // Set font size for single value
    }),
  };
  
  
// Function to handle discount changes
const handleDiscountChange = (index: number, field: string, value: any) => {
  const updatedDiscounts = discounts.map((discount, i) => {
    if (i === index) {
      // Handle the case where 'roles' are being updated
      if (field === 'roles') {
        // If "All Roles" is selected, clear other roles
        if (value.includes("All Roles")) {
          return { ...discount, roles: ["All Roles"] };
        }
      }

      // Handle the case where 'memberships' are being updated
      if (field === 'memberships') {
        // If "All Membership Tiers" is selected, clear other memberships
        if (value.includes("All Membership Tiers")) {
          return { ...discount, memberships: ["All Membership Tiers"] };
        }
      }

      // Update the specific field with the new value otherwise
      return { ...discount, [field]: value };
    }
    return discount;
  });
  setDiscounts(updatedDiscounts);
};

// Function to add a new discount
const addDiscount = () => {
  setDiscounts([...discounts, { roles: [], memberships: [], discount: 0 }]);
};

// Function to delete a discount
const deleteDiscount = (index: number) => {
  if (discounts.length === 1) {
    // If there's only one discount left, reset it instead of deleting
    setDiscounts([{ roles: [], memberships: [], discount: 0 }]);
  } else {
    // Otherwise, filter out the discount at the given index
    setDiscounts(discounts.filter((_, i) => i !== index));
  }
};

  


  const router = useRouter();

  const formOptions = event ? { defaultValues: event } : {};
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset,
    setValue,
    trigger,
    watch,
  } = useForm<EventFormValues>({
    resolver: zodResolver(EventSchema),
    mode: "onChange",
    ...formOptions,
  });

  function generateRandomSlug(length = 8) {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  }

  async function checkSlugAvailability(slug: string) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("events")
      .select("eventslug")
      .eq("eventslug", slug)
      .maybeSingle();

    if (error) {
      console.error("Error fetching slug:", error);
      return {
        isAvailable: false,
        error: error.message,
      };
    }

    return {
      isAvailable: !data,
      error: null,
    };
  }

  useEffect(() => {
    if (organizationid) {
      const fetchRolesAndMemberships = async () => {
        const supabase = createClient();
        try {
          // Fetch roles
          const { data: rolesData } = await supabase
            .from("organization_roles")
            .select("role")
            .eq("org_id", organizationid);

          // Fetch membership tiers
          const { data: membershipsData } = await supabase
            .from("organization_memberships")
            .select("name")
            .eq("organizationid", organizationid);

          const fetchedRoleSuggestions = [
            "All Roles",
            ...(rolesData?.map((role) => role.role) || []),
          ];
          const fetchedMembershipSuggestions = [
            "All Membership Tiers",
            ...(membershipsData?.map((membership) => membership.name) || []),
          ];

          console.log("Fetched Role Suggestions:", fetchedRoleSuggestions);
          console.log("Fetched Membership Suggestions:", fetchedMembershipSuggestions);

          setRoleSuggestions(fetchedRoleSuggestions);
          setMembershipSuggestions(fetchedMembershipSuggestions);
        } catch (error) {
          toast.error("Error fetching roles or memberships. Please try again.");
        }
      };
      fetchRolesAndMemberships();
    }
  }, [organizationid]);

  // Handle event data when editing
  useEffect(() => {
    if (event) {
      const fetchDiscounts = async () => {
        const supabase = createClient();
        try {
          // Fetch discounts for the event
          const { data: discountData, error: discountError } = await supabase
            .from("event_discounts")
            .select("role, membership_tier, discount_percent")
            .eq("eventid", event.eventid);
  
          if (discountError) {
            console.error("Error fetching discounts:", discountError);
          } else if (discountData) {
            const formattedDiscounts = discountData.map((discount) => ({
              roles: discount.role || [],
              memberships: discount.membership_tier || [],
              discount: discount.discount_percent,
            }));
            setDiscounts(formattedDiscounts);
          }
        } catch (error) {
          console.error("Error fetching discounts:", error);
        }
      };
  
      fetchDiscounts();
      // Populate the roles and memberships when editing an event
      setSelectedRoles(event.privacy?.roles || []);
      setSelectedMemberships(event.privacy?.membership_tiers || []);
      setPrivacyType(event.privacy?.type || "public"); // Default to "public" if not set
      setAllowAllRoles(event.privacy?.allow_all_roles || false);
      setAllowAllMemberships(event.privacy?.allow_all_memberships || false);
      
      // Set form values based on the event data
      (Object.keys(event) as (keyof typeof event)[]).forEach((key) => {
        if (key === "starteventdatetime" || key === "endeventdatetime") {
          const formattedDate = formatDateForInput(
            new Date(event[key] as unknown as string)
          );
          setValue(key as keyof EventFormValues, formattedDate);
        } else {
          setValue(key as keyof EventFormValues, event[key] as any);
        }
      });
      setOnsitePayment(event.onsite || false); // Set the state for onsite payment
      setValue("onsite", event.onsite || false); // Set form field value
      setPreviousPhotoUrl(event.eventphoto || null);
      
    }
  }, [event, setValue]);

  const onSubmit: SubmitHandler<EventFormValues> = async (formData) => {
    if (
      privacyType === "private" &&
      selectedRoles.length === 0 &&
      selectedMemberships.length === 0
    ) {
      toast.error(
        "Please select at least one role or membership tier for private events."
      );
      return;
    }

  // Validate discounts if privacy type is private
  if (privacyType === "private") {
    const disallowedRoles = discounts
      .flatMap((discount) => discount.roles)
      .filter(
        (role) =>
          role !== "All Roles" && // Allow "All Roles" when validating discounts
          (!allowAllRoles && !selectedRoles.includes(role))
      );

    const disallowedMemberships = discounts
      .flatMap((discount) => discount.memberships)
      .filter(
        (membership) =>
          membership !== "All Membership Tiers" && // Allow "All Membership Tiers" when validating discounts
          (!allowAllMemberships && !selectedMemberships.includes(membership))
      );

    if (disallowedRoles.length > 0 || disallowedMemberships.length > 0) {
      toast.error(
        `Invalid Discounts: The following roles/memberships assigned a discount are not allowed to access the event: 
        ${disallowedRoles.join(", ")} ${disallowedMemberships.join(", ")}`
      );
      return;
    }
  }

    // Prevent 0% discounts for selected roles or memberships
    for (const discount of discounts) {
      if ((discount.roles.length > 0 || discount.memberships.length > 0) && discount.discount === 0) {
        toast.error("Discounts cannot be 0% if roles or membership tiers are selected.");
        return;
      }
    }

    setIsLoading(true);

    const finalCapacityValue = capacityValue;
    const finalRegistrationFeeValue = registrationFeeValue;

    const privacySettings = {
      type: privacyType,
      roles: allowAllRoles ? [] : selectedRoles,
      membership_tiers: allowAllMemberships ? [] : selectedMemberships,
      allow_all_roles: allowAllRoles,
      allow_all_memberships: allowAllMemberships,
    };

    const supabase = createClient();

    let imageUrl = event?.eventphoto || null;
    if (photoFile) {
      if (previousPhotoUrl && previousPhotoUrl !== event?.eventphoto) {
        const { error: deleteError } = await supabase.storage
          .from("event-images")
          .remove([previousPhotoUrl]);
        if (deleteError) {
          console.error("Error removing previous image:", deleteError);
          toast.error("Error removing previous image. Please try again.");
          setIsLoading(false);
          return;
        }
      }

      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}`; // Changed to use random characters instead of title
      const { data: uploadResult, error: uploadError } = await supabase.storage
        .from("event-images")
        .upload(fileName, photoFile, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadResult) {
        imageUrl = `event-images/${uploadResult.path}`;
        setPreviousPhotoUrl(imageUrl);
      } else {
        console.error("Error uploading image:", uploadError);
        toast.error("Error uploading image. Please try again.");
        setIsLoading(false);
        return;
      }
    } else if (removeImageFlag && previousPhotoUrl) {
      const fileName = previousPhotoUrl?.split("/").pop() ?? "";

      const { error } = await supabase.storage.from("event-images").remove([fileName]);
      if (error) {
        console.error("Error removing image:", error);
        toast.error("Error removing image. Please try again.");
        setIsLoading(false);
        return;
      }
      imageUrl = null;
      setPreviousPhotoUrl(null);
    }

    const startEventDateTimeWithTimezone = new Date(
      formData.starteventdatetime
    ).toISOString();
    const endEventDateTimeWithTimezone = new Date(
      formData.endeventdatetime
    ).toISOString();
    const formattedTags = `{${tags.map((tag) => `"${tag}"`).join(",")}}`;

    let slug;
    if (!event) {
      slug = generateRandomSlug();
      let slugCheck = await checkSlugAvailability(slug);

      while (!slugCheck.isAvailable) {
        slug = generateRandomSlug();
        slugCheck = await checkSlugAvailability(slug);
      }

      if (slugCheck.error) {
        toast.error("Error checking slug availability. Please try again.");
        setIsLoading(false);
        return;
      }
    }

    const completeFormData = {
      ...formData,
      eventphoto: imageUrl,
      starteventdatetime: startEventDateTimeWithTimezone,
      endeventdatetime: endEventDateTimeWithTimezone,
      capacity: finalCapacityValue,
      registrationfee: finalRegistrationFeeValue,
      tags: formattedTags,
      slug: event ? event.eventslug : slug,
      privacy: privacySettings,
      onsite: onsitePayment,
      discounts: discounts, // Add discounts array here
    };

    const { data, error } = event
      ? await updateEvent(event.eventid!, completeFormData)
      : await insertEvent(completeFormData, organizationid);

    if (data) {

      if (!event) {
        const { user } = await getUser();
        const userId = user?.id; // Get the current user's ID
        if (userId) {
            await supabase
                .from("eventregistrations")
                .insert([
                    {
                        eventid: data[0].eventid, // Use the newly created event ID
                        userid: userId,
                        status: "registered", // Set the registration status
                        attendance: "present", // Set the attendance status
                    },
                ]);
        }
    }

      await recordActivity({
        activity_type: event ? "event_update" : "event_create",
        organization_id: organizationid, 
        description: `${completeFormData.title} was ${event ? "updated" : "created"}`,
        activity_details: {
          event_title: completeFormData.title,
          event_slug: completeFormData.slug,
          event_description: completeFormData.description,
          event_capacity: completeFormData.capacity,
          event_registration_fee: completeFormData.registrationfee,
          event_starteventdatetime: completeFormData.starteventdatetime,
          event_endeventdatetime: completeFormData.endeventdatetime,
        },
      });

      toast.success(
        event ? "Event was updated successfully." : "Event was created successfully."
      );

      router.push(`/e/${event ? event.eventslug : completeFormData.slug}`);
      reset();
    } else if (error) {
      toast.error(
        error.message ||
          (event
            ? "An error occurred while updating the event"
            : "An error occurred while creating the event")
      );
    }

    setIsLoading(false);
    setRemoveImageFlag(false);
  };

  const formatDateForInput = (date: Date) => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  useEffect(() => {
    const input = document.querySelector("input[name=tags]");
    const tagify = new Tagify(input as HTMLInputElement, {
      originalInputValueFormat: (valuesArr: TagData[]) =>
        valuesArr.map((item) => item.value).join(","), // Change made here
    });

    tagify.on("change", (e) => {
      const tagsArray = e.detail.value.split(",").map((tag) => tag.trim());
      setTags(tagsArray);
    });

    if (event?.tags) {
      setTags(event.tags);
      tagify.addTags(event.tags);
    }

    return () => {
      tagify.destroy();
    };
  }, [event]);

  useEffect(() => {
    if (event && event.eventphoto) {
      const imageUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${event.eventphoto}`;
      setEventPhoto(imageUrl);
    }
  }, [event]);

  const [enabled, setEnabled] = useState(false);
  const [hasCapacityLimit, setHasCapacityLimit] = useState(
    event?.capacity ? event.capacity > 0 : false
  );
  const [hasRegistrationFee, setHasRegistrationFee] = useState(
    event?.registrationfee ? event.registrationfee > 0 : false
  );

  const handleRegistrationFeeChange = (hasFee: boolean) => {
    setHasRegistrationFee(hasFee);
    if (!hasFee) {
      setRegistrationFeeValue(null);
      setValue("registrationfee", null);
      trigger("registrationfee");
    }
  };

  const handleCapacityChange = (hasLimit: boolean) => {
    setHasCapacityLimit(hasLimit);
    if (!hasLimit) {
      setCapacityValue(null);
      setValue("capacity", null);
      trigger("capacity");
    }
  };

  const now = new Date();
  const currentDateTimeLocal = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}T${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  const removeImage = () => {
    setEventPhoto(null);
    setPhotoFile(null);
    setRemoveImageFlag(true);
  };

  const [tags, setTags] = useState<string[]>(event?.tags || []);

  const handleRolesChange = (roles: string[]) => {
    if (roles.includes("All Roles")) {
      setAllowAllRoles(true);
      setSelectedRoles(["All Roles"]); // Make sure "All Roles" is added as a tag
    } else {
      setAllowAllRoles(false);
      setSelectedRoles(roles);
    }
  };

  const handleMembershipsChange = (memberships: string[]) => {
    if (memberships.includes("All Membership Tiers")) {
      setAllowAllMemberships(true);
      setSelectedMemberships(["All Membership Tiers"]); // Make sure "All Membership Tiers" is added as a tag
    } else {
      setAllowAllMemberships(false);
      setSelectedMemberships(memberships);
    }
  };

  return (
    <>
      <ToastContainer autoClose={5000} />
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="flex items-center justify-center">
          <div className="relative w-full max-w-lg">
            <div className="relative h-64 w-full overflow-hidden rounded-md border-2 border-primary font-semibold">
              {eventphoto ? (
                <img
                  src={eventphoto}
                  alt="Preview"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full bg-charleston"></div>
              )}
              <div className="absolute bottom-0 right-0 mb-2 mr-2 flex items-center gap-1 ">
                {!eventphoto && (
                  <div className="flex items-center space-x-2 rounded-lg bg-black bg-opacity-25 px-3  text-white hover:cursor-pointer hover:bg-gray-600 hover:bg-opacity-25">
                    <PhotoIcon className="h-5 w-5 text-white " />
                    <label
                      htmlFor="file-input"
                      className="cursor-pointer py-2 text-sm font-medium"
                    >
                      Add
                    </label>
                    <input
                      id="file-input"
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (!file.type.startsWith("image/")) {
                            setImageError("Please upload an image file");
                            return;
                          }
                          setImageError("");
                          setPhotoFile(file);
                          setEventPhoto(URL.createObjectURL(file));
                        }
                      }}
                      className="hidden"
                    />
                  </div>
                )}
                {eventphoto && (
                  <>
                    <div className="flex items-center space-x-2 rounded-lg bg-black bg-opacity-25 px-3 pr-1 text-white hover:cursor-pointer hover:bg-gray-500 hover:bg-opacity-25">
                      <PhotoIcon className="h-5 w-5 text-white" />
                      <label
                        htmlFor="file-input"
                        className="cursor-pointer py-2 pr-2 text-sm font-medium"
                      >
                        Change
                      </label>
                      <input
                        id="file-input"
                        type="file"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (!file.type.startsWith("image/")) {
                              setImageError("Please upload an image file");
                              return;
                            }
                            setImageError("");
                            setPhotoFile(file);
                            setEventPhoto(URL.createObjectURL(file));
                            setRemoveImageFlag(false);
                          }
                        }}
                        className="hidden"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={removeImage}
                      className="cursor-pointer rounded-lg bg-red-600 bg-opacity-75 px-2 py-2 text-sm font-medium text-light hover:bg-red-700 hover:bg-opacity-50"
                    >
                      Remove
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="mt-4 space-y-4">
          <div className="space-y-1 text-light">
            <label htmlFor="title" className="text-sm font-medium text-white">
              Event Title
            </label>
            <input
              type="text"
              id="title"
              {...register("title")}
              className="block w-full rounded-md border-0 bg-white/5 py-1.5 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6"
            />
            {errors.title && (
              <p className="text-sm text-red-500">{errors.title.message}</p>
            )}
          </div>
          <div className="space-y-1 text-light">
            <label htmlFor="description" className="text-sm font-medium text-white">
              Description
            </label>
            <textarea
              id="description"
              {...register("description")}
              className="block max-h-[300px] min-h-[150px] w-full rounded-md border-0 bg-white/5 py-1.5 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6"
            />
            {errors.description && (
              <p className="text-sm text-red-500">{errors.description.message}</p>
            )}
          </div>
          <div className="col-span-6 flex flex-wrap gap-4">
            <div className="min-w-[200px] flex-1">
              <label
                htmlFor="starteventdatetime"
                className="block text-sm font-medium text-white"
              >
                Start Event Date & Time
              </label>
              <input
                type="datetime-local"
                id="starteventdatetime"
                min={currentDateTimeLocal}
                className={`mt-1 block w-full rounded-md border-0 bg-white/5 py-1.5 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm ${
                  errors.starteventdatetime ? "border-red-500" : ""
                }`}
                {...register("starteventdatetime", {
                  valueAsDate: true,
                  setValueAs: (value) => new Date(value),
                })}
                defaultValue={
                  event ? formatDateForInput(new Date(event.starteventdatetime)) : ""
                }
              />
              {errors.starteventdatetime && (
                <p className="mt-2 text-sm text-red-600">
                  {errors.starteventdatetime.message}
                </p>
              )}
            </div>

            <div className="min-w-[200px] flex-1">
              <label
                htmlFor="endeventdatetime"
                className="block text-sm font-medium text-white"
              >
                End Event Date & Time
              </label>
              <input
                type="datetime-local"
                id="endeventdatetime"
                className={`mt-1 block w-full rounded-md border-0 bg-white/5 py-1.5 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm ${
                  errors.endeventdatetime ? "border-red-500" : ""
                }`}
                {...register("endeventdatetime", {
                  valueAsDate: true,
                  setValueAs: (value) => new Date(value),
                })}
                defaultValue={
                  event ? formatDateForInput(new Date(event.endeventdatetime)) : ""
                }
              />
              {errors.endeventdatetime && (
                <p className="mt-2 text-sm text-red-600">
                  {errors.endeventdatetime.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1 text-light">
            <label htmlFor="location" className="text-sm font-medium text-white">
              Location
            </label>
            <span className="text-xs"> (for virtual events, enter the virtual link)</span>
            <input
              type="text"
              id="location"
              {...register("location")}
              className="block w-full rounded-md border-0 bg-white/5 py-1.5 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6"
            />
            {errors.location && (
              <p className="text-sm text-red-500">{errors.location.message}</p>
            )}
          </div>
          <div className="space-y-1 text-light">
            <label htmlFor="hasCapacityLimit" className="text-sm font-medium text-white">
              Does the event have limited capacity?
            </label>
            <div id="hasCapacityLimit" className="flex items-center">
              <input
                type="radio"
                id="noCapacityLimit"
                value="noCapacityLimit"
                checked={!hasCapacityLimit}
                onChange={() => handleCapacityChange(false)}
                className="mr-2 border-gray-300 text-primary focus:ring-primarydark"
              />
              <label htmlFor="noCapacityLimit" className="text-sm font-medium text-white">
                No
              </label>
              <input
                type="radio"
                id="yesCapacityLimit"
                value="yesCapacityLimit"
                checked={hasCapacityLimit}
                onChange={() => handleCapacityChange(true)}
                className="ml-4 mr-2 border-gray-300 text-primary focus:ring-primarydark"
              />
              <label
                htmlFor="yesCapacityLimit"
                className="text-sm font-medium text-white"
              >
                Yes
              </label>
            </div>
          </div>
          {hasCapacityLimit && (
            <div className="space-y-1 text-light">
              <label htmlFor="capacity" className="text-sm font-medium text-white">
                Capacity
              </label>
              <input
                type="number"
                id="capacity"
                {...register("capacity", { valueAsNumber: true })}
                onChange={(e) => setCapacityValue(parseFloat(e.target.value))}
                className="block w-full rounded-md border-0 bg-white/5 py-1.5 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6"
              />
              {errors.capacity && (
                <p className="text-red-500">{errors.capacity.message}</p>
              )}
            </div>
          )}
          <div className="space-y-1 text-light">
            <label
              htmlFor="hasRegistrationFee"
              className="text-sm font-medium text-white"
            >
              Is there a registration fee?
            </label>
            <div id="hasRegistrationFee" className="flex items-center">
              <input
                type="radio"
                id="noFee"
                value="noFee"
                checked={!hasRegistrationFee}
                onChange={() => handleRegistrationFeeChange(false)}
                className="mr-2 border-gray-300 text-primary focus:ring-primarydark"
              />
              <label htmlFor="noFee" className="text-sm font-medium text-white">
                No
              </label>
              <input
                type="radio"
                id="yesFee"
                value="yesFee"
                checked={hasRegistrationFee}
                onChange={() => handleRegistrationFeeChange(true)}
                className="ml-4 mr-2 border-gray-300 text-primary focus:ring-primarydark"
              />
              <label htmlFor="yesFee" className="text-sm font-medium text-white">
                Yes
              </label>
            </div>
          </div>
          {hasRegistrationFee && (
            <div className="space-y-1 text-light">
              <label htmlFor="registrationfee" className="text-sm font-medium text-white">
                Registration Fee
              </label>
              <input
                type="number"
                id="registrationfee"
                defaultValue={0}
                step="0.01"
                {...register("registrationfee", { valueAsNumber: true })}
                onChange={(e) => setRegistrationFeeValue(parseFloat(e.target.value))}
                className="block w-full rounded-md border-0 bg-white/5 py-1.5 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6"
              />
              {errors.registrationfee && (
                <p className="text-sm text-red-500">{errors.registrationfee.message}</p>
              )}
          <div className="py-2 flex items-center">
            <input
              type="checkbox"
              id="onsitePayment"
              {...register("onsite")}
              checked={onsitePayment || false}
              onChange={(e) => {
                setOnsitePayment(e.target.checked);
                setValue("onsite", e.target.checked);
              }}
              className="mr-2 border-gray-300 text-primary focus:ring-primarydark"
            />
            <label htmlFor="onsitePayment" className="text-sm font-medium text-white">
              Allow Onsite Payment
            </label>
          </div>
          <div>
          <label className="mt-10 text-sm font-medium text-white">Discounts<span className="text-xs text-light"> (in percentage)</span></label>
          {discounts.map((discount, index) => (
            <div key={index} className="space-y-2 ">
              <div className="flex items-start space-x-4 mt-2">
                <div className="flex-1 space-y-2">
                  <div className="w-full">
                    <Select
                      isMulti
                      value={discount.roles.map((role) => ({ value: role, label: role }))}
                      onChange={(selectedOptions: MultiValue<OptionType>) =>
                        handleDiscountChange(
                          index,
                          'roles',
                          selectedOptions.map((option) => option.value)
                        )
                      }
                      options={roleOptions}
                      placeholder="Select Roles"
                      classNamePrefix="react-select"
                      styles={customStyles}
                    />
                  </div>

                  <div className="w-full">
                    <Select
                      isMulti
                      value={discount.memberships.map((membership) => ({
                        value: membership,
                        label: membership,
                      }))}
                      onChange={(selectedOptions: MultiValue<OptionType>) =>
                        handleDiscountChange(
                          index,
                          'memberships',
                          selectedOptions.map((option) => option.value)
                        )
                      }
                      options={membershipOptions}
                      placeholder="Select Memberships"
                      classNamePrefix="react-select"
                      styles={customStyles}
                    />
                  </div>
                </div>

                {/* Discount Input and Buttons - Set same width */}
                <div className="w-1/5 flex flex-col items-center space-y-2">
                  <input
                    type="number"
                    value={discount.discount}
                    onChange={(e) => handleDiscountChange(index, 'discount', parseFloat(e.target.value))}
                    className="block w-full rounded-md border-0 bg-white/5 py-2 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-primary"
                    placeholder="%"
                  />

                  <div className="flex w-full justify-between mt-2">
                    <button
                      type="button"
                      onClick={() => deleteDiscount(index)}
                      className="flex-1 flex items-center justify-center p-2 rounded-md bg-red-600 hover:bg-red-700 text-white mr-2"
                      title="Remove Discount"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={addDiscount}
                      className="flex-1 flex items-center justify-center p-2 rounded-md bg-primary hover:bg-primarydark text-white"
                      title="Add Discount"
                    >
                      <PlusIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>    
        </div>
        
          )}
        {/* Privacy Section */}
        <div className="space-y-1 text-light">
          <label htmlFor="privacy" className="text-sm font-medium text-white">
            Privacy
          </label>
          <select
            id="privacy"
            value={privacyType}
            onChange={(e) => setPrivacyType(e.target.value)}
            className="block w-full rounded-md border-0 bg-charleston py-1.5 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6"
            >
            <option value="public">Public</option>
            <option value="private">Private</option>
          </select>
        </div>

        {privacyType === "private" && (
          <>
            {/* Roles */}
            <div className="mt-4 space-y-1 text-light">
              <label className="text-sm font-medium text-white">Select Roles</label>
              <TagsInput
                key={event ? event.eventid : "new-event"} // Force re-render on event change
                value={selectedRoles}
                onChange={handleRolesChange}
                suggestions={roleSuggestions}
                allowCustomTags={false}
              />
            </div>

            {/* Membership Tiers */}
            <div className="mt-4 space-y-1 text-light">
              <label className="text-sm font-medium text-white">
                Select Membership Tiers
              </label>
              <TagsInput
                key={event ? event.eventid : "new-event"} // Force re-render on event change
                value={selectedMemberships}
                onChange={handleMembershipsChange}
                suggestions={membershipSuggestions}
                allowCustomTags={false}
              />
            </div>
          </>
        )}
          <div className="space-y-1 text-light">
            <label htmlFor="tags" className="text-sm font-medium text-white">
              Tags
            </label>
            <input
              name="tags"
              value={tags.join(",")}
              onChange={(e) =>
                setTags(e.target.value.split(",").map((tag) => tag.trim()))
              }
              className="block w-full rounded-md border-0 bg-white/5 py-1.5 text-white shadow-sm ring-1 ring-inset ring-charleston focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!isValid || isLoading}
              className="flex justify-end rounded-md bg-primary px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-primarydark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:bg-charleston"
            >
              {isLoading ? "Submitting..." : "Submit"}
            </button>
          </div>
        </div>
      </form>
    </>
  );
};

export default CreateEventForm;
