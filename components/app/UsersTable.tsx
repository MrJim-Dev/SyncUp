import { getAllUsers } from "@/lib/supabase/server";
import { getUserProfileById } from "@/lib/userActions";
import { User } from "@supabase/auth-js/dist/module/lib/types";
import UserActionButton from "./user_action_button";

export default async function UsersTable() {
  const users: User[] = (await getAllUsers()) ?? [];
  const userProfiles = await Promise.all(
    users.map((user) => getUserProfileById(user.id))
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
      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
              <table
                className="min-w-full divide-y divide-[#525252]"
                style={{ minHeight: "60vh" }}
              >
                <thead className="bg-charleston">
                  <tr>
                    <th
                      scope="col"
                      className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-light sm:pl-6"
                    >
                      Name
                    </th>

                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-light"
                    >
                      Email
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-light"
                    >
                      Role
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-light"
                    >
                      Created
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-light"
                    >
                      Last Sign In
                    </th>
                    <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                      <span className="sr-only">Edit</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#525252] bg-raisinblack">
                  {userProfiles.map((userProfile, index) => (
                    <tr key={users[index].email}>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-light sm:pl-6">
                        {userProfile?.data
                          ? `${userProfile.data?.first_name} ${userProfile.data?.last_name}`
                          : "Loading..."}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-light">
                        {users[index].email}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-light">
                        {users[index].role}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-light">
                        {new Date(users[index].created_at).toLocaleDateString()}{" "}
                        {new Date(users[index].created_at).toLocaleTimeString()}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-light">
                        {users[index].last_sign_in_at ?? ""}
                      </td>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                        <UserActionButton selectedUser={users[index]} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
