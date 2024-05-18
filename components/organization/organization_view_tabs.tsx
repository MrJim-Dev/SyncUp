"use client";

import { useState } from "react";
import OrganizationEventsComponent from "./organization_events";
import OrganizationMembershipsComponent from "./organization_membership";
import OrganizationPostsComponent from "./organization_posts";

import { Membership, MembershipsProps } from "@/lib/types";
import { useParams } from "next/navigation";

const TabsComponent = ({ organizationid, memberships, id}) => {
  const [activeTab, setActiveTab] = useState("posts");

  const handleTabChange = (tab: any) => {
    setActiveTab(tab);
  };

  let tabContent = null;
  if (activeTab === "posts") {
    tabContent = <OrganizationPostsComponent />;
  } else if (activeTab === "membership") {
    tabContent = <OrganizationMembershipsComponent memberships = {memberships} userid={id}/>;
  } else if (activeTab === "events") {
    tabContent = <OrganizationEventsComponent organizationid={organizationid} />;
  }

  return (
    <div>
      <div className="mt-4 flex justify-center sm:mt-4 lg:mt-6">
        <a
          className={`mr-4 cursor-pointer text-light ${
            activeTab === "posts" ? "font-semibold text-primary" : ""
          }`}
          onClick={() => handleTabChange("posts")}
        >
          Posts
        </a>
        <a
          className={`mr-4 cursor-pointer text-light ${
            activeTab === "membership" ? "font-semibold text-primary" : ""
          }`}
          onClick={() => handleTabChange("membership")}
        >
          Membership
        </a>
        <a
          className={`cursor-pointer text-light ${
            activeTab === "events" ? "font-semibold text-primary" : ""
          }`}
          onClick={() => handleTabChange("events")}
        >
          Events
        </a>
      </div>
      <hr className="mt-2 border-t border-[#525252]" />
      <div className="mt-8">{tabContent}</div>
    </div>
  );
};

export default TabsComponent;
