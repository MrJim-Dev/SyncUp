"use client";
import { UserGroupIcon } from "@heroicons/react/24/outline";

const people = [
  {
    name: "Organization Name",
    membercount: "230",
    imageUrl:
      "https://images.unsplash.com/photo-1519345182560-3f2917c472ef?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=8&w=1024&h=1024&q=80",
    xUrl: "#",
    linkedinUrl: "#",
    description:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
  },
  {
    name: "Organization Name",
    membercount: "230",
    imageUrl:
      "https://images.unsplash.com/photo-1519345182560-3f2917c472ef?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=8&w=1024&h=1024&q=80",
    xUrl: "#",
    linkedinUrl: "#",
    description:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
  },
  {
    name: "Organization Name",
    membercount: "230",
    imageUrl:
      "https://images.unsplash.com/photo-1519345182560-3f2917c472ef?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=8&w=1024&h=1024&q=80",
    xUrl: "#",
    linkedinUrl: "#",
    description:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
  },
];

export default function Example() {
  return (
    <div className="bg-eerieblack py-14 sm:py-20">
      <div className="mx-auto max-w-2xl lg:text-center">
        <p
          id="community"
          className="mt-2 text-3xl font-bold tracking-tight text-light sm:text-4xl"
        >
          Explore Our Community
        </p>
        <p className="mt-6 text-lg leading-8 text-light">
          Discover subscribed organizations, their missions, events, and member
          engagement. Click to explore and connect.
        </p>
      </div>
      <div className="mx-auto max-w-7xl px-6 text-center lg:px-8">
        <ul className="mx-auto mt-20 grid max-w-2xl grid-cols-1 gap-6 sm:grid-cols-2 lg:mx-0 lg:max-w-none lg:grid-cols-3 lg:gap-8">
          {people.map((person) => (
            <li
              key={person.name}
              className="transform rounded-2xl px-8 py-10 transition duration-200 hover:scale-105 hover:bg-charleston"
            >
              <img
                className="mx-auto h-48 w-48 rounded-full md:h-56 md:w-56"
                src={person.imageUrl}
                alt=""
              />
              <h3 className="mt-6 text-base font-semibold leading-7 tracking-tight text-light">
                {person.name}
              </h3>
              <p className="text-sm leading-6 text-gray-400">
                <UserGroupIcon className="h-y5 mx-1 -mt-1 inline-block w-5 text-primary" />
                {person.membercount} members
              </p>
              <p className="mt-6 text-base font-normal text-light">
                {person.description}
              </p>
              <div className="mt-2 flex items-center justify-center gap-x-6">
                <a
                  href="#"
                  className="my-2 rounded-md bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primarydark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                >
                  View
                </a>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
