"use client";

import { useState } from "react";
import OrganizationEventsComponent from "./organization_events";
import OrganizationMembershipsComponent from "./organization_membership";
import OrganizationPostsComponent from "./organization_posts";

const TabsComponent = ({
  organizationid,
  memberships,
  events,
  posts
}: {
  organizationid: any;
  memberships: any;
  events: any;
  posts: any;
}) => {

  const [activeTab, setActiveTab] = useState("posts");

  const handleTabChange = (tab: any) => {
    setActiveTab(tab);
  };

  let tabContent = null;
  if (activeTab === "posts") {
    tabContent = (
      <OrganizationPostsComponent organizationid={organizationid} posts={posts} />
    );
  } else if (activeTab === "membership") {
    tabContent = <OrganizationMembershipsComponent memberships={memberships} />;
  } else if (activeTab === "events") {
    tabContent = <OrganizationEventsComponent events={events} />;
  }

  return (
    <div>
      <div>
        <div className="border-b border-gray-700">
          <nav className="-mb-px flex space-x-8 px-4 sm:px-6" aria-label="Tabs">
            <button
              onClick={() => handleTabChange("posts")}
              className={`whitespace-nowrap border-b-2 px-1 py-4 text-base font-medium ${
                activeTab === "posts"
                  ? "border-primary text-primary"
                  : "border-transparent text-light hover:border-gray-300 hover:text-gray-300"
              }`}
            >
              Posts
            </button>
            <button
              onClick={() => handleTabChange("membership")}
              className={`whitespace-nowrap border-b-2 px-1 py-4 text-base font-medium ${
                activeTab === "membership"
                  ? "border-primary text-primary"
                  : "border-transparent text-light hover:border-gray-300 hover:text-gray-300"
              }`}
            >
              Membership
            </button>
            <button
              onClick={() => handleTabChange("events")}
              className={`whitespace-nowrap border-b-2 px-1 py-4 text-base font-medium ${
                activeTab === "events"
                  ? "border-primary text-primary"
                  : "border-transparent text-light hover:border-gray-300 hover:text-gray-300"
              }`}
            >
              Events
            </button>
          </nav>
        </div>
        <div className="mt-8">{tabContent}</div>
      </div>
    </div>
  );
};

export default TabsComponent;
