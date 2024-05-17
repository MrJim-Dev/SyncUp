"use client";
import { useState, useEffect, useMemo } from "react";
import DataTable from "react-data-table-component";
import UserActionButton from "./user_action_button";
import { useDebounce } from "use-debounce";

export default function UsersTable({ users, userProfiles }) {
  const [tableData, setTableData] = useState([]);
  const [filterText, setFilterText] = useState("");
  const [debouncedFilterText] = useDebounce(filterText, 300);

  useEffect(() => {
    if (users.length && userProfiles.length) {
      const data = userProfiles.map((userProfile, index) => ({
        userProfile,
        user: users[index],
        open: false,
        setOpen: (open) => {
          setTableData((prevData) => {
            const newData = [...prevData];
            newData[index].open = open;
            return newData;
          });
        },
      }));
      setTableData(data);
    }
  }, [users, userProfiles]);

  const columns = [
    {
      name: "Name",
      selector: (row) =>
        `${row.userProfile?.data?.first_name} ${row.userProfile?.data?.last_name}`,
      sortable: true,
      cell: (row) => (
        <span
          className="hover:cursor-pointer hover:text-primary"
          onClick={() => row.setOpen(true)}
        >
          {row.userProfile?.data
            ? `${row.userProfile.data?.first_name} ${row.userProfile.data?.last_name}`
            : "Loading..."}
        </span>
      ),
    },
    {
      name: "Email",
      selector: (row) => row.user.email,
      sortable: true,
    },
    {
      name: "Role",
      selector: (row) => row.user.role,
      sortable: true,
    },
    {
      name: "Created",
      selector: (row) =>
        new Date(row.user.created_at).toLocaleString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        }),
      sortable: true,
    },
    {
      name: "Last Sign In",
      selector: (row) =>
        new Date(row.user.last_sign_in_at).toLocaleString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        }),
      sortable: true,
    },
    {
      name: "",
      cell: (row) => (
        <UserActionButton
          selectedUser={row.user}
          userProfile={row.userProfile?.data}
          open={row.open}
          setOpen={row.setOpen}
        />
      ),
      button: true,
    },
  ];

  const filteredData = useMemo(
    () =>
      tableData.filter((item) => {
        if (!debouncedFilterText) return true;
        const name = `${item.userProfile?.data?.first_name} ${item.userProfile?.data?.last_name}`;
        return (
          name.toLowerCase().includes(debouncedFilterText.toLowerCase()) ||
          item.user.email.toLowerCase().includes(debouncedFilterText.toLowerCase()) ||
          item.user.role.toLowerCase().includes(debouncedFilterText.toLowerCase())
        );
      }),
    [debouncedFilterText, tableData]
  );

  const subHeaderComponent = (
    <input
      type="text"
      placeholder="Search..."
      value={filterText}
      onChange={(e) => setFilterText(e.target.value)}
      className="block rounded-md border border-[#525252] bg-charleston px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
    />
  );

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-base font-semibold leading-6 text-light">Users</h1>
          <p className="mt-2 text-sm text-light">
            A list of all the users in your account including their name, title, email and
            role.
          </p>
        </div>
      </div>
      <div className="mt-8">
        {tableData.length > 0 ? (
          <DataTable
            columns={columns}
            data={filteredData}
            defaultSortField="name"
            pagination
            highlightOnHover
            subHeader
            subHeaderComponent={subHeaderComponent}
            className="bg-red-500"
            customStyles={{
              header: {
                style: {
                  backgroundColor: "rgb(36, 36, 36)",
                  color: "rgb(255, 255, 255)",
                },
              },
              subHeader: {
                style: {
                  backgroundColor: "none",
                  color: "rgb(255, 255, 255)",
                  padding: 0,
                  marginBottom: 10,
                },
              },
              rows: {
                style: {
                  minHeight: "6vh", // override the row height
                  backgroundColor: "rgb(33, 33, 33)",
                  color: "rgb(255, 255, 255)",
                },
              },
              headCells: {
                style: {
                  backgroundColor: "rgb(36, 36, 36)",
                  color: "rgb(255, 255, 255)",
                },
              },
              cells: {
                style: {
                  backgroundColor: "rgb(33, 33, 33)",
                  color: "rgb(255, 255, 255)",
                },
              },
              pagination: {
                style: {
                  backgroundColor: "rgb(33, 33, 33)",
                  color: "rgb(255, 255, 255)",
                },
              },
            }}
          />
        ) : (
          <p>Loading...</p>
        )}
      </div>
    </div>
  );
}
