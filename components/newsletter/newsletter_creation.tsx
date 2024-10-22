"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Event } from "@/types/event";
import { CombinedUserData } from "@/types/combined_user_data";
import DataTable, { TableColumn, TableStyles } from "react-data-table-component";
import dynamic from "next/dynamic";
import { Disclosure } from "@headlessui/react";
import { ChevronUpIcon, ChevronDownIcon } from "@heroicons/react/20/solid";
import { z } from "zod";
import axios from "axios";
import { useDropzone } from "react-dropzone";
import { fetchMembersByEvent, check_permissions } from "@/lib/newsletter_actions";
import { useUser } from "@/context/user_context";
import Swal from "sweetalert2";
import Preloader from "@/components/preloader";

const RichTextEditor = dynamic(() => import("@mantine/rte"), { ssr: false });

interface NewsletterCreationProps {
  organizationName: string;
  organizationId: string;
  organizationSlug: string;
  events: Event[];
  users: CombinedUserData[];
}

const newsletterSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  content: z.string().min(1, "Content is required"),
});

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

const customStyles: TableStyles = {
  table: {
    style: {
      tableLayout: "fixed",
      width: "100%",
      backgroundColor: "transparent",
    },
  },
  headRow: {
    style: {
      backgroundColor: "#212121", // Customize the header row background color
      color: "#ffffff", // Customize the header row text color
    },
  },
  headCells: {
    style: {
      color: "#ffffff", // Customize the header cell text color
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
      padding: "8px",
      backgroundColor: "#212121", // Customize the header cell background color
      borderRadius: "8px",
    },
  },
  cells: {
    style: {
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
      padding: "8px",
      backgroundColor: "transparent",
    },
  },
  rows: {
    style: {
      backgroundColor: "transparent",
      color: "#ffffff",
    },
  },
  pagination: {
    style: {
      backgroundColor: "transparent",
      color: "#ffffff",
      justifyContent: "center",
    },
  },
  noData: {
    style: {
      backgroundColor: "transparent",
      color: "#ffffff",
    },
  },
};

const NewsletterCreation: React.FC<NewsletterCreationProps> = ({
  organizationName,
  organizationId,
  organizationSlug,
  events,
  users,
}) => {
  const { user } = useUser();

  const [hasPermission, setHasPermission] = useState(false);
  const [checkingPermission, setCheckingPermission] = useState(true); // New state for loading
  const [editorState, setEditorState] = useState("");
  const [subject, setSubject] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<CombinedUserData[]>([]);
  const [selectedEvents, setSelectedEvents] = useState<Event[]>([]);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [eventsSearch, setEventsSearch] = useState("");
  const [usersSearch, setUsersSearch] = useState("");

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => setAttachments((prev) => [...prev, ...acceptedFiles]),
  });

  useEffect(() => {
    async function checkUserPermissions() {
      setCheckingPermission(true); // Start loading
      try {
        const permission = await check_permissions(
          organizationId,
          "send_newsletters",
          user?.id || ""
        );
        setHasPermission(permission);
      } catch (error) {
        console.error("Error checking permissions:", error);
        setHasPermission(false);
      } finally {
        setCheckingPermission(false); // End loading
      }
    }

    if (user && organizationId) {
      checkUserPermissions();
    } else {
      setHasPermission(false);
      setCheckingPermission(false);
    }
  }, [user, organizationId]);

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const validateForm = () => {
    try {
      const formData = { subject, content: editorState };
      newsletterSchema.parse(formData);

      if (selectedUsers.length === 0 && selectedEvents.length === 0) {
        Swal.fire("Error", "At least one recipient is required", "error");
        return false;
      }

      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        Swal.fire(
          "Validation Error",
          err.errors.map((e) => e.message).join(", "),
          "error"
        );
      }
      return false;
    }
  };

  const handleSendNewsletter = async () => {
    if (!validateForm()) return;

    setSending(true);
    try {
      const selectedEventUsers = await Promise.all(
        selectedEvents.map((event) => fetchMembersByEvent(event.eventid))
      ).then((results) => results.flat());

      const combinedUsers = [...selectedUsers, ...selectedEventUsers];
      const uniqueUsers = combinedUsers.filter(
        (user, index, self) => index === self.findIndex((t) => t.email === user.email)
      );

      if (uniqueUsers.length === 0) {
        Swal.fire("Error", "At least one recipient is required.", "error");
        setSending(false);
        return;
      }

      const formData = new FormData();
      formData.append("fromName", organizationName);
      formData.append("replyToExtension", organizationSlug);
      formData.append("recipients", JSON.stringify(uniqueUsers.map((u) => u.email)));
      formData.append("subject", subject);
      formData.append("message", editorState);
      attachments.forEach((file) => formData.append("attachments", file));

      const response = await axios.post(
        "/api/newsletter/send-newsletter-email",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      if (response.status === 200) {
        Swal.fire("Success", "Newsletter sent successfully!", "success");
        setAttachments([]);
        setSubject("");
        setEditorState("");
        setSelectedUsers([]);
        setSelectedEvents([]);
      } else {
        Swal.fire("Error", "Failed to send newsletter.", "error");
      }
    } catch (error: any) {
      Swal.fire(
        "Error",
        error.response?.data?.message || "Failed to send newsletter.",
        "error"
      );
    } finally {
      setSending(false);
    }
  };

  const eventColumns: TableColumn<Event>[] = [
    {
      name: "Title",
      selector: (row: Event) => row.title,
      sortable: true,
      id: "title",
      width: "150px",
    },
    {
      name: "Location",
      selector: (row: Event) => row.location,
      sortable: true,
      id: "location",
      width: "120px",
    },
    {
      name: "Date",
      selector: (row: Event) => new Date(row.starteventdatetime).toLocaleDateString(),
      sortable: true,
      id: "startDate",
      width: "140px",
    },
  ];

  const userColumns: TableColumn<CombinedUserData>[] = [
    {
      name: "Email",
      selector: (row: CombinedUserData) => row.email || "",
      sortable: true,
      id: "email",
      width: "200px",
    },
    {
      name: "First Name",
      selector: (row: CombinedUserData) => row.first_name || "",
      sortable: true,
      id: "firstName",
      width: "120px",
    },
    {
      name: "Last Name",
      selector: (row: CombinedUserData) => row.last_name || "",
      sortable: true,
      id: "lastName",
      width: "120px",
    },
  ];

  const filteredEvents = useMemo(() => {
    if (!eventsSearch) return events;
    return events.filter((event) =>
      Object.values(event).join(" ").toLowerCase().includes(eventsSearch.toLowerCase())
    );
  }, [events, eventsSearch]);

  const filteredUsers = useMemo(() => {
    if (!usersSearch) return users;
    return users.filter((user) =>
      Object.values(user).join(" ").toLowerCase().includes(usersSearch.toLowerCase())
    );
  }, [users, usersSearch]);

  return (
    <div className="mx-auto max-w-6xl rounded-lg bg-[#1f1f1f] p-4 shadow-lg">
      {checkingPermission ? (
        <Preloader />
      ) : !hasPermission ? (
        <div className="text-center text-lg font-semibold text-red-500">
          You do not have permission to send newsletters.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="flex flex-col space-y-4">
              <input
                className="focus:ring-primary-light w-full rounded border border-primary bg-charleston p-3 text-sm text-white placeholder-gray-400 focus:ring"
                type="text"
                placeholder="Subject*"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
              <div
                className="flex flex-col space-y-4"
                style={{ minHeight: "200px", height: "auto" }}
              >
                <RichTextEditor
                  value={editorState}
                  onChange={setEditorState}
                  className="rounded border border-primary text-white"
                  styles={{
                    root: {
                      backgroundColor: "#2a2a2a",
                      color: "#ffffff",
                      minHeight: "200px",
                      height: "auto",
                    },
                    content: {
                      minHeight: "200px",
                      height: "auto",
                      maxHeight: "60vh", // Adjust as needed
                      overflowY: "auto", // Enables scrolling when content exceeds maxHeight
                    },
                    toolbar: {
                      backgroundColor: "#2a2a2a",
                      borderColor: "#444444",
                    },
                    toolbarControl: {
                      backgroundColor: "#2a2a2a",
                      "&:hover": { backgroundColor: "#3a3a3a" },
                    },
                  }}
                />
              </div>
              <div>
                <div
                  {...getRootProps()}
                  className={`mt-2 cursor-pointer rounded border-2 border-dashed p-4 text-center text-sm text-gray-400 ${
                    isDragActive ? "border-primary text-primary" : "border-gray-500"
                  }`}
                >
                  <input {...getInputProps()} />
                  <p>
                    {isDragActive
                      ? "Drop the files here..."
                      : "Drag & drop files here, or click to select files"}
                  </p>
                </div>
                {attachments.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {attachments.map((file, index) => (
                      <li
                        key={index}
                        className="flex items-center justify-between rounded bg-charleston p-2"
                      >
                        <span className="text-sm text-white">{file.name}</span>
                        <button
                          onClick={() => removeAttachment(index)}
                          className="text-xs text-red-500 hover:text-red-700"
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={handleSendNewsletter}
                  className="hover:bg-primary-dark focus:ring-primary-light w-40 rounded bg-primary py-2 text-sm text-white focus:outline-none focus:ring disabled:opacity-50"
                  disabled={sending}
                >
                  {sending ? "Sending..." : "Send Newsletter"}
                </button>
              </div>
            </div>
            <div className="flex flex-col space-y-4 rounded-lg bg-[#2a2a2a] p-4">
              <h2 className="text-lg font-semibold text-white">Select Recipients</h2>
              <Disclosure>
                {({ open }) => (
                  <>
                    <Disclosure.Button className="flex w-full items-center justify-between rounded bg-[#333333] px-3 py-2 text-left text-sm font-medium text-white focus:outline-none focus-visible:ring focus-visible:ring-opacity-75">
                      <span>Events</span>
                      {open ? (
                        <ChevronUpIcon className="h-4 w-4 text-white" />
                      ) : (
                        <ChevronDownIcon className="h-4 w-4 text-white" />
                      )}
                    </Disclosure.Button>
                    <Disclosure.Panel className="mt-2 space-y-2">
                      {events.length > 0 && (
                        <div className="relative border-b-2">
                          <svg
                            className="absolute right-2 top-1/2 h-5 w-5 -translate-y-1/2 transform text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M21 21l-4.35-4.35m1.35-5.65a7 7 0 11-14 0 7 7 0 0114 0z"
                            ></path>
                          </svg>
                          <input
                            type="text"
                            placeholder="Search Events..."
                            value={eventsSearch}
                            onChange={(e) => setEventsSearch(e.target.value)}
                            className="w-full border-gray-500 border-transparent bg-charleston p-2 text-sm text-white placeholder-gray-400 focus:border-primary focus:ring-0"
                          />
                        </div>
                      )}
                      <div className="overflow-x-auto">
                        <DataTable
                          keyField="eventid"
                          columns={eventColumns}
                          data={filteredEvents}
                          selectableRows
                          onSelectedRowsChange={(state) =>
                            setSelectedEvents(state.selectedRows)
                          }
                          pagination
                          fixedHeader
                          fixedHeaderScrollHeight="200px"
                          customStyles={customStyles}
                          noDataComponent={
                            <div className="text-center">No events found.</div>
                          }
                          defaultSortFieldId="startDate"
                          defaultSortAsc={false}
                        />
                      </div>
                    </Disclosure.Panel>
                  </>
                )}
              </Disclosure>
              <Disclosure>
                {({ open }) => (
                  <>
                    <Disclosure.Button className="flex w-full items-center justify-between rounded bg-[#333333] px-3 py-2 text-left text-sm font-medium text-white focus:outline-none focus-visible:ring focus-visible:ring-opacity-75">
                      <span>Individual Users</span>
                      {open ? (
                        <ChevronUpIcon className="h-4 w-4 text-white" />
                      ) : (
                        <ChevronDownIcon className="h-4 w-4 text-white" />
                      )}
                    </Disclosure.Button>
                    <Disclosure.Panel className="mt-2 space-y-2">
                      {users.length > 0 && (
                        <div className="relative border-b-2">
                          <svg
                            className="absolute right-2 top-1/2 h-5 w-5 -translate-y-1/2 transform text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M21 21l-4.35-4.35m1.35-5.65a7 7 0 11-14 0 7 7 0 0114 0z"
                            ></path>
                          </svg>
                          <input
                            type="text"
                            placeholder="Search Users..."
                            value={usersSearch}
                            onChange={(e) => setUsersSearch(e.target.value)}
                            className="w-full border-gray-500 border-transparent bg-charleston p-2 text-sm text-white placeholder-gray-400 focus:border-primary focus:ring-0"
                          />
                        </div>
                      )}
                      <div className="overflow-x-auto">
                        <DataTable
                          keyField="email"
                          columns={userColumns}
                          data={filteredUsers}
                          selectableRows
                          onSelectedRowsChange={(state) =>
                            setSelectedUsers(state.selectedRows)
                          }
                          pagination
                          fixedHeader
                          fixedHeaderScrollHeight="200px"
                          customStyles={customStyles}
                          noDataComponent={
                            <div className="text-center">No users found.</div>
                          }
                          defaultSortFieldId="email"
                          defaultSortAsc={false}
                        />
                      </div>
                    </Disclosure.Panel>
                  </>
                )}
              </Disclosure>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default NewsletterCreation;
