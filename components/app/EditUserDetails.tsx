"use client";
import { useState, useEffect, FormEvent, ChangeEvent } from "react";
import { getUserProfileById, updateUserProfileById } from "@/lib/userActions";
import { UserProfile } from "@/lib/types";
import { Dialog, Transition } from "@headlessui/react";
import { Fragment, useRef } from "react";

interface EditUserDetailsProps {
  userId: string;
}

const EditUserDetails: React.FC<EditUserDetailsProps> = ({ userId }) => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [dialogMessage, setDialogMessage] = useState("");
  const [profilePicURL, setProfilePicURL] = useState<string | null>(null);

  let completeButtonRef = useRef(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      const response: any = await getUserProfileById(userId);
      const data: Array<any> = response.data;
      setUserProfile(data.length ? data[0] : null);

      if (data.length && data[0].profilepicture) {
        // Remove '\\x' prefix and convert hexadecimal string to byte array
        const hexString = data[0].profilepicture.substring(2);
        const byteArray = new Uint8Array(
          hexString.match(/.{1,2}/g).map((byte: string) => parseInt(byte, 16))
        );

        // Convert byte array to Base64 in chunks
        let binary = "";
        const bytes = new Uint8Array(byteArray);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64String = window.btoa(binary);

        // Set the Base64 string as the profile picture URL
        setProfilePicURL(`data:image/png;base64,${base64String}`);
      }
    };

    fetchUserProfile();
  }, [userId]);

  const handleEdit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const target = event.target as typeof event.target & {
      first_name: { value: string };
      last_name: { value: string };
      gender: { value: string };
      dateofbirth: { value: string };
      description: { value: string };
      company: { value: string };
      website: { value: string };
    };
    const updatedData: UserProfile = {
      userid: userProfile?.userid || "",
      first_name: target.first_name.value,
      last_name: target.last_name.value,
      gender: target.gender.value,
      dateofbirth:
        target.dateofbirth.value === "" ? "00/00/0000" : target.dateofbirth.value,
      description: target.description.value,
      company: target.company.value,
      website: target.website.value,
      updatedat: new Date(),
      profilepicture: selectedFile
        ? await convertFileToByteArray(selectedFile)
        : (undefined as Uint8Array | undefined),
    };

    const response = await updateUserProfileById(userProfile?.userid || "", updatedData);

    if (response.data === null) {
      setDialogMessage(`Error updating user profile.`);
    } else {
      setDialogMessage("User profile updated successfully");
    }
    setIsOpen(true);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files?.length) {
      setSelectedFile(event.target.files[0]);
      setProfilePicURL(URL.createObjectURL(event.target.files[0]));
    }
  };

  const convertFileToByteArray = (file: File): Promise<Uint8Array> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  if (!userProfile) {
    return <div>Loading...</div>;
  }

  return (
    <div className="overflow-hidden bg-white p-6 shadow sm:rounded-lg">
      <div className="px-4 py-5 sm:px-6">
        <h3 className="text-lg font-medium leading-6 text-gray-900">Edit User Details</h3>
        <p className="mt-1 max-w-2xl text-sm text-gray-500">
          Update the details of the selected user.
        </p>
      </div>
      <div className="overflow-auto border-t border-gray-200 sm:h-auto">
        <form
          onSubmit={handleEdit}
          className="px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6"
        >
          <div className="col-span-3 sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700">
              Profile Picture:
              <input
                type="file"
                onChange={handleFileChange}
                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
              />
              {profilePicURL && (
                <div style={{ width: "100px", height: "100px", overflow: "hidden" }}>
                  <img
                    src={profilePicURL}
                    alt="Profile Preview"
                    className="mt-2 rounded-lg"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                </div>
              )}
            </label>
            <label className="block text-sm font-medium text-gray-700">
              First Name:
              <input
                type="text"
                name="first_name"
                defaultValue={userProfile.first_name}
                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
              />
            </label>
            <label className="block text-sm font-medium text-gray-700">
              Last Name:
              <input
                type="text"
                name="last_name"
                defaultValue={userProfile.last_name}
                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
              />
            </label>
            <label className="block text-sm font-medium text-gray-700">
              Gender:
              <select
                name="gender"
                defaultValue={userProfile.gender}
                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
              >
                <option value="M">M</option>
                <option value="F">F</option>
              </select>
            </label>
            <label className="block text-sm font-medium text-gray-700">
              Date of Birth:
              <input
                type="date"
                name="dateofbirth"
                defaultValue={userProfile.dateofbirth}
                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
              />
            </label>
            <label className="block text-sm font-medium text-gray-700">
              Description:
              <textarea
                name="description"
                defaultValue={userProfile.description}
                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
              />
            </label>
            <label className="block text-sm font-medium text-gray-700">
              Company:
              <input
                type="text"
                name="company"
                defaultValue={userProfile.company}
                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
              />
            </label>
            <label className="block text-sm font-medium text-gray-700">
  Website:
  <input
    type="text"
    name="website"
    defaultValue={userProfile.website}
    placeholder="http://www.example.com"
    className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
  />
</label>
            <button
              type="submit"
              className="mt-5 inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              Update Profile
            </button>
          </div>
        </form>
      </div>
      <Transition.Root show={isOpen} as={Fragment}>
        <Dialog
          as="div"
          static
          className="fixed inset-0 z-10 overflow-y-auto"
          initialFocus={completeButtonRef}
          open={isOpen}
          onClose={setIsOpen}
        >
          <div className="flex min-h-screen items-end justify-center px-4 pb-20 pt-4 text-center sm:block sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <Dialog.Overlay className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
            </Transition.Child>
            <span
              className="hidden sm:inline-block sm:h-screen sm:align-middle"
              aria-hidden="true"
            >
              ​
            </span>
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <div className="inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:align-middle">
                <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                      <Dialog.Title
                        as="h3"
                        className="text-lg font-medium leading-6 text-gray-700"
                      >
                        {dialogMessage}
                      </Dialog.Title>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                  <button
                    type="button"
                    className="mt-3 inline-flex w-full justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:ml-3 sm:mt-0 sm:w-auto sm:text-sm"
                    onClick={() => setIsOpen(false)}
                    ref={completeButtonRef}
                  >
                    Close
                  </button>
                </div>
              </div>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>
    </div>
  );
};

export default EditUserDetails;
