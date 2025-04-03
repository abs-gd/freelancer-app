import { useState } from "react";
import axios from "axios";
import { useRouter } from "next/router";
import toast from "react-hot-toast";
import HCaptcha from "@hcaptcha/react-hcaptcha";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState(""); // OTP field
  const [requires2FA, setRequires2FA] = useState(false);
  const router = useRouter();
  //const [captchaToken, setCaptchaToken] = useState("");


  const handleLogin = async (e) => {
    e.preventDefault();
    /*if (!captchaToken) {
      toast.error("Please complete the CAPTCHA");
      return;
    }*/
    try {
      const response = await axios.post(process.env.NEXT_PUBLIC_GRAPHQL_API, {
        query: `
          mutation {
            login(email: "${email}", password: "${password}", token: "${otp}")
          }
        `,
      });

      const token = response.data.data.login;

      if (!token) {
        throw new Error("Invalid credentials or 2FA required");
      }

      localStorage.setItem("token", token);
      toast.success("Login successful!");
      router.push("/dashboard"); // Redirect to dashboard after login
    } catch (err) {
      const errorMessage =
        err.response?.data?.errors[0]?.message || "Login failed";

      if (errorMessage === "2FA required") {
        setRequires2FA(true);
        toast.info("2FA is required. Enter your OTP code.");
      } else {
        toast.error(errorMessage);
      }
    }
  };

  return (
    <div className="p-6 flex flex-col items-center justify-center h-screen">
      <h1 className="text-4xl mb-6">👤 Login</h1>
      <form onSubmit={handleLogin} className="flex flex-col space-y-2">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="border p-2 rounded"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="border p-2 rounded"
        />

        <input
          type="text"
          placeholder="Enter 2FA Code"
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
          className="border p-2 rounded"
        />
        {/*
        <HCaptcha
          sitekey={process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY}
          onVerify={(token) => setCaptchaToken(token)}
          onExpire={() => setCaptchaToken("")}
        />
        */}
        <button className="bg-green-600 hover:bg-green-500 text-white p-2 rounded cursor-pointer">Login</button>
      </form>
    </div>
  );
}
