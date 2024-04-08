import { forgotPassword } from "@/lib/auth";

export default function ForgotPassword({ searchParams }: { searchParams: any }) {
  return (
    <>
      <div className="flex min-h-full flex-1 flex-col justify-center bg-gray-50 py-12 sm:px-6 lg:px-8">
        <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-[480px]">
          <div className="m-3 rounded-lg bg-white px-6 py-12 shadow sm:px-12">
            <div className="mb-6 sm:mx-auto sm:w-full sm:max-w-md">
              <img
                className="mx-auto h-10 w-auto"
                src="https://tailwindui.com/img/logos/mark.svg?color=indigo&shade=600"
                alt="Your Company"
              />
              <h2 className="mt-3 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">
                Reset your password
              </h2>
              <p className="text-center text-sm text-gray-600">
                Enter your email to receive instructions on how to reset your password.
              </p>
            </div>

            {/* Sucess / Error Message */}
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

            <form action={forgotPassword} className="space-y-3">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium leading-6 text-gray-900"
                >
                  Email
                </label>
                <div className="mt-2">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  className="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                >
                  Reset Password
                </button>
              </div>
            </form>
          </div>
          <p className="mt-6 text-center text-sm text-gray-500">
            <a
              href="/signin"
              className="font-semibold  text-indigo-600 hover:text-indigo-500"
            >
              Return to login
            </a>
          </p>
        </div>
      </div>
    </>
  );
}