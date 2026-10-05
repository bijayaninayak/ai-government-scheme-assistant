"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Scheme {
  scheme_name: string;
  benefit: string;
  reasons: string[];
}

interface User {
  id: string;
  name: string;
  email: string;
}

export default function Home() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);

  const [age, setAge] = useState("");
  const [income, setIncome] = useState("");
  const [occupation, setOccupation] = useState("");
  const [state, setState] = useState("");
  const [category, setCategory] = useState("");

  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Check whether user is logged in
  useEffect(() => {
    const savedUser = localStorage.getItem("user");

    if (!savedUser) {
      router.push("/login");
      return;
    }

    setUser(JSON.parse(savedUser));
  }, [router]);

  // Logout
  const handleLogout = () => {
    localStorage.removeItem("user");
    router.push("/login");
  };

  // Check eligibility
  const checkEligibility = async () => {
    setError("");
    setSchemes([]);

    if (!age || !income || !occupation || !state || !category) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/check-eligibility",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            age: Number(age),
            income: Number(income),
            occupation: occupation,
            state: state,
            category: category,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to check eligibility");
      }

      const data = await response.json();

      setSchemes(data.eligible_schemes);
    } catch (err) {
      console.error(err);
      setError("Unable to connect to the backend.");
    } finally {
      setLoading(false);
    }
  };

  // Prevent page from showing before login check
  if (!user) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-gray-600">
          Loading...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 px-6 py-10">

      <div className="mx-auto max-w-4xl">

        {/* Top Bar */}
        <div className="mb-8 flex items-center justify-between rounded-xl bg-white px-5 py-4 shadow">

          <div>
            <p className="text-sm text-gray-500">
              Welcome back
            </p>

            <h2 className="text-xl font-bold text-gray-900">
              👋 {user.name}
            </h2>
          </div>

          <button
            onClick={handleLogout}
            className="rounded-lg bg-red-500 px-4 py-2 font-medium text-white hover:bg-red-600"
          >
            Logout
          </button>

        </div>

        {/* Header */}
        <div className="mb-10 text-center">

          <div className="mb-3 text-5xl">
            🏛️
          </div>

          <h1 className="text-4xl font-bold text-gray-900">
            AI Government Scheme
            <br />
            Eligibility Assistant
          </h1>

          <p className="mt-3 text-gray-600">
            Find government schemes you may be eligible for.
          </p>

        </div>

        {/* Form */}
        <div className="rounded-2xl bg-white p-8 shadow-lg">

          <h2 className="mb-6 text-2xl font-bold text-gray-900">
            Enter Your Details
          </h2>

          <div className="grid gap-5 md:grid-cols-2">

            {/* Age */}
            <div>
              <label className="mb-2 block font-medium text-gray-700">
                Age
              </label>

              <input
                type="number"
                placeholder="Enter your age"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-blue-500"
              />
            </div>

            {/* Income */}
            <div>
              <label className="mb-2 block font-medium text-gray-700">
                Annual Income
              </label>

              <input
                type="number"
                placeholder="Example: 200000"
                value={income}
                onChange={(e) => setIncome(e.target.value)}
                className="w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-blue-500"
              />
            </div>

            {/* Occupation */}
            <div>
              <label className="mb-2 block font-medium text-gray-700">
                Occupation
              </label>

              <select
                value={occupation}
                onChange={(e) => setOccupation(e.target.value)}
                className="w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-blue-500"
              >
                <option value="">
                  Select occupation
                </option>

                <option value="Student">
                  Student
                </option>

                <option value="Farmer">
                  Farmer
                </option>

                <option value="Employee">
                  Employee
                </option>

                <option value="Business">
                  Business
                </option>

                <option value="Unemployed">
                  Unemployed
                </option>
              </select>
            </div>

            {/* State */}
            <div>
              <label className="mb-2 block font-medium text-gray-700">
                State
              </label>

              <input
                type="text"
                placeholder="Example: Odisha"
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-blue-500"
              />
            </div>

            {/* Category */}
            <div className="md:col-span-2">

              <label className="mb-2 block font-medium text-gray-700">
                Category
              </label>

              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-blue-500"
              >
                <option value="">
                  Select category
                </option>

                <option value="General">
                  General
                </option>

                <option value="OBC">
                  OBC
                </option>

                <option value="SC">
                  SC
                </option>

                <option value="ST">
                  ST
                </option>

                <option value="EWS">
                  EWS
                </option>

              </select>

            </div>

          </div>

          {/* Error */}
          {error && (
            <p className="mt-5 rounded-lg bg-red-100 p-3 text-red-700">
              {error}
            </p>
          )}

          {/* Button */}
          <button
            onClick={checkEligibility}
            disabled={loading}
            className="mt-6 w-full rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading
              ? "Checking..."
              : "🔍 Check Eligibility"}
          </button>

        </div>

        {/* Results */}
        {schemes.length > 0 && (
          <div className="mt-10">

            <h2 className="mb-5 text-2xl font-bold text-gray-900">
              🎯 Eligible Government Schemes
            </h2>

            <div className="grid gap-5 md:grid-cols-2">

              {schemes.map((scheme, index) => (

                <div
                  key={index}
                  className="rounded-2xl bg-white p-6 shadow-md transition hover:-translate-y-1 hover:shadow-xl"
                >

                  <div className="mb-4 text-3xl">
                    📚
                  </div>

                  <h3 className="text-xl font-bold text-gray-900">
                    {scheme.scheme_name}
                  </h3>

                  <p className="mt-3 text-gray-600">

                    <span className="font-semibold">
                      Benefit:
                    </span>{" "}

                    {scheme.benefit}

                  </p>

                  <div className="mt-5">

                    <h4 className="font-semibold text-gray-900">
                      Why you are eligible:
                    </h4>

                    <ul className="mt-2 space-y-2">

                      {scheme.reasons.map(
                        (reason, reasonIndex) => (

                          <li
                            key={reasonIndex}
                            className="text-sm text-gray-600"
                          >
                            ✅ {reason}
                          </li>

                        )
                      )}

                    </ul>

                  </div>

                </div>

              ))}

            </div>

          </div>
        )}

        {/* No results */}
        {!loading &&
          schemes.length === 0 &&
          !error &&
          age &&
          income &&
          occupation &&
          state &&
          category && (

            <div className="mt-8 rounded-xl bg-yellow-50 p-5 text-center">

              <p className="font-medium text-yellow-800">
                No eligible schemes found.
              </p>

            </div>
          )}

      </div>

    </main>
  );
}