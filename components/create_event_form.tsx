// Filename: D:\Repositories\SyncUp\components\create_event_form.tsx

import React, { useRef, useEffect, useState } from "react";
import SignaturePad from "react-signature-canvas";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Tagify from "@yaireo/tagify";
import TagsInput from "./custom/tags-input";
import Select, { MultiValue } from "react-select";
import "@yaireo/tagify/dist/tagify.css";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { PhotoIcon, PlusIcon, TrashIcon } from "@heroicons/react/20/solid";
import { insertEvent, updateEvent } from "@/lib/events";
import { getUser, createClient } from "@/lib/supabase/client";
import { recordActivity } from "@/lib/track";

// Validation Schema
const isFutureDate = (date: Date): boolean => {
  return date > new Date();
};

const EventSchema = z
  .object({
    title: z.string().min(3, "Event Title is required"),
    description: z.string().min(3, "Description is required"),
    starteventdatetime: z.string().refine((val) => isFutureDate(new Date(val)), {
      message: "Start Event Date & Time should be in the future",
    }),
    endeventdatetime: z.string(),
    location: z.string().min(3, "Location is required"),
    capacity: z
      .number()
      .int()
      .min(1, "Capacity must be at least 1")
      .refine((value) => value !== 0, "Capacity cannot be zero")
      .optional()
      .nullable(),
    registrationfee: z.coerce
      .number()
      .nonnegative("Registration Fee cannot be negative")
      .optional()
      .nullable(),

    onsite: z.boolean().optional().nullable(),
    signatories: z
      .array(
        z.object({
          name: z.string().min(1, "Name is required"),
          signature: z.string().nullable(),
          position: z.string().min(1, "Position is required"),
        })
      )
      .optional()
      .default([]),
    certificate_enabled: z.boolean().optional(),
    release_option: z.enum(["after_event", "scheduled"]).optional(),
    scheduled_release_date: z.string().optional().nullable(),
    certificate_background: z.string().optional().nullable(),
    discounts: z
      .array(
        z.object({
          roles: z.array(z.string()).nonempty("At least one role is required"),
          memberships: z
            .array(z.string())
            .nonempty("At least one membership tier is required"),
          discount: z.number().min(0, "Discount must be at least 0%"),
        })
      )
      .optional()
      .default([]),
  })
  .superRefine((data, ctx) => {
    const startDate = new Date(data.starteventdatetime);
    const endDate = new Date(data.endeventdatetime);

    if (endDate <= startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "End Event Date & Time must be after the Start Date & Time",
        path: ["endeventdatetime"],
      });
    }

    if (data.release_option === "scheduled") {
      if (!data.scheduled_release_date) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Scheduled release date is required when release option is scheduled.",
          path: ["scheduled_release_date"],
        });
      } else {
        const scheduledDate = new Date(data.scheduled_release_date);
        if (scheduledDate <= new Date()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Scheduled release date must be in the future.",
            path: ["scheduled_release_date"],
          });
        }
      }
    }
  });

// Type Definitions
export interface EventFormValues {
  eventid?: string;
  title: string;
  description: string;
  starteventdatetime: string; // Changed to string
  endeventdatetime: string; // Changed to string
  location: string;
  capacity?: number | null;
  registrationfee?: number | null;
  privacy: any;
  organizationid: string;
  eventphoto: string | null;
  tags: string[];
  eventslug?: string;
  onsite?: boolean | null;
  signatories?: {
    name: string;
    signature: string | null;
    position: string;
  }[];
  certificate_enabled?: boolean;
  release_option?: "after_event" | "scheduled";
  scheduled_release_date?: string | null; // Changed to string
  certificate_background?: string | null;
  discounts?: Array<{
    roles: string[];
    memberships: string[];
    discount: number;
  }>;
}

type TagData = {
  value: string;
  [key: string]: any;
};

type OptionType = {
  value: string;
  label: string;
};

// Component
const CreateEventForm = ({
  organizationid,
  event,
}: {
  organizationid: string;
  event?: EventFormValues;
}) => {
  // Refs and States
  const certificateInputRef = useRef<HTMLInputElement>(null);
  const [certificateBackgroundFile, setCertificateBackgroundFile] = useState<File | null>(
    null
  );
  const [certificateBackground, setCertificateBackground] = useState<string | null>(
    event?.certificate_background || null
  );

  type Signatory = {
    name: string;
    position: string;
    signature: string | null;
  };

  const [signatories, setSignatories] = useState<Signatory[]>([]);
  const signaturePadRefs = useRef<SignaturePad[]>([]);

  const [eventphoto, setEventPhoto] = useState<string | null>(event?.eventphoto || null);
  const [previousPhotoUrl, setPreviousPhotoUrl] = useState<string | null>(
    event?.eventphoto || null
  );
  const [capacityValue, setCapacityValue] = useState<number | null>(
    event?.capacity || null
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

  const [discounts, setDiscounts] = useState<
    Array<{
      roles: string[];
      memberships: string[];
      discount: number;
    }>
  >([
    {
      roles: [],
      memberships: [],
      discount: 0,
    },
  ]);

  const customStyles = {
    control: (provided: any, state: any) => ({
      ...provided,
      backgroundColor: "#2A2A2A",
      color: "#E0E0E0",
      fontSize: "14px",
      borderColor: state.isFocused ? "#379a7b" : "rgba(255, 255, 255, 0.1)",
      boxShadow: "none",
      "&:hover": {
        borderColor: "#379a7b",
      },
      "&:focus": {
        outline: "none",
        boxShadow: "none",
      },
    }),
    input: (provided: any) => ({
      ...provided,
      color: "#ffffff",
      "&:focus": {
        outline: "none",
        boxShadow: "none",
      },
    }),
    menu: (provided: any) => ({
      ...provided,
      backgroundColor: "#2A2A2A",
      fontSize: "14px",
    }),
    option: (provided: any, state: any) => ({
      ...provided,
      backgroundColor: state.isFocused ? "#379a7b" : provided.backgroundColor,
      color: state.isFocused ? "#ffffff" : "#E0E0E0",
      fontSize: "14px",
    }),
    multiValue: (provided: any) => ({
      ...provided,
      backgroundColor: "#379a7b",
      fontSize: "14px",
      borderRadius: "4px",
      padding: "1px 4px",
    }),
    multiValueLabel: (provided: any) => ({
      ...provided,
      color: "#ffffff",
      fontSize: "14px",
      borderRadius: "6px",
    }),
    multiValueRemove: (provided: any, state: any) => ({
      ...provided,
      color: "#ffffff",
      fontSize: "14px",
      "&:hover": {
        backgroundColor: "#379a7b",
        color: "#bcbcbc",
      },
    }),
    singleValue: (provided: any) => ({
      ...provided,
      color: "#E0E0E0",
      fontSize: "14px",
    }),
  };

  // Handle Discount Changes
  const handleDiscountChange = (index: number, field: string, value: any) => {
    const updatedDiscounts = discounts.map((discount, i) => {
      if (i === index) {
        if (field === "roles") {
          if (value.includes("All Roles")) {
            return { ...discount, roles: ["All Roles"] };
          }
        }
        if (field === "memberships") {
          if (value.includes("All Membership Tiers")) {
            return { ...discount, memberships: ["All Membership Tiers"] };
          }
        }
        return { ...discount, [field]: value };
      }
      return discount;
    });
    setDiscounts(updatedDiscounts);
  };

  const addDiscount = () => {
    setDiscounts([...discounts, { roles: [], memberships: [], discount: 0 }]);
  };

  const deleteDiscount = (index: number) => {
    if (discounts.length === 1) {
      setDiscounts([{ roles: [], memberships: [], discount: 0 }]);
    } else {
      setDiscounts(discounts.filter((_, i) => i !== index));
    }
  };

  const formatDateForInput = (date: Date) => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Form Initialization
  const formOptions = event
    ? {
        defaultValues: {
          ...event,
          starteventdatetime: formatDateForInput(new Date(event.starteventdatetime)),
          endeventdatetime: formatDateForInput(new Date(event.endeventdatetime)),
          scheduled_release_date: event.scheduled_release_date
            ? formatDateForInput(new Date(event.scheduled_release_date))
            : null,
        },
      }
    : {
        defaultValues: {
          title: "",
          description: "",
          starteventdatetime: "",
          endeventdatetime: "",
          location: "",
          capacity: null,
          registrationfee: null,
          privacy: "public",
          organizationid: organizationid,
          eventphoto: null,
          tags: [],
          eventslug: "",
          onsite: false,
          signatories: [],
          certificate_enabled: false,
          release_option: "after_event" as "after_event" | "scheduled",
          scheduled_release_date: null,
          certificate_background: null,
          discounts: [],
        },
      };

  const {
    register,
    handleSubmit,
    formState: { errors, isValid, isSubmitted },
    reset,
    setValue,
    trigger,
    watch,
  } = useForm<EventFormValues>({
    resolver: zodResolver(EventSchema),
    mode: "onSubmit",
    ...formOptions,
  });

  // Slug Generation
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

  // Fetch Roles and Memberships for Suggestions
  useEffect(() => {
    if (organizationid) {
      const fetchRolesAndMemberships = async () => {
        const supabase = createClient();
        try {
          const { data: rolesData, error: rolesError } = await supabase
            .from("organization_roles")
            .select("role")
            .eq("org_id", organizationid);
          if (rolesError) {
            throw rolesError;
          }
          const { data: membershipsData, error: membershipsError } = await supabase
            .from("memberships")
            .select("name")
            .eq("organizationid", organizationid);
          if (membershipsError) {
            throw membershipsError;
          }
          const fetchedRoleSuggestions = [
            "All Roles",
            ...(rolesData?.map((role) => role.role) || []),
          ];
          const fetchedMembershipSuggestions = [
            "All Membership Tiers",
            ...(membershipsData?.map((membership) => membership.name) || []),
          ];
          setRoleSuggestions(fetchedRoleSuggestions);
          setMembershipSuggestions(fetchedMembershipSuggestions);
          setLoadingSuggestions(false);
        } catch (error: any) {
          toast.error("Error fetching roles or memberships. Please try again.");
          setLoadingSuggestions(false);
        }
      };
      fetchRolesAndMemberships();
    }
  }, [organizationid]);

  // Fetch Discounts for Existing Event
  useEffect(() => {
    if (event) {
      const fetchDiscounts = async () => {
        const supabase = createClient();
        try {
          const { data: discountData, error: discountError } = await supabase
            .from("event_discounts")
            .select("role, membership_tier, discount_percent")
            .eq("eventid", event.eventid);
          if (discountError) {
            console.error("Error fetching discounts:", discountError);
          } else if (discountData) {
            const formattedDiscounts = discountData.map((discount) => ({
              roles: Array.isArray(discount.role) ? discount.role : [discount.role],
              memberships: Array.isArray(discount.membership_tier)
                ? discount.membership_tier
                : [discount.membership_tier],
              discount: discount.discount_percent,
            }));
            setDiscounts(formattedDiscounts);
          }
        } catch (error: any) {
          console.error("Error fetching discounts:", error);
        }
      };
      fetchDiscounts();

      // Set Privacy Settings
      setSelectedRoles(
        event.privacy?.allow_all_roles ? ["All Roles"] : event.privacy?.roles || []
      );
      setSelectedMemberships(
        event.privacy?.allow_all_memberships
          ? ["All Membership Tiers"]
          : event.privacy?.membership_tiers || []
      );
      setPrivacyType(event.privacy?.type || "public");
      setAllowAllRoles(event.privacy?.allow_all_roles || false);
      setAllowAllMemberships(event.privacy?.allow_all_memberships || false);

      // console.log(
      //   "Dates: ",
      //   event.starteventdatetime,
      //   event.endeventdatetime,
      //   event.scheduled_release_date
      // );

      // Set form values based on the event data
      // Since defaultValues are already set correctly, no need to setValue here
      // (Object.keys(event) as (keyof typeof event)[]).forEach((key) => {
      //   if (key === "starteventdatetime" || key === "endeventdatetime") {
      //     const formattedDate = formatDateForInput(
      //       new Date(event[key] as unknown as string)
      //     );
      //     setValue(key as keyof EventFormValues, formattedDate);
      //   } else if (key === "scheduled_release_date" && event[key]) {
      //     const date = new Date(event[key] as Date);
      //     const formattedDate = formatDateForInput(date);
      //     setValue(key as keyof EventFormValues, formattedDate);
      //     // console.log("Formatted Date 2:", formattedDate);
      //   } else {
      //     setValue(key as keyof EventFormValues, event[key] as any);
      //   }
      // });

      setOnsitePayment(event.onsite || false);

      // Set Event Photo URL
      setEventPhoto(
        event.eventphoto
          ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${event.eventphoto}`
          : null
      );

      // Set Certificate Background URL
      setCertificateBackground(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${event.certificate_background}`
      );

      // Fetch Signatories
      const fetchSignatories = async () => {
        const supabase = createClient();
        const { data: signatoriesData, error } = await supabase
          .from("event_signatories")
          .select("*")
          .eq("event_id", event.eventid)
          .limit(3);
        if (error) {
          console.error("Error fetching signatories:", error);
          toast.error("Error fetching signatories.");
        } else {
          const formattedSignatories = signatoriesData.map((signatory) => ({
            name: signatory.name,
            position: signatory.position,
            signature: signatory.signature
              ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${signatory.signature}`
              : null,
          }));
          setSignatories(formattedSignatories);
          // No need to setValue here as defaultValues already include signatories
          formattedSignatories.forEach((signatory, index) => {
            const signaturePad = signaturePadRefs.current[index];
            if (signaturePad && signatory.signature) {
              fetch(signatory.signature)
                .then((res) => {
                  if (!res.ok) {
                    throw new Error(`Failed to fetch signature for ${signatory.name}`);
                  }
                  return res.blob();
                })
                .then((blob) => {
                  const reader = new FileReader();
                  reader.readAsDataURL(blob);
                  reader.onloadend = () => {
                    const dataUrl = reader.result as string;
                    signaturePad.fromDataURL(dataUrl);
                  };
                })
                .catch((err) => {
                  console.error(`Error loading signature for ${signatory.name}:`, err);
                });
            }
          });
        }
      };
      fetchSignatories();

      // Fetch Certificate Settings
      const fetchCertificateSettings = async () => {
        const supabase = createClient();
        const { data: certData, error: certError } = await supabase
          .from("event_certificate_settings")
          .select("*")
          .eq("event_id", event.eventid)
          .maybeSingle();
        if (certError) {
          console.error("Error fetching certificate settings:", certError);
          toast.error("Error fetching certificate settings.");
        } else if (certData) {
          setCertificateEnabled(certData.certificate_enabled);
          // No need to setValue as defaultValues are already set
          setCertificateBackground(certData.certificate_background);
        }
      };
      fetchCertificateSettings();
    }
  }, [event, setValue]);

  // Update Form Values when Signatories Change
  useEffect(() => {
    setValue("signatories", signatories);
    // console.log("Signatories:", signatories);
  }, [signatories, setValue]);

  // Handle Form Submission
  const onSubmit: SubmitHandler<EventFormValues> = async (formData) => {
    setIsLoading(true);
    try {
      // Validation for Private Events
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

      // Validation for Discounts
      if (privacyType === "private") {
        const disallowedRoles = discounts
          .flatMap((discount) => discount.roles)
          .filter(
            (role) =>
              role !== "All Roles" && !allowAllRoles && !selectedRoles.includes(role)
          );
        const disallowedMemberships = discounts
          .flatMap((discount) => discount.memberships)
          .filter(
            (membership) =>
              membership !== "All Membership Tiers" &&
              !allowAllMemberships &&
              !selectedMemberships.includes(membership)
          );
        if (disallowedRoles.length > 0 || disallowedMemberships.length > 0) {
          toast.error(
            `Invalid Discounts: The following roles/memberships assigned a discount are not allowed to access the event: 
            ${disallowedRoles.join(", ")} ${disallowedMemberships.join(", ")}`
          );
          return;
        }
      }

      for (const discount of discounts) {
        if (
          (discount.roles.length > 0 || discount.memberships.length > 0) &&
          discount.discount === 0
        ) {
          toast.error(
            "Discounts cannot be 0% if roles or membership tiers are selected."
          );
          return;
        }
      }

      // Privacy Settings
      const privacySettings = {
        type: privacyType,
        roles: allowAllRoles ? [] : selectedRoles,
        membership_tiers: allowAllMemberships ? [] : selectedMemberships,
        allow_all_roles:
          allowAllRoles || (privacyType === "private" && selectedRoles.length === 0),
        allow_all_memberships:
          allowAllMemberships ||
          (privacyType === "private" && selectedMemberships.length === 0),
      };

      const supabase = createClient();

      // Handle Event Photo Upload
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
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
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
          return;
        }
      } else if (removeImageFlag && previousPhotoUrl) {
        const fileName = previousPhotoUrl?.split("/").pop() ?? "";
        const { error } = await supabase.storage.from("event-images").remove([fileName]);
        if (error) {
          console.error("Error removing image:", error);
          toast.error("Error removing image. Please try again.");
          return;
        }
        imageUrl = null;
        setPreviousPhotoUrl(null);
      }

      // Convert date strings to ISO strings
      const startEventDateTimeWithTimezone = new Date(
        formData.starteventdatetime
      ).toISOString();
      const endEventDateTimeWithTimezone = new Date(
        formData.endeventdatetime
      ).toISOString();
      const scheduledReleaseDateWithTimezone = formData.scheduled_release_date
        ? new Date(formData.scheduled_release_date).toISOString()
        : null;

      // Format Tags
      const formattedTags = tags;

      // Slug Generation for New Events
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

      // Handle Signatories
      const signatoriesData: Array<{
        name: string;
        signature: string;
        position: string;
      }> = [];
      const basePublicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/`;

      for (let i = 0; i < signatories.length; i++) {
        const signatory = signatories[i];
        const signatureData = signatory.signature;
        if (signatureData) {
          if (signatureData.startsWith("data:")) {
            const response = await fetch(signatureData);
            const blob = await response.blob();
            const secureFileName = `${Date.now()}_${Math.random()
              .toString(36)
              .substring(2, 15)}.png`;
            const fileName = `signatures/${secureFileName}`;
            const { data: uploadResult, error: uploadError } = await supabase.storage
              .from("signatures")
              .upload(fileName, blob);
            if (uploadResult) {
              const signaturePath = `signatures/${uploadResult.path}`;
              signatoriesData.push({
                name: signatory.name,
                signature: signaturePath,
                position: signatory.position,
              });
            } else {
              console.error("Error uploading signature:", uploadError);
              toast.error("Error uploading signature. Please try again.");
              return;
            }
          } else {
            let signaturePath = signatureData;
            if (signatureData.startsWith(basePublicUrl)) {
              signaturePath = signatureData.replace(basePublicUrl, "");
            }
            signatoriesData.push({
              name: signatory.name,
              signature: signaturePath,
              position: signatory.position,
            });
          }
        } else {
          toast.error(
            `Signature for ${signatory.name || "Signatory"} is empty. Please provide a signature.`
          );
          return;
        }
      }

      // Handle Certificate Background Upload
      let certificateBackgroundUrl = event?.certificate_background || null;
      if (certificateBackgroundFile) {
        const fileName = `certificate_background_${formData.title}_${Date.now()}-${Math.random()
          .toString(36)
          .substring(7)}.png`;
        const { data: uploadResult, error: uploadError } = await supabase.storage
          .from("certificate-backgrounds")
          .upload(fileName, certificateBackgroundFile, {
            cacheControl: "3600",
            upsert: false,
          });
        if (uploadResult) {
          certificateBackgroundUrl = `certificate-backgrounds/${uploadResult.path}`;
        } else {
          console.error("Error uploading certificate background:", uploadError);
          toast.error("Error uploading certificate background.");
          return;
        }
      } else if (removeImageFlag && event?.certificate_background) {
        const fileName = event.certificate_background.split("/").pop() ?? "";
        const { error } = await supabase.storage
          .from("certificate-backgrounds")
          .remove([fileName]);
        if (error) {
          console.error("Error removing certificate background:", error);
          toast.error("Error removing certificate background. Please try again.");
          return;
        }
        certificateBackgroundUrl = null;
      }

      // Prepare Complete Form Data
      const completeFormData = {
        ...formData,
        eventphoto: imageUrl,
        starteventdatetime: startEventDateTimeWithTimezone,
        endeventdatetime: endEventDateTimeWithTimezone,
        scheduled_release_date: scheduledReleaseDateWithTimezone,
        capacity: capacityValue,
        registrationfee: formData.registrationfee, // Use formData directly
        tags: formattedTags,
        eventslug: event ? event.eventslug : slug,
        privacy: privacySettings,
        onsite: onsitePayment,
        discounts: discounts || [],
        signatories: signatoriesData,
        certificate_background: certificateBackgroundUrl,
      };


      const { data, error } = event
        ? await updateEvent(event.eventid!, completeFormData)
        : await insertEvent(completeFormData, organizationid);

      if (data) {
        const eventId = event ? event.eventid! : data[0].eventid;

        // Auto-register creator if creating a new event
        if (!event) {
          const { user } = await getUser();
          const userId = user?.id;
          if (userId) {
            await supabase.from("eventregistrations").insert([
              {
                eventid: data[0].eventid,
                userid: userId,
                status: "registered",
                attendance: "present",
              },
            ]);
          }
        }

        // Handle Certificate Settings Upsert
        const certificateSettings = {
          event_id: eventId,
          certificate_enabled: formData.certificate_enabled || false,
          release_option: formData.release_option || "after_event",
          scheduled_release_date:
            formData.release_option === "scheduled" && formData.scheduled_release_date
              ? formData.scheduled_release_date
              : null,
          certificate_background:
            certificateBackgroundUrl || "default-certificate-bg/default-cert-bg.png",
        };
        const { error: certError } = await supabase
          .from("event_certificate_settings")
          .upsert(certificateSettings, { onConflict: "event_id" });
        if (certError) {
          console.error("Error inserting/updating certificate settings:", certError);
          toast.error("Error saving certificate settings. Please try again.");
          return;
        }

        // Record Activity
        await recordActivity({
          activity_type: event ? "event_update" : "event_create",
          organization_id: organizationid,
          description: `${completeFormData.title} was ${event ? "updated" : "created"}`,
          activity_details: {
            event_title: completeFormData.title,
            event_slug: completeFormData.eventslug,
            event_description: completeFormData.description,
            event_capacity: completeFormData.capacity,
            event_registration_fee: completeFormData.registrationfee,
            event_starteventdatetime: completeFormData.starteventdatetime,
            event_endeventdatetime: completeFormData.endeventdatetime,
          },
        });

        // Success Message and Redirection
        toast.success(
          event ? "Event was updated successfully." : "Event was created successfully."
        );
        window.location.href = `/e/${event ? event.eventslug : completeFormData.eventslug}`;

        // Reset form and signatories state
        reset();
        setSignatories([]); // Reset signatories after form submission
      } else if (error) {
        toast.error(
          error.message ||
            (event
              ? "An error occurred while updating the event"
              : "An error occurred while creating the event")
        );
      }
    } catch (error: any) {
      console.error("Unexpected error:", error);
      toast.error(
        error.message || "An unexpected error occurred while submitting the form."
      );
    } finally {
      setIsLoading(false);
      setRemoveImageFlag(false);
    }
  };

  // Initialize Tagify for Tags Input
  useEffect(() => {
    const input = document.querySelector("input[name=tags]");
    if (input) {
      const tagify = new Tagify(input as HTMLInputElement, {
        originalInputValueFormat: (valuesArr: TagData[]) =>
          valuesArr.map((item) => item.value).join(","),
      });

      tagify.on("change", (e: any) => {
        const tagsArray = e.detail.value
          .split(",")
          .map((tag: string) => tag.trim())
          .filter((tag: string) => tag !== "");
        setTags(tagsArray);
      });

      if (event?.tags) {
        setTags(event.tags);
        tagify.addTags(event.tags);
      }

      return () => {
        tagify.destroy();
      };
    }
  }, [event]);

  // Set Event Photo URL
  useEffect(() => {
    if (event && event.eventphoto) {
      const imageUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${event.eventphoto}`;
      setEventPhoto(imageUrl);
    }
  }, [event]);

  // States for Toggles and Limits
  const [enabled, setEnabled] = useState(false);
  const [hasCapacityLimit, setHasCapacityLimit] = useState(
    event?.capacity ? event.capacity > 0 : false
  );
  const [hasRegistrationFee, setHasRegistrationFee] = useState(
    event?.registrationfee ? event.registrationfee > 0 : false
  );

  // Handlers for Capacity and Registration Fee Toggles
  const handleRegistrationFeeChange = (hasFee: boolean) => {
    setHasRegistrationFee(hasFee);
    if (!hasFee) {
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

  // Get Current Date and Time in Local Format for min Attribute
  const now = new Date();
  const currentDateTimeLocal = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}T${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  // Handler to Remove Event Photo
  const removeImage = () => {
    setEventPhoto(null);
    setPhotoFile(null);
    setRemoveImageFlag(true);
  };

  // State for Tags
  const [tags, setTags] = useState<string[]>(event?.tags || []);

  // Handlers for Roles and Memberships Changes
  const handleRolesChange = (roles: string[]) => {
    if (roles.includes("All Roles")) {
      setAllowAllRoles(true);
      setSelectedRoles(["All Roles"]);
    } else {
      setAllowAllRoles(false);
      setSelectedRoles(roles);
    }
  };

  const handleMembershipsChange = (memberships: string[]) => {
    if (memberships.includes("All Membership Tiers")) {
      setAllowAllMemberships(true);
      setSelectedMemberships(["All Membership Tiers"]);
    } else {
      setAllowAllMemberships(false);
      setSelectedMemberships(memberships);
    }
  };

  // State and Handler for Certificate Enable Toggle
  const [certificateEnabled, setCertificateEnabled] = useState<boolean>(
    event?.certificate_enabled || false
  );

  const handleCertificateEnabledChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCertificateEnabled(e.target.checked);
    setValue("certificate_enabled", e.target.checked);
  };

  // Error Handler for Form Submission
  const onError = (errors: any) => {
    console.error("Form errors:", errors);
    toast.error(
      "Please fix the errors in the form before submitting. Check for blank or invalid fields."
    );
  };

  return (
    <>
      <ToastContainer autoClose={5000} />
      <form onSubmit={handleSubmit(onSubmit, onError)}>
        {/* Event Photo Upload Section */}
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
                  <div className="flex items-center space-x-2 rounded-lg bg-black bg-opacity-25 px-3 text-white hover:cursor-pointer hover:bg-gray-600 hover:bg-opacity-25">
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

        {/* Rest of the form fields */}
        <div className="mt-4 space-y-4">
          {/* Event Title */}
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
            {errors.title && isSubmitted && (
              <p className="text-sm text-red-500">{errors.title.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1 text-light">
            <label htmlFor="description" className="text-sm font-medium text-white">
              Description
            </label>
            <textarea
              id="description"
              {...register("description")}
              className="block max-h-[300px] min-h-[150px] w-full rounded-md border-0 bg-white/5 py-1.5 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6"
            />
            {errors.description && isSubmitted && (
              <p className="text-sm text-red-500">{errors.description.message}</p>
            )}
          </div>

          {/* Start and End Date & Time */}
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
                {...register("starteventdatetime")} // Removed valueAsDate: true
              />
              {errors.starteventdatetime && isSubmitted && (
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
                {...register("endeventdatetime")} // Removed valueAsDate: true
              />
              {errors.endeventdatetime && isSubmitted && (
                <p className="mt-2 text-sm text-red-600">
                  {errors.endeventdatetime.message}
                </p>
              )}
            </div>
          </div>

          {/* Location */}
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
            {errors.location && isSubmitted && (
              <p className="text-sm text-red-500">{errors.location.message}</p>
            )}
          </div>

          {/* Capacity Limit */}
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
              {errors.capacity && isSubmitted && (
                <p className="text-red-500">{errors.capacity.message}</p>
              )}
            </div>
          )}

          {/* Registration Fee */}
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
                onChange={() => {
                  handleRegistrationFeeChange(false);
                  setValue("registrationfee", null); // Explicitly set to null
                }}
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
                {...register("registrationfee", { valueAsNumber: true })}
                className={`block w-full rounded-md border-0 bg-white/5 py-1.5 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6 ${
                  errors.registrationfee ? "border-red-500" : ""
                }`}
              />
              {errors.registrationfee && (
                <p className="text-sm text-red-500">{errors.registrationfee.message}</p>
              )}
              {/* Onsite Payment Checkbox */}
              <div className="flex items-center py-2">
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
              {/* Discounts Section */}
              <div>
                <label className="mt-10 text-sm font-medium text-white">
                  Discounts<span className="text-xs text-light"> (in percentage)</span>
                </label>
                {discounts.map((discount, index) => (
                  <div key={index} className="space-y-2 ">
                    <div className="mt-2 flex items-start space-x-4">
                      <div className="flex-1 space-y-2">
                        <div className="w-full">
                          <Select
                            isMulti
                            value={discount.roles.map((role) => ({
                              value: role,
                              label: role,
                            }))}
                            onChange={(selectedOptions: MultiValue<OptionType>) =>
                              handleDiscountChange(
                                index,
                                "roles",
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
                                "memberships",
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
                      <div className="flex w-1/5 flex-col items-center space-y-2">
                        <input
                          type="number"
                          value={discount.discount}
                          onChange={(e) =>
                            handleDiscountChange(
                              index,
                              "discount",
                              parseFloat(e.target.value)
                            )
                          }
                          className="block w-full rounded-md border-0 bg-white/5 py-2 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-primary"
                          placeholder="%"
                        />

                        <div className="mt-2 flex w-full justify-between">
                          <button
                            type="button"
                            onClick={() => deleteDiscount(index)}
                            className="mr-2 flex flex-1 items-center justify-center rounded-md bg-red-600 p-2 text-white hover:bg-red-700"
                            title="Remove Discount"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                          <button
                            type="button"
                            onClick={addDiscount}
                            className="flex flex-1 items-center justify-center rounded-md bg-primary p-2 text-white hover:bg-primarydark"
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

          {/* Conditional Privacy Fields */}
          {privacyType === "private" && (
            <>
              {/* Roles */}
              <div className="mt-4 space-y-1 text-light">
                <label className="text-sm font-medium text-white">Select Roles</label>
                <TagsInput
                  key={event ? event.eventid : "new-event"}
                  value={allowAllRoles ? ["All Roles"] : selectedRoles}
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
                  key={event ? event.eventid : "new-event"}
                  value={
                    allowAllMemberships ? ["All Membership Tiers"] : selectedMemberships
                  }
                  onChange={handleMembershipsChange}
                  suggestions={membershipSuggestions}
                  allowCustomTags={false}
                />
              </div>
            </>
          )}

          {/* Enable Certificates */}
          <div className="space-y-1 text-light">
            <input
              type="checkbox"
              id="certificate_enabled"
              {...register("certificate_enabled")}
              checked={certificateEnabled}
              onChange={handleCertificateEnabledChange}
              className="mr-2 border-gray-300 text-primary focus:ring-primarydark"
            />
            <label
              htmlFor="certificate_enabled"
              className="text-sm font-medium text-white"
            >
              Enable Certificates
            </label>
          </div>

          {/* Certificate Settings */}
          {watch("certificate_enabled") && (
            <>
              {/* Certificate Background Upload */}
              <div className="flex items-center justify-center">
                <div className="relative w-full max-w-lg">
                  <label className="text-sm font-medium text-white">
                    Certificate Background
                  </label>
                  <div className="relative h-64 w-full overflow-hidden rounded-md border-2 border-primary font-semibold">
                    {certificateBackground ? (
                      <img
                        src={
                          certificateBackground.startsWith("blob:")
                            ? certificateBackground
                            : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${certificateBackground}`
                        }
                        alt="Certificate Background Preview"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full bg-gray-300"></div>
                    )}
                    <div className="absolute bottom-0 right-0 mb-2 mr-2 flex items-center gap-1">
                      {/* Hidden File Input */}
                      <input
                        type="file"
                        accept="image/*"
                        ref={certificateInputRef}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (!file.type.startsWith("image/")) {
                              setImageError("Please upload an image file");
                              return;
                            }
                            setImageError("");
                            setCertificateBackgroundFile(file);
                            setCertificateBackground(URL.createObjectURL(file));
                          }
                        }}
                        className="hidden"
                      />
                      {/* Add/Change Button */}
                      {!certificateBackground ? (
                        <button
                          type="button"
                          onClick={() => certificateInputRef.current?.click()}
                          className="flex items-center space-x-2 rounded-lg bg-black bg-opacity-25 px-3 py-2 text-white hover:cursor-pointer hover:bg-gray-600 hover:bg-opacity-25"
                        >
                          <PhotoIcon className="h-5 w-5 text-white" />
                          <span className="text-sm font-medium">Add</span>
                        </button>
                      ) : (
                        <>
                          {/* Change Button */}
                          <button
                            type="button"
                            onClick={() => certificateInputRef.current?.click()}
                            className="flex items-center space-x-2 rounded-lg bg-black bg-opacity-25 px-3 py-2 text-white hover:cursor-pointer hover:bg-gray-500 hover:bg-opacity-25"
                          >
                            <PhotoIcon className="h-5 w-5 text-white" />
                            <span className="text-sm font-medium">Change</span>
                          </button>
                          {/* Remove Button */}
                          <button
                            type="button"
                            onClick={() => {
                              setCertificateBackground(null);
                              setCertificateBackgroundFile(null);
                              setRemoveImageFlag(true);
                            }}
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

              {/* Certificate Release Option */}
              <div className="space-y-1 text-light">
                <label
                  htmlFor="release_option"
                  className="text-sm font-medium text-white"
                >
                  Certificate Release Option
                </label>
                <select
                  id="release_option"
                  {...register("release_option")}
                  defaultValue={event?.release_option || "after_event"}
                  className="block w-full rounded-md bg-charleston py-1.5 text-light shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6"
                >
                  <option value="after_event">After Event</option>
                  <option value="scheduled">Scheduled</option>
                </select>
              </div>

              {/* Scheduled Release Date */}
              {watch("release_option") === "scheduled" && (
                <div className="space-y-1 text-light">
                  <label
                    htmlFor="scheduled_release_date"
                    className="text-sm font-medium text-white"
                  >
                    Scheduled Release Date
                  </label>
                  <input
                    type="datetime-local"
                    id="scheduled_release_date"
                    {...register("scheduled_release_date")}
                    className="block w-full rounded-md bg-white/5 py-1.5 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6"
                  />
                  {errors.scheduled_release_date && isSubmitted && (
                    <p className="text-sm text-red-500">
                      {errors.scheduled_release_date.message}
                    </p>
                  )}
                </div>
              )}

              {/* Signatories Section */}
              <div className="space-y-1 text-light">
                <label className="text-sm font-medium text-white">Signatories</label>
                <br />
                {signatories.map((signatory, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center space-x-2">
                      {/* Name Input */}
                      <input
                        type="text"
                        placeholder="Name"
                        value={signatory.name}
                        onChange={(e) => {
                          const updatedSignatories = [...signatories];
                          updatedSignatories[index].name = e.target.value;
                          setSignatories(updatedSignatories);
                        }}
                        className="block w-1/3 rounded-md border-0 bg-white/5 px-2 py-1.5 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm"
                      />
                      {/* Position Input */}
                      <input
                        type="text"
                        placeholder="Position"
                        value={signatory.position}
                        onChange={(e) => {
                          const updatedSignatories = [...signatories];
                          updatedSignatories[index].position = e.target.value;
                          setSignatories(updatedSignatories);
                        }}
                        className="block w-1/3 rounded-md border-0 bg-white/5 px-2 py-1.5 text-white"
                      />
                      {/* Remove Signatory Button */}
                      <button
                        type="button"
                        onClick={() => {
                          const updatedSignatories = signatories.filter(
                            (_, i) => i !== index
                          );
                          setSignatories(updatedSignatories);
                        }}
                        className="text-red-500 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                    {/* Signature Pad */}
                    <div>
                      <div className="rounded border border-primary bg-white p-2">
                        <SignaturePad
                          penColor="black"
                          backgroundColor="rgba(0,0,0,0)"
                          onEnd={() => {
                            const signaturePad = signaturePadRefs.current[index];
                            if (signaturePad) {
                              const dataURL = signaturePad.toDataURL("image/png");
                              const updatedSignatories = [...signatories];
                              updatedSignatories[index].signature = dataURL;
                              setSignatories(updatedSignatories);
                            }
                          }}
                          canvasProps={{
                            className: "signatureCanvas",
                            style: {
                              border: "1px solid #ccc",
                              width: "100%",
                              height: "200px",
                            },
                          }}
                          ref={(ref) => {
                            if (ref) {
                              signaturePadRefs.current[index] = ref;
                            }
                          }}
                        />
                      </div>
                      {/* Clear Signature Button */}
                      <button
                        type="button"
                        onClick={() => {
                          const signaturePad = signaturePadRefs.current[index];
                          if (signaturePad) {
                            signaturePad.clear();
                            const updatedSignatories = [...signatories];
                            updatedSignatories[index].signature = null;
                            setSignatories(updatedSignatories);
                          }
                        }}
                        className="mt-2 rounded-md bg-red-500 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-red-700"
                      >
                        Clear Signature
                      </button>
                    </div>
                  </div>
                ))}
                {/* Add Signatory Button */}
                {signatories.length < 3 && (
                  <button
                    type="button"
                    onClick={() =>
                      setSignatories([
                        ...signatories,
                        { name: "", signature: null, position: "" },
                      ])
                    }
                    className="mt-2 rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-primarydark"
                  >
                    Add Signatory
                  </button>
                )}
              </div>
            </>
          )}

          {/* Tags Input */}
          <div className="space-y-1 text-light">
            <label htmlFor="tags" className="text-sm font-medium text-white">
              Tags
            </label>
            <input
              name="tags"
              value={tags.join(",")}
              onChange={(e) =>
                setTags(
                  e.target.value
                    .split(",")
                    .map((tag) => tag.trim())
                    .filter((tag) => tag !== "")
                )
              }
              className="block w-full rounded-md border-0 bg-white/5 py-1.5 text-white shadow-sm ring-1 ring-inset ring-charleston focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6"
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isLoading}
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
