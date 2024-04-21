"use client";

import { CiFacebook, CiInstagram, CiTwitter } from "react-icons/ci";

const navigation = [
  {
    name: "Facebook",
    href: "#",
    icon: (props: any) => (
      <CiFacebook className="inline-block h-7 w-7 text-light hover:text-primary " />
    ),
  },
  {
    name: "Instagram",
    href: "#",
    icon: (props: any) => (
      <CiInstagram className="inline-block h-7 w-7 text-light hover:text-primary" />
    ),
  },
  {
    name: "X",
    href: "#",
    icon: (props: any) => (
      <CiTwitter className="inline-block h-7 w-7 text-light hover:text-primary" />
    ),
  },
];

export default function Footer() {
  return (
    <footer className="bg-eerieblack">
      <div className="mx-auto flex max-w-7xl px-6 py-12 max-sm:flex-col max-sm:gap-5 md:items-center md:justify-between lg:px-8">
        <div className="flex justify-center max-sm:order-1 ">
          <a href="#" className="-m-1.5 p-1.5">
            <span className="sr-only">SyncUp</span>
            <img className="h-8 w-auto" src="Symbian.png" alt="" />
          </a>
          <div className="font text-l flex items-center px-2 font-semibold text-light">
            Sync Up
          </div>
        </div>
        <div className="mt-4 max-sm:order-3 md:mt-0">
          <p className="text-center text-xs  text-gray-500">
            &copy; Copyright 2024 SyncUp. All rights reserved.
          </p>
        </div>
        <div className="flex justify-center space-x-4 max-sm:order-2">
          {navigation.map((item) => (
            <a
              key={item.name}
              href={item.href}
              className="text-light hover:text-gray-500"
            >
              <span className="sr-only">{item.name}</span>
              <item.icon className="h-6 w-6" aria-hidden="true" />
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
