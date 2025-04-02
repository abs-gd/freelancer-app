import { useEffect } from "react";
import { useRouter } from "next/router";
import { getAuthToken } from "../utils/auth";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.push("/login"); // Redirect to login if not authenticated
    }
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-3xl">Welcome to your freelancer app!</h1>
      <p>You are logged in!</p>
    </div>
  );
}
