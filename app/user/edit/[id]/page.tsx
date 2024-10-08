"use client";
import { useParams } from "next/navigation";
import EditUserDetails from "@/components/app/edit_user_details";
import Swal from "sweetalert2";
import { deleteUser, sendPasswordRecovery } from "@/lib/user_actions";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";

export default function EditProfilePage() {
  const { id } = useParams() as { id: string };

  const deleteBtn = async () => {
    Swal.fire({
      title: "Are you sure you want to delete this account?",
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it!",
      cancelButtonText: "No, cancel!",
      reverseButtons: true,
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire({
          title: "Are you absolutely sure?",
          text: "This action cannot be undone. This will permanently delete this account and all its data.",
          icon: "warning",
          showCancelButton: true,
          confirmButtonText: "Yes, I'm sure!",
          cancelButtonText: "No, I changed my mind!",
          reverseButtons: true,
        }).then(async (secondResult) => {
          if (secondResult.isConfirmed) {
            const response = await deleteUser(id ?? "");

            if (!response.error) {
              Swal.fire({
                title: "Deleted!",
                text: "Account successfully deleted.",
                icon: "success",
              }).then(() => {
                // Go back to the previous page
                window.history.back();
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
      }
    });
  };

  return (
    <>
      <div className="top-10 text-gray-100 hover:cursor-pointer">
        <a
          onClick={() => window.history.back()}
          className=" flex items-center gap-2 hover:opacity-80"
        >
          <ArrowLeftIcon className="h-5 w-5" /> Back
        </a>
      </div>

      <div className="mb-10 sm:mx-auto sm:w-full sm:max-w-sm">
        <img className="mx-auto h-10 w-auto" src="/syncup.png" alt="SyncUp" />
        <h2 className="mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-white">
          Edit User Details
        </h2>
      </div>
      <EditUserDetails userId={id} />
      {/* <div className="flex flex-col justify-end space-y-4">
        <button
          type="button"
          className="mt-5 flex w-full items-center justify-center rounded-md border border-primary border-transparent bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primarydark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          onClick={async () => {
            const response = await sendPasswordRecovery(email);

            if (!response.error) {
              Swal.fire({
                title: "Email Sent!",
                text: "The password recovery was sent to the user's email",
                icon: "success",
                customClass: {
                  container: "bg-[red] text-light",
                  confirmButton: "bg-primary hover:bg-primarydark",
                },
              });
            } else {
              Swal.fire({
                title: "Failed!",
                text: response.error.message,
                icon: "error",
                customClass: {
                  container: "bg-raisinblack text-light",
                  confirmButton: "bg-primary hover:bg-primarydark",
                },
              });
            }
          }}
        >
          Send Password Recovery Email
        </button>
        <button
          type="button"
          className="mt-5 flex w-full items-center justify-center rounded-md border border-primary border-transparent bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primarydark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          onClick={deleteBtn}
        >
          Delete Account
        </button>
      </div> */}
    </>
  );
}
