"use client";
import { useUser } from "@/context/UserContext";
import { UserProfile } from "@/lib/types";
import {
  deleteUser,
  getUserEmailById,
  getUserProfileById,
  sendPasswordRecovery,
  updateUserProfileById,
} from "@/lib/userActions";
import { convertToBase64, isDateValid } from "@/lib/utils";
import { EnvelopeIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import Swal from "sweetalert2";
import { z } from "zod";

// Schema for form validation
const UserProfileSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string(),
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
  const { user } = useUser(); // Use the useUser hook to access the logged-in user's details

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UserProfile>({
    resolver: zodResolver(UserProfileSchema),
  });

  useEffect(() => {
    const fetchUserProfile = async () => {
      const response = await getUserProfileById(userId);
      setUserProfile(response?.data);
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

    const updatedData: UserProfile = {
      ...data,
      userid: userProfile?.userid || "",
      updatedat: new Date(),
      dateofbirth: data.dateofbirth ? data.dateofbirth : undefined,
      profilepicture: userProfile?.profilepicture
        ? userProfile.profilepicture
        : undefined,
    };

    const response = await updateUserProfileById(userProfile?.userid || "", updatedData);

    if (response === null) {
      Swal.fire("Error", "Error updating user profile.", "error");
    } else {
      Swal.fire("Success", "User profile updated successfully", "success").then(() => {
        window.history.back();
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

  if (!userProfile) {
    return <div className="mt-10 text-light">Loading...</div>;
  }

  return (
    <div
      className="overflow-hidden bg-raisinblack p-6 shadow sm:rounded-lg"
      style={{ maxWidth: "700px", margin: "0 auto" }}
    >
      <div className="overflow-auto sm:h-auto">
        <form
          onSubmit={handleSubmit(handleEdit)}
          className="px-4 py-5 sm:grid sm:grid-cols-2 sm:gap-4 sm:px-6"
        >
          <div className="col-span-3 sm:col-span-2">
            <div className="flex items-center justify-center">
              <div className="relative">
                <img
                  src={
                    userProfile?.profilepicture
                      ? userProfile.profilepicture
                      : "/Portrait_Placeholder.png"
                  }
                  alt="Profile Picture"
                  className="block h-44 w-44 rounded-full border-4 border-primary"
                  style={{ objectFit: "cover" }}
                />
                <div className="absolute bottom-0 right-0 mb-2 mr-2">
                  <label htmlFor="file-input" className="">
                    <PlusIcon className="mr-2 inline-block h-8 w-8 cursor-pointer rounded-full border-2 border-primary  bg-white text-primarydark" />
                  </label>
                  <input
                    id="file-input"
                    type="file"
                    onChange={async (event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        const base64 = await convertToBase64(file);
                        setUserProfile({ ...userProfile, profilepicture: base64 });
                      }
                    }}
                    className="hidden"
                  />
                </div>
              </div>
            </div>

            <div className="mx-auto w-full space-y-4 sm:max-w-lg">
              <div className="mt-8 flex flex-row gap-2">
                <div className="w-full">
                  <label className="block text-sm font-medium text-light">
                    First Name
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
                    Last Name
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
                Gender
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
                Date of Birth
                <input
                  type="date"
                  {...register("dateofbirth")}
                  defaultValue={userProfile.dateofbirth}
                  className="mt-1 block w-full rounded-md border border-[#525252] bg-charleston px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
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
                  className="mt-1 block w-full rounded-md border border-[#525252] bg-charleston px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
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
                <p className="text-red-500">{errors.company && errors.company.message}</p>
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
                <p className="text-red-500">{errors.website && errors.website.message}</p>
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
  );
};

export default EditUserDetails;
