import { insertEvent } from "@/lib/events";
import { createClient } from "@/lib/supabase/client";
import { PhotoIcon } from "@heroicons/react/20/solid";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { z } from "zod";

const isFutureDate = (value: Date) => {
  if (value instanceof Date) {
    const now = new Date();
    return value > now; // Return true if value is in the future
  }
  return false; // Return false if value is not a valid Date object
};

const EventSchema = z.object({
  title: z.string().min(3, "Event Title is required"),
  description: z.string().min(3, "Description is required"),
  eventDateTime: z.date().refine(isFutureDate, {
    message: "Event Date & Time should be in the future",
  }),
  location: z.string().min(3, "Location is required"),
  capacity: z
    .number()
    .int()
    .min(1, "Capacity must be at least 1") // Updated capacity validation
    .optional(), // Make capacity optional
  registrationFee: z.number().min(0, "Registration Fee cannot be negative").optional(),
  privacy: z.enum(["public", "private"]),
});

interface EventFormValues {
  title: string;
  description: string;
  eventDateTime: Date;
  location: string;
  capacity: number;
  registrationFee: number;
  privacy: "public" | "private";
  organizationId: string; // Add organizationId to EventFormValues
  photo: string | null;
}

const CreateEventForm = ({ organizationId }: { organizationId: string }) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset,
  } = useForm<EventFormValues>({
    resolver: zodResolver(EventSchema),
    mode: "onChange",
  });
  const [photo, setPhoto] = useState<string | null>(null);
  const [capacityValue, setCapacityValue] = useState<number | null>(null); // Track capacity value separately
  const [registrationFeeValue, setRegistrationFeeValue] = useState<number | null>(null); // Track registration fee value separately

  const [photoFile, setPhotoFile] = useState<File | null>(null); // Store the file instead of base64
  const [isLoading, setIsLoading] = useState(false);

  const onSubmit: SubmitHandler<EventFormValues> = async (formData) => {
    setIsLoading(true);

    // Handle capacity validation here
    if (hasCapacityLimit && formData.capacity <= 0) {
      toast.error("Capacity must be greater than 0 for events with limited capacity.");
      setIsLoading(false);
      return; // Exit early if capacity is invalid
    }

    // Handle capacity and registration fee values based on user input
    const finalCapacityValue = hasCapacityLimit ? capacityValue : null;
    const finalRegistrationFeeValue = hasRegistrationFee ? registrationFeeValue : null;

    // Log the formData to the console
    console.log("Form Data:", formData);
    console.log("Organization ID:", organizationId);

    const supabase = createClient();

    // Upload image to Supabase storage
    let imageUrl = null;
    if (photoFile) {
      const fileName = `${formData.title}_${Date.now()}-${Math.random().toString(36).substring(7)}`;
      const { data: uploadResult, error } = await supabase.storage
        .from("event-images")
        .upload(fileName, photoFile, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadResult) {
        imageUrl = uploadResult.fullPath; // Store the image URL/path from the upload result
      } else {
        console.error("Error uploading image:", error);
        toast.error("Error uploading image. Please try again.");
        setIsLoading(false);
        return; // Exit if image upload fails
      }
    }

    // Update form data with image URL
    const completeFormData = {
      ...formData,
      photo: imageUrl, // Assign the image URL to the photo field
      capacity: finalCapacityValue,
      registrationFee: finalRegistrationFeeValue,
    };
    console.log(completeFormData);

    const { data, error } = await insertEvent(completeFormData, organizationId); // Pass organizationId to insertEvent

    if (data) {
      toast.success("Event was created successfully.");
      reset();
    } else if (error) {
      toast.error(error.message || "An error occurred while creating the event");
    }

    setIsLoading(false);
  };

  useEffect(() => {
    // This will clean up the preview URL when the component unmounts
    return () => {
      if (photo) {
        URL.revokeObjectURL(photo);
      }
    };
  }, [photo]);

  const [enabled, setEnabled] = useState(false);
  const [hasRegistrationFee, setHasRegistrationFee] = useState(false); // State for tracking if there's a registration fee
  const [hasCapacityLimit, setHasCapacityLimit] = useState(false); // State for tracking if there's a capacity limit
  return (
    <>
      <ToastContainer />
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="flex items-center justify-center">
          <div className="relative w-full max-w-lg">
            <div className="relative h-64 w-full overflow-hidden rounded-md border-2 border-primary font-semibold">
              {photo ? (
                <img src={photo} alt="Preview" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full bg-charleston"></div>
              )}
              <div className="absolute bottom-0 right-0 mb-2 mr-2 grid  grid-cols-2 items-center gap-1 rounded-lg bg-black bg-opacity-25 text-white hover:bg-gray-500 hover:bg-opacity-25">
                <div className="flex justify-end pr-1">
                  <PhotoIcon className="h-6 w-6 text-white" />
                </div>
                <label htmlFor="file-input" className="col-span-1 py-2 pr-2">
                  Add
                </label>
                <input
                  id="file-input"
                  type="file"
                  onChange={(event) => {
                    const file = event.target.files?.[0] || null;
                    setPhotoFile(file);
                    if (file) {
                      const previewUrl = URL.createObjectURL(file);
                      setPhoto(previewUrl); // This will update the photo state with the preview URL
                    }
                  }}
                  className="hidden"
                />
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
          <div className="space-y-1 text-light">
            <label htmlFor="eventDateTime" className="text-sm font-medium text-white">
              Event Date & Time
            </label>
            <input
              type="datetime-local"
              id="eventDateTime"
              className="mt-1 block w-full rounded-md border border-[#525252] bg-charleston px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
              {...register("eventDateTime", { valueAsDate: true })}
            />
            {errors.eventDateTime && (
              <p className="text-sm text-red-500">{errors.eventDateTime.message}</p>
            )}
          </div>
          <div className="space-y-1 text-light">
            <label htmlFor="location" className="text-sm font-medium text-white">
              Location
            </label>
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
                onChange={() => {
                  setHasCapacityLimit(false);
                  setCapacityValue(null); // Clear capacity value when "No" is selected
                }}
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
                onChange={() => setHasCapacityLimit(true)}
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
                onChange={() => {
                  setHasRegistrationFee(false);
                  setRegistrationFeeValue(null); // Clear registration fee value when "No" is selected
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
                onChange={() => setHasRegistrationFee(true)}
                className="ml-4 mr-2 border-gray-300 text-primary focus:ring-primarydark"
              />
              <label htmlFor="yesFee" className="text-sm font-medium text-white">
                Yes
              </label>
            </div>
          </div>
          {hasRegistrationFee && (
            <div className="space-y-1 text-light">
              <label htmlFor="registrationFee" className="text-sm font-medium text-white">
                Registration Fee
              </label>
              <input
                type="text"
                id="registrationFee"
                defaultValue={0}
                {...register("registrationFee", { valueAsNumber: true })}
                onChange={(e) => setRegistrationFeeValue(parseFloat(e.target.value))}
                className="block w-full rounded-md border-0 bg-white/5 py-1.5 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6"
              />
              {errors.registrationFee && (
                <p className="text-sm text-red-500">{errors.registrationFee.message}</p>
              )}
            </div>
          )}
          <div className="space-y-1 text-light">
            <label htmlFor="privacy" className="text-sm font-medium text-white">
              Privacy
            </label>
            <select
              id="privacy"
              {...register("privacy")}
              className="mt-1 block w-full rounded-md border border-[#525252] bg-charleston px-3 py-2 text-white shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
            >
              <option value="" disabled>
                Select privacy
              </option>
              <option value="public">Public</option>
              <option value="private">Private</option>
            </select>
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
