"use client";
import { useState } from "react"; // Add this import
import { signInWithGoogle, signInWithPassword } from "@/lib/auth";
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'; // Add Heroicons import

export default function SignIn({ searchParams }: { searchParams: any }) {
  const [showPassword, setShowPassword] = useState(false); // Add state for password visibility

  return (
    <>
      <div className="flex min-h-full flex-1 flex-col justify-center bg-eerieblack py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <img className="mx-auto h-10 w-auto" src="syncup.png" alt="SyncUp" />
          <h2 className="mt-6 text-center text-2xl font-bold leading-9 tracking-tight text-light">
            Sign in to your account
          </h2>
        </div>

        <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-[480px] px-6 ">
          <div className="bg-charleston px-6 py-12 shadow rounded-lg sm:px-12">
            {(searchParams?.error || searchParams?.success) && (
              <div
                className={`rounded-md ${searchParams.error ? "bg-red-50" : "bg-green-50"} p-4`}
              >
                <p
                  className={`text-center text-sm font-medium ${searchParams?.error ? "text-red-800" : "text-green-800"}`}
                >
                  {searchParams?.error} {searchParams?.success}
                </p>
              </div>
            )}
            <form action={signInWithPassword} className="space-y-3">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium leading-6 text-light"
                >
                  Email address
                </label>
                <div className="mt-2">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="block w-full rounded-md border-0 bg-charleston py-1.5 text-light shadow-sm ring-1 ring-inset ring-light placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium leading-6 text-light"
                >
                  Password
                </label>
                <div className="relative mt-2">
                  {" "}
                  {/* Add relative positioning */}
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"} // Toggle password visibility
                    autoComplete="current-password"
                    required
                    className="block w-full rounded-md border-0 bg-charleston py-1.5 text-light shadow-sm ring-1 ring-inset ring-light placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)} // Toggle function
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-sm text-light" // Changed color to match border
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="h-5 w-5" aria-hidden="true" /> // Use EyeSlashIcon for hide
                    ) : (
                      <EyeIcon className="h-5 w-5" aria-hidden="true" /> // Use EyeIcon for show
                    )}{" "}
                    {/* Eye icon for password visibility */}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="focus:primary h-4 w-4 rounded border-gray-300 text-primary"
                  />
                  <label
                    htmlFor="remember-me"
                    className="ml-3 block text-sm leading-6 text-light"
                  >
                    Remember me
                  </label>
                </div>

                <div className="text-sm leading-6">
                  <a
                    href="forgot-password"
                    className="font-semibold text-primarydark hover:text-primary"
                  >
                    Forgot password?
                  </a>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  className="flex w-full justify-center rounded-md bg-primary px-3 py-1.5 text-sm font-semibold leading-6 text-light *:shadow-sm hover:bg-primarydark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  Sign in
                </button>
              </div>
            </form>

            <div>
              <div className="relative mt-6">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-sm font-medium leading-6">
                  <span className="bg-charleston px-6 text-light">Or continue with</span>
                </div>
              </div>

              <form className="mt-6 grid gap-4">
                <button
                  type="submit"
                  onClick={async (e) => {
                    e.preventDefault(); // Prevent default form submission
                    await signInWithGoogle(); // Call the server action
                  }}
                  className="flex w-full items-center justify-center gap-3 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus-visible:ring-transparent"
                >
                  <svg className="h-5 w-5" aria-hidden="true" viewBox="0 0 24 24">
                    <path
                      d="M12.0003 4.75C13.7703 4.75 15.3553 5.36002 16.6053 6.54998L20.0303 3.125C17.9502 1.19 15.2353 0 12.0003 0C7.31028 0 3.25527 2.69 1.28027 6.60998L5.27028 9.70498C6.21525 6.86002 8.87028 4.75 12.0003 4.75Z"
                      fill="#EA4335"
                    />
                    <path
                      d="M23.49 12.275C23.49 11.49 23.415 10.73 23.3 10H12V14.51H18.47C18.18 15.99 17.34 17.25 16.08 18.1L19.945 21.1C22.2 19.01 23.49 15.92 23.49 12.275Z"
                      fill="#4285F4"
                    />
                    <path
                      d="M5.26498 14.2949C5.02498 13.5699 4.88501 12.7999 4.88501 11.9999C4.88501 11.1999 5.01998 10.4299 5.26498 9.7049L1.275 6.60986C0.46 8.22986 0 10.0599 0 11.9999C0 13.9399 0.46 15.7699 1.28 17.3899L5.26498 14.2949Z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12.0004 24.0001C15.2404 24.0001 17.9654 22.935 19.9454 21.095L16.0804 18.095C15.0054 18.82 13.6204 19.245 12.0004 19.245C8.8704 19.245 6.21537 17.135 5.2654 14.29L1.27539 17.385C3.25539 21.31 7.3104 24.0001 12.0004 24.0001Z"
                      fill="#34A853"
                    />
                  </svg>
                  <span className="text-sm font-semibold leading-6">Google</span>
                </button>
              </form>
            </div>
          </div>

          <p className="mt-10 text-center text-sm text-gray-500">
            Don&apos;t have an account?{" "}
            <a
              href="/signup"
              className="font-semibold leading-6 text-primarydark hover:text-primary"
            >
              Sign up
            </a>
          </p>
        </div>
      </div>
    </>
  );
}
