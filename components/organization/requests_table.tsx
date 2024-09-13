"use client";
import { useState, useEffect } from "react";
import DataTable from "react-data-table-component";
import { createClient } from "@/lib/supabase/client";
import { useDebounce } from "use-debounce";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { format } from "date-fns";

const supabase = createClient();

interface OrganizationRequest {
  id: number;
  status: string;
  created_at: string;
  org_id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface RequestsTableProps {
  requests: OrganizationRequest[];
}

const RequestsTable: React.FC<RequestsTableProps> = ({ requests }) => {
  const [tableData, setTableData] = useState<OrganizationRequest[]>(requests);
  const [filterText, setFilterText] = useState<string>("");
  const [debouncedFilterText] = useDebounce(filterText, 300);
  const [statusFilter, setStatusFilter] = useState<string>("");

  useEffect(() => {
    setTableData(requests);
  }, [requests]);

  const handleStatusChange = async (id: number, newStatus: string) => {
    const { error } = await supabase
      .from("organization_requests")
      .update({ status: newStatus })
      .eq("id", id);

    if (error) {
      toast.error("Failed to update status. Please try again.");
    } else {
      toast.success("Status updated successfully!");
      setTableData((prevData) =>
        prevData.map((request) =>
          request.id === id ? { ...request, status: newStatus } : request
        )
      );
    }
  };

  const handleAcceptAll = async () => {
    const { error } = await supabase
      .from("organization_requests")
      .update({ status: "approved" })
      .eq("status", "pending");

    if (error) {
      toast.error("Failed to accept all pending requests. Please try again.");
    } else {
      toast.success("All pending requests accepted successfully!");
      setTableData((prevData) =>
        prevData.map((request) =>
          request.status === "pending" ? { ...request, status: "approved" } : request
        )
      );
    }
  };

  const columns = [
    {
      name: "Name",
      selector: (row: OrganizationRequest) => `${row.first_name} ${row.last_name}`,
      sortable: true,
    },
    {
      name: "Email",
      selector: (row: OrganizationRequest) => row.email,
      sortable: true,
    },
    {
      name: "Status",
      selector: (row: OrganizationRequest) => row.status,
      sortable: true,
      cell: (row: OrganizationRequest) => (
        <div className="group relative">
          <span
            className={`cursor-pointer rounded-2xl border px-2 py-1 text-xs ${
              row.status === "pending"
                ? "border-yellow-400 bg-yellow-200 text-yellow-800"
                : row.status === "approved"
                  ? "border-green-400 bg-green-200 text-green-800"
                  : "border-red-400 bg-red-200 text-red-800"
            }`}
          >
            {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
          </span>
          <div className="absolute z-50 mt-1 hidden min-w-[100px] !rounded-md bg-charleston shadow-lg group-hover:block">
            <div
              className="cursor-pointer p-3 text-white hover:bg-gray-600"
              onClick={() => handleStatusChange(row.id, "approved")}
            >
              Approve
            </div>
            <div
              className="cursor-pointer p-3 text-white hover:bg-gray-600"
              onClick={() => handleStatusChange(row.id, "rejected")}
            >
              Reject
            </div>
          </div>
        </div>
      ),
    },
    {
      name: "Requested At",
      selector: (row: OrganizationRequest) => row.created_at,
      sortable: true,
      cell: (row: OrganizationRequest) =>
        format(new Date(row.created_at), "MMM d, yyyy h:mma"),
    },
  ];

  const filteredData = tableData.filter((item) => {
    if (!debouncedFilterText && !statusFilter) return true;
    const name = `${item.first_name} ${item.last_name}`;
    return (
      (name.toLowerCase().includes(debouncedFilterText.toLowerCase()) ||
        item.email.toLowerCase().includes(debouncedFilterText.toLowerCase())) &&
      (!statusFilter || item.status === statusFilter)
    );
  });

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-base font-semibold leading-6 text-light">
            Organization Requests
          </h1>
          <p className="mt-2 text-sm text-light">
            A list of all the requests to join this organization.
          </p>
        </div>
        <div className="sm:flex sm:items-center sm:justify-end">
          <input
            type="text"
            placeholder="Search..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="block rounded-md border border-[#525252] bg-charleston px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="ml-2 block rounded-md border border-[#525252] bg-charleston px-3 py-2 text-white shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
          >
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <button
            onClick={handleAcceptAll}
            className="ml-2 rounded-md bg-green-500 px-3 py-2 text-sm text-white hover:bg-green-600"
          >
            Accept All
          </button>
        </div>
      </div>
      <div className="mt-8">
        <DataTable
          columns={columns}
          data={filteredData}
          pagination
          highlightOnHover
          customStyles={{
            table: { style: { backgroundColor: "rgb(33, 33, 33)" } },
            headRow: { style: { backgroundColor: "rgb(36, 36, 36)" } },
            headCells: { style: { color: "rgb(255, 255, 255)" } },
            rows: {
              style: { backgroundColor: "rgb(33, 33, 33)", color: "rgb(255, 255, 255)" },
              highlightOnHoverStyle: {
                backgroundColor: "rgb(44, 44, 44)",
                color: "rgb(255, 255, 255)",
                transitionDuration: "0.15s",
                transitionProperty: "background-color",
                zIndex: 1,
                position: "relative",
                overflow: "visible",
              },
            },
            pagination: {
              style: { backgroundColor: "rgb(33, 33, 33)", color: "rgb(255, 255, 255)" },
            },
          }}
        />
      </div>
    </div>
  );
};

export default RequestsTable;
