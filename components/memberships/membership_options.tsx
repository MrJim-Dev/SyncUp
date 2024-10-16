import { deleteMembership } from "@/lib/memberships";
import { Dialog, Menu, Transition } from "@headlessui/react";
import { ChevronDownIcon, TrashIcon, UserIcon } from "@heroicons/react/20/solid";
import { EnvelopeIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { Fragment, useState } from "react";
import Swal from "sweetalert2";
import { FaRegEdit } from "react-icons/fa";
import JSONPretty from "react-json-pretty";
import Link from "next/link";
import CreateMembershipModal from "./create_membership_modal"; // Importing the modal component

const jsonTheme = {
  main: "line-height:1.3;color:#383a42;background:#ffffff;overflow:hidden;word-wrap:break-word;white-space: pre-wrap;word-wrap: break-word; ",
  error:
    "line-height:1.3;color:#e45649;background:#ffffff;overflow:hidden;word-wrap:break-word;white-space: pre-wrap;word-wrap: break-word; ",
  key: "color:#a626a4;", // Purple for keys to stand out
  string: "color:#50a14f;", // Green for strings for easy readability
  value: "color:#4078f2;", // Blue for values to differentiate from strings
  boolean: "color:#986801;", // Brown for booleans for quick identification
};

function classNames(...classes: any[]) {
  return classes.filter(Boolean).join(" ");
}

export default function MembershipOptions({
  selectedTier,
  open,
  setOpen,
  TierMembers,
}: {
  selectedTier: any;
  open: boolean;
  setOpen: any;
  TierMembers: any;
}) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const handleCreateModalClose = () => {
    setIsCreateModalOpen(false);
  };

  const handleCreateModalSubmit = () => {
    setIsCreateModalOpen(false);
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
        const response = await deleteMembership(selectedTier.membershipid);

        if (!response.error) {
          Swal.fire({
            title: "Deleted!",
            text: "The membership was successfully deleted.",
            icon: "success",
          }).then(() => {
            location.reload();
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

  return (
    <>
      <Menu as="div" className="relative inline-block text-left">
        <div>
          <Menu.Button className="inline-flex w-full justify-center gap-x-1.5 rounded-md bg-charleston px-3 py-2 text-sm font-semibold text-light shadow-sm ring-1 ring-inset ring-[#525252] hover:bg-raisinblack">
            Options
            <ChevronDownIcon className="-mr-1 h-5 w-5 text-gray-400" aria-hidden="true" />
          </Menu.Button>
        </div>

        <Transition
          as={Fragment}
          enter="transition ease-out duration-100"
          enterFrom="transform opacity-0 scale-95"
          enterTo="transform opacity-100 scale-100"
          leave="transition ease-in duration-75"
          leaveFrom="transform opacity-100 scale-100"
          leaveTo="transform opacity-0 scale-95"
        >
          <Menu.Items className="fixed right-[80px] z-[100] mt-2 w-56 origin-top-left divide-y divide-[#525252] rounded-md bg-charleston shadow-lg ring-1 ring-charleston ring-opacity-5 focus:outline-none">
            <div className="py-1">
              <Menu.Item>
                {({ active }) => (
                  <a
                    href="#"
                    className={classNames(
                      active ? "bg-raisinblack text-light" : "text-light",
                      "group flex items-center px-4 py-2 text-sm"
                    )}
                    onClick={() => setOpen(true)}
                  >
                    <UserIcon
                      className="mr-3 h-5 w-5 text-light group-hover:text-light"
                      aria-hidden="true"
                    />
                    View Membership Info
                  </a>
                )}
              </Menu.Item>
              <Menu.Item>
                {({ active }) => (
                  <a
                    href="#"
                    className={classNames(
                      active ? "bg-raisinblack text-light" : "text-light",
                      "group flex items-center px-4 py-2 text-sm"
                    )}
                    onClick={() => setIsCreateModalOpen(true)} // Open the create/edit modal
                  >
                    <FaRegEdit
                      className="mr-3 h-5 w-5 text-light group-hover:text-light"
                      aria-hidden="true"
                    />
                    Edit Membership
                  </a>
                )}
              </Menu.Item>
            </div>

            <div className="py-1">
              <Menu.Item>
                {({ active }) => (
                  <a
                    href="#"
                    className={classNames(
                      active ? "bg-raisinblack text-light" : "text-light",
                      "group flex items-center px-4 py-2 text-sm"
                    )}
                    onClick={deleteBtn}
                  >
                    <TrashIcon
                      className="mr-3 h-5 w-5 text-light group-hover:text-light"
                      aria-hidden="true"
                    />
                    Delete
                  </a>
                )}
              </Menu.Item>
            </div>
          </Menu.Items>
        </Transition>
      </Menu>

      <Transition.Root show={open} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={setOpen}>
          <Transition.Child
            as={Fragment}
            enter="ease-in-out duration-500"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in-out duration-500"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-auto">
            <div className="absolute inset-0 overflow-hidden">
              <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
                <Transition.Child
                  as={Fragment}
                  enter="transform transition ease-in-out duration-500 sm:duration-700"
                  enterFrom="translate-x-full"
                  enterTo="translate-x-0"
                  leave="transform transition ease-in-out duration-500 sm:duration-700"
                  leaveFrom="translate-x-0"
                  leaveTo="translate-x-full"
                >
                  <Dialog.Panel className="pointer-events-auto w-screen max-w-xl">
                    <div className="flex h-full flex-col overflow-y-scroll bg-eerieblack py-6 shadow-xl">
                      <div className="px-4 sm:px-6">
                        <div className="flex items-start justify-between">
                          <Dialog.Title className="text-base font-semibold leading-6 text-light">
                            View Membership Info
                          </Dialog.Title>
                          <div className="ml-3 flex h-7 items-center">
                            <button
                              type="button"
                              className="relative rounded-md text-gray-400 hover:text-light focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                              onClick={() => setOpen(false)}
                            >
                              <span className="absolute -inset-2.5" />
                              <span className="sr-only">Close panel</span>
                              <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="relative mt-6 flex-1 flex-wrap overflow-hidden px-4 text-light sm:px-6">
                        {/* <JSONPretty data={selectedTier} theme={jsonTheme}></JSONPretty> */}
                        <table className="w-full table-auto ">
                          <tbody>
                            <tr>
                              <td className="p-2 font-bold text-gray-400">
                                Organization:
                              </td>
                              <td className="p-2">{selectedTier.orgname}</td>
                            </tr>
                            <tr>
                              <td className="p-2 font-bold text-gray-400">Membership:</td>
                              <td className="p-2">{selectedTier.name}</td>
                            </tr>
                            <tr>
                              <td className="p-2 font-bold text-gray-400">
                                Description:
                              </td>
                              <td className="p-2">{selectedTier.description}</td>
                            </tr>
                            <tr>
                              <td className="p-2 font-bold text-gray-400">
                                Registration Fee:
                              </td>
                              <td className="p-2">{selectedTier.registrationfee}</td>
                            </tr>
                            <tr>
                              <td className="p-2 align-top font-bold text-gray-400">
                                Features:
                              </td>
                              <td className="p-2">
                                <ul className="list-inside list-disc">
                                  {selectedTier.features ? (
                                    selectedTier.features.map(
                                      (feature: string, index: number) => (
                                        <li key={index}>{feature}</li>
                                      )
                                    )
                                  ) : (
                                    <a>N/A</a>
                                  )}
                                </ul>
                              </td>
                            </tr>
                            <tr>
                              <td className="p-2 font-bold text-gray-400">Size:</td>
                              <td className="p-2">
                                {selectedTier.total_members === 0
                                  ? "0 members"
                                  : `${selectedTier.total_members} 
                                  ${selectedTier.total_members === 1 ? "member" : "members"}`}
                              </td>
                            </tr>
                          </tbody>
                        </table>

                        <div className="mt-5 flex gap-2">
                          {/* <Link
                            className="group flex items-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-light text-white shadow-sm hover:bg-opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                            href={`/${selectedTier.slug}`}
                          >
                            Visit Page
                          </Link> */}
                          <button
                            className="group flex items-center rounded-md bg-blue-500 px-4 py-2 text-sm font-semibold text-light text-white shadow-sm hover:bg-opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                            onClick={() => {setIsCreateModalOpen(true); setOpen(false)}}
                          >
                            Edit
                          </button>

                          <button
                            className="group flex items-center rounded-md bg-rose-500 px-4 py-2 text-sm font-semibold text-light text-white shadow-sm hover:bg-opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                            onClick={deleteBtn}
                          >
                            Delete
                          </button>
                        </div>
                        <div className="mt-5">
                          {TierMembers.length > 0 ? (
                            <>
                              <h2 className="mb-2 text-lg font-semibold text-light">
                                Members:
                              </h2>
                              <table className="mt-5 min-w-full divide-y divide-[#525252]">
                                <thead className="bg-charleston ">
                                  <tr>
                                    <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-light sm:pl-6">
                                      First Name
                                    </th>
                                    <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-light sm:pl-6">
                                      Last Name
                                    </th>
                                    <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-light sm:pl-6">
                                      Join Date
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {TierMembers.map((member: any, index: number) => (
                                    <tr key={index}>
                                      <td className="py-3.5 pl-4 pr-3 text-left text-sm text-light sm:pl-6">
                                        {member.first_name}
                                      </td>
                                      <td className="py-3.5 pl-4 pr-3 text-left text-sm text-light sm:pl-6">
                                        {member.last_name}
                                      </td>
                                      <td className="py-3.5 pl-4 pr-3 text-left text-sm text-light sm:pl-6">
                                        {member.updatedat}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </>
                          ) : (
                            <p className="text-light">There are no members.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </Dialog.Panel>
                </Transition.Child>
              </div>
            </div>
          </div>
        </Dialog>
      </Transition.Root>

      <CreateMembershipModal
        organizationid={selectedTier.organizationid}
        membership={selectedTier}
        isOpen={isCreateModalOpen}
        onClose={handleCreateModalClose}
        onSubmit={handleCreateModalSubmit}
      />
    </>
  );
}
