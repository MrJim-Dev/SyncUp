"use client";
import Preloader from "@/components/preloader";
import { useUser } from "@/context/user_context";
import { createClient } from "@/lib/supabase/client";
import { UserProfile } from "@/types/user_profile";
import {
  deleteUser,
  getUserEmailById,
  getUserProfileById,
  sendPasswordRecovery,
  updateUserProfileById,
} from "@/lib/user_actions";
import { isDateValid } from "@/lib/utils";
import { EnvelopeIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Swal from "sweetalert2";
import Datepicker from "tailwind-datepicker-react";
import { z } from "zod";
import imageCompression from 'browser-image-compression';

const supabase = createClient();

// Schema for form validation
const UserProfileSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  gender: z
    .string()
    .min(1, "Gender is required")
    .refine((val) => val === "M" || val === "F", {
      message: "Gender must be 'M' or 'F'",
    }),
  dateofbirth: z.string().refine((value) => isDateValid(value), {
    message: "Invalid or underage date of birth",
  }),
  description: z.string(),
  company: z.string(),
  website: z.string().url("Invalid URL format").optional().or(z.literal("")),
});

const EditUserDetails: React.FC<{ userId: string }> = ({ userId }) => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [email, setEmail] = useState("");
  const [imageError, setImageError] = useState("");
  const [profilePictureFile, setProfilePictureFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null); // State for preview URL
  const { user } = useUser(); // Use the useUser hook to access the logged-in user's details
  const [show, setShow] = useState<boolean>(false);

  // Define the options for the date picker
  const datepicker_options = {
    title: "Calendar",
    autoHide: true,
    todayBtn: false,
    clearBtn: true,
    maxDate: new Date(),
    theme: {
      background: "bg-[#158A70] ", //not working when modified
      text: "text-white", // Use the CSS class for light text color
      todayBtn: "", //not working, only text color changes when modified
      clearBtn: "",
      icons: "",
      disabledText: "text-grey hover:bg-none",
      input:
        "block w-full rounded-md border-0 bg-white/5 py-1.5 text-white  shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm sm:leading-6",
      inputIcon: "",
      selected: "bg-primary", //working
    },
    datepickerClassNames: "top-50",
    defaultDate: null,
    language: "en",
    disabledDates: [],
    weekDays: ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"],
    inputNameProp: "date",
    inputIdProp: "date",
    inputPlaceholderProp: "Select Date",
    inputDateFormatProp: {
      day: "numeric",
      month: "long",
      year: "numeric",
    },
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
    control, // Add this line
  } = useForm<UserProfile>({
    resolver: zodResolver(UserProfileSchema),
  });

  useEffect(() => {
    const fetchUserProfile = async () => {
      const response = await getUserProfileById(userId);
      if (response?.data) {
        setUserProfile(response.data);
        setPreviewUrl(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${response.data.profilepicture}`
        );
      }
    };

    const fetchEmail = async () => {
      const response = await getUserEmailById(userId);
      setEmail(response?.data?.email || "");
    };

    fetchUserProfile();
    fetchEmail();
  }, [userId]);

  const handleEdit = async (data: UserProfile) => {
    setIsUpdating(true);

    let profilePictureUrl = userProfile?.profilepicture;

    if (profilePictureFile) {
      try {
        // Compress the image
        const options = {
          maxSizeMB: 1,             // Maximum size in MB
          maxWidthOrHeight: 1024,   // Compress to this maximum dimension
          useWebWorker: true        // Use web worker for better performance
        };
        
        const compressedFile = await imageCompression(profilePictureFile, options);
        
        const fileName = `${userProfile?.first_name}_${userProfile?.last_name}_${Date.now()}-${Math.random().toString(36).substring(7)}`;
        const { data: uploadResult, error } = await supabase.storage
          .from("profile-pictures")
          .upload(fileName, compressedFile, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadResult) {
          profilePictureUrl = `profile-pictures/${uploadResult.path}`;
        } else {
          console.error("Error uploading image:", error);
          toast.error("Error uploading image. Please try again.");
          setIsUpdating(false);
          return;
        }
      } catch (error) {
        console.error("Error compressing image:", error);
        toast.error("Error processing image. Please try again.");
        setIsUpdating(false);
        return;
      }
    }

    const updatedData: UserProfile = {
      ...data,
      userid: userProfile?.userid || "",
      updatedat: new Date(),
      dateofbirth: data.dateofbirth ? data.dateofbirth : undefined,
      profilepicture: profilePictureUrl,
    };

    const response = await updateUserProfileById(userProfile?.userid || "", updatedData);

    if (response === null) {
      Swal.fire("Error", "Error updating user profile.", "error");
    } else {
      toast.success("User profile updated successfully", {
        position: "bottom-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "light",
        onClose: () => {
          window.history.back();
        },
      });
    }
    setIsUpdating(false);
  };

  const deleteBtn = () => {
    Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it!",
      cancelButtonText: "No, cancel!",
      reverseButtons: true,
    }).then(async (result) => {
      if (result.isConfirmed) {
        const response = await deleteUser(userId);

        if (!response.error) {
          Swal.fire({
            title: "Deleted!",
            text: "The user successfully deleted.",
            icon: "success",
          }).then(() => {
            location.reload(); // Reload the page
          });
        } else {
          Swal.fire({
            title: "Failed!",
            text: response.error.message,
            icon: "error",
          });
        }
      }
    });
  };

  const handleSendPasswordRecovery = async () => {
    const response = await sendPasswordRecovery(email);

    if (!response.error) {
      Swal.fire("Email Sent!", "The password recovery email has been sent.", "success");
    } else {
      Swal.fire("Failed!", response.error.message, "error");
    }
  };

  const handleProfilePictureChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check if the file is an image
      if (!file.type.startsWith("image/")) {
        setImageError("Please upload an image file");
        return;
      }

      setProfilePictureFile(file);
      setPreviewUrl(URL.createObjectURL(file)); // Create a preview URL
      setImageError("");
    }
  };

  if (!userProfile) {
    return <Preloader />;
  }

  return (
    <>
      <ToastContainer
        position="bottom-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
      />
      <div
        className="overflow-hidde p-6 shadow sm:rounded-lg"
        style={{ maxWidth: "700px", margin: "0 auto" }}
      >
        <div className="overflow-auto sm:h-auto">
          <form
            onSubmit={handleSubmit(handleEdit)}
            className="px-4 py-5 sm:grid sm:grid-cols-2 sm:gap-4 sm:px-6"
          >
            <div className="col-span-3 sm:col-span-2">
              <div className="flex items-center justify-center">
                <div className="relative h-44 w-44">
                  {previewUrl || userProfile?.profilepicture ? (
                    <img
                      src={
                        previewUrl
                          ? previewUrl
                          : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${userProfile.profilepicture}`
                      }
                      className="block h-full w-full rounded-full border-4 border-primary bg-charleston object-cover"
                    />
                  ) : (
                    <div className="block h-full w-full rounded-full border-4 border-primary"></div>
                  )}
                  <div className="absolute bottom-0 right-0 mb-2 mr-2">
                    <label htmlFor="profile-picture-input" className="">
                      <PlusIcon className="mr-2 inline-block h-8 w-8 cursor-pointer rounded-full border-2 border-primary bg-white text-primarydark" />
                    </label>
                    <input
                      id="profile-picture-input"
                      accept="image/*"
                      type="file"
                      onChange={handleProfilePictureChange}
                      className="hidden"
                      title="Profile Picture"
                      placeholder="Choose an image"
                    />
                  </div>
                </div>
              </div>
              {/* Display the error message */}
              <p className="text-center text-red-500">{imageError}</p>

              <div className="mx-auto w-full space-y-4 sm:max-w-lg">
                <div className="mt-8 flex flex-row gap-2">
                  <div className="w-full">
                    <label className="block text-sm font-medium text-light">
                      First Name*
                      <input
                        type="text"
                        {...register("first_name")}
                        defaultValue={userProfile.first_name}
                        className=" mt-1 block w-full rounded-md border border-[#525252] bg-charleston px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
                      />
                      <p className="text-red-500">
                        {errors.first_name && errors.first_name.message}
                      </p>
                    </label>
                  </div>
                  <div className="w-full">
                    <label className="block text-sm font-medium text-light">
                      Last Name*
                      <input
                        type="text"
                        {...register("last_name")}
                        defaultValue={userProfile.last_name}
                        className="mt-1 block w-full rounded-md border border-[#525252] bg-charleston px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
                      />
                      <p className="text-red-500">
                        {errors.last_name && errors.last_name.message}
                      </p>
                    </label>
                  </div>
                </div>

                <label className="mt-2 block text-sm font-medium text-light">
                  Gender*
                  <select
                    {...register("gender")}
                    defaultValue={userProfile.gender || ""}
                    className="mt-1 block w-full rounded-md border border-[#525252] bg-charleston px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
                  >
                    <option value="" disabled>
                      Select a gender
                    </option>
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                  </select>
                  <p className="text-red-500">{errors.gender && errors.gender.message}</p>
                </label>
                <label className="mt-2 block text-sm font-medium text-light">
                  Date of Birth*
                  <Controller
                    name="dateofbirth" // The field name
                    control={control} // Pass in the control prop
                    rules={{ required: "Date of Birth is required" }}
                    defaultValue={userProfile.dateofbirth}
                    render={({ field }) => (
                      <Datepicker
                        value={
                          field.value && field.value !== ""
                            ? new Date(field.value)
                            : undefined
                        }
                        options={{
                          ...datepicker_options,
                          inputDateFormatProp: {
                            ...datepicker_options.inputDateFormatProp,
                            year: "numeric",
                            month: "2-digit", // Update the month property to a valid value
                            day: "2-digit", // Update the day property to a valid value
                          },
                        }}
                        onChange={(selectedDate) => {
                          const localDate = selectedDate ? new Date(selectedDate.getTime() - selectedDate.getTimezoneOffset() * 60000) : undefined;
                          const formattedDate = localDate
                            ? `${localDate.getFullYear()}-${(localDate.getMonth() + 1)
                                .toString()
                                .padStart(2, "0")}-${localDate.getDate().toString().padStart(2, "0")}`
                            : "";
                          field.onChange(formattedDate);
                        }}
                        
                        show={show}
                        setShow={setShow}
                      />
                    )}
                  />
                  {errors.dateofbirth && (
                    <p className="text-red-500">{errors.dateofbirth.message}</p>
                  )}
                </label>
                <label className="mt-2 block text-sm font-medium text-light">
                  Description
                  <textarea
                    {...register("description")}
                    defaultValue={userProfile.description}
                    className="mt-1 block max-h-[400px] min-h-[150px] w-full rounded-md border border-[#525252] bg-charleston px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
                  />
                  <p className="text-red-500">
                    {errors.description && errors.description.message}
                  </p>
                </label>
                <label className="mt-2 block text-sm font-medium text-light">
                  Company
                  <input
                    type="text"
                    {...register("company")}
                    defaultValue={userProfile.company}
                    className="mt-1 block w-full rounded-md border border-[#525252] bg-charleston px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
                  />
                  <p className="text-red-500">
                    {errors.company && errors.company.message}
                  </p>
                </label>
                <label className="mt-2 block text-sm font-medium text-light">
                  Website
                  <input
                    type="text"
                    {...register("website")}
                    defaultValue={userProfile.website}
                    placeholder="https://www.example.com"
                    className="mt-1 block w-full rounded-md border border-[#525252] bg-charleston px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
                  />
                  <p className="text-red-500">
                    {errors.website && errors.website.message}
                  </p>
                </label>
                <br />
                <button
                  type="submit"
                  className="flex w-full items-center justify-center rounded-md border border-primary border-transparent bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primarydark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                  disabled={isUpdating}
                >
                  {isUpdating ? "Updating Profile" : "Update Profile"}
                </button>

                <div className="action-buttons">
                  <button
                    type="button"
                    onClick={handleSendPasswordRecovery}
                    className="password-button mt-5 flex w-full items-center justify-center rounded-md border border-[#525252] bg-charleston px-4 py-2 text-sm font-medium text-light shadow-sm hover:bg-[#404040] focus:outline-none focus:ring-2 focus:ring-[#525252] focus:ring-offset-2"
                  >
                    <EnvelopeIcon className="mr-2 h-5 w-5" />
                    Send Password Recovery
                  </button>
                  {/* Conditionally render the Delete button */}
                  {user && user.id !== userId && (
                    <button
                      type="button"
                      onClick={deleteBtn}
                      className="delete-button mt-5 flex w-full items-center justify-center rounded-md border border-[#525252] bg-charleston px-4 py-2 text-sm font-medium text-light shadow-sm hover:bg-[#404040] focus:outline-none focus:ring-2 focus:ring-[#525252] focus:ring-offset-2"
                    >
                      <TrashIcon className="mr-2 h-5 w-5" />
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default EditUserDetails;
