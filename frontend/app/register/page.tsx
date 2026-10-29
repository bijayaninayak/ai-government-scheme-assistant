"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setError("");
    setLoading(true);

    try {
      const response = await fetch("http://127.0.0.1:8000/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.detail || "Unable to register.");
        return;
      }

      if (data.message === "Email already registered") {
        setError("Email already registered. Please log in instead.");
        return;
      }

      setMessage("Account created. Redirecting to login...");
      setTimeout(() => {
        router.push("/login");
      }, 800);
    } catch (err) {
      console.error(err);
      setError("Unable to connect to the backend.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100 px-6">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">

        <h1 className="text-2xl font-bold text-center mb-6 text-gray-900">
          Create Account
        </h1>

        <form onSubmit={handleRegister} className="space-y-4">

          <div>
            <label className="block mb-1 font-medium text-gray-700">
              Name
            </label>

            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              className="w-full border border-gray-300 rounded-md p-2 text-gray-900 outline-none focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block mb-1 font-medium text-gray-700">
              Email
            </label>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="w-full border border-gray-300 rounded-md p-2 text-gray-900 outline-none focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block mb-1 font-medium text-gray-700">
              Password
            </label>

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full border border-gray-300 rounded-md p-2 text-gray-900 outline-none focus:border-blue-500"
              required
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-100 p-3 text-red-700">
              {error}
            </p>
          )}

          {message && (
            <p className="rounded-lg bg-green-100 p-3 text-green-700">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? "Creating account..." : "Register"}
          </button>

        </form>

        <p className="text-center mt-4 text-gray-600">
          Already have an account?{" "}
          <Link href="/login" className="text-blue-600 font-medium hover:underline">
            Login
          </Link>
        </p>

      </div>
    </main>
  );
}
