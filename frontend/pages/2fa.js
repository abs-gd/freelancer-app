import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { getAuthToken } from "../utils/auth";
import axios from "axios";
import toast from "react-hot-toast";

export default function TwoFASetup() {
  const [qrCode, setQrCode] = useState(null);
  const [otp, setOtp] = useState("");
  const router = useRouter();

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.push("/login");
      return;
    }

    // Fetch QR code from the backend
    const fetchQRCode = async () => {
      try {
        const response = await axios.post(
          process.env.NEXT_PUBLIC_GRAPHQL_API,
          {
            query: `
              mutation {
                setup2FA
              }
            `,
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        setQrCode(response.data.data.setup2FA);
      } catch (err) {
        toast.error("Failed to generate QR Code.");
      }
    };

    fetchQRCode();
  }, [router]);

  const verify2FA = async () => {
    try {
      const token = getAuthToken();
      const response = await axios.post(
        process.env.NEXT_PUBLIC_GRAPHQL_API,
        {
          query: `
            mutation {
              verify2FA(token: "${otp}")
            }
          `,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.data.verify2FA) {
        toast.success("2FA Verified Successfully!");
      } else {
        toast.error("Invalid OTP. Try again.");
      }
    } catch (err) {
      toast.error("Verification failed.");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-2xl mb-4">Setup 2FA</h1>

      {qrCode && (
        <>
          <p>Scan this QR Code in your authenticator app:</p>
          <img src={qrCode} alt="QR Code" className="mt-3" />
        </>
      )}

      <input
        type="text"
        placeholder="Enter 6-digit OTP"
        value={otp}
        onChange={(e) => setOtp(e.target.value)}
        className="border p-2 rounded mt-4"
      />

      <button
        onClick={verify2FA}
        className="bg-green-500 text-white p-2 rounded mt-2"
      >
        Verify 2FA
      </button>
    </div>
  );
}
