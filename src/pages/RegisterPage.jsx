import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

const ROLES = ["member", "owner"];

export default function Register() {
  const { register, setAuthError } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || "light";

    const isDark = savedTheme === "dark";

    document.documentElement.classList.toggle("dark", isDark);
    setAuthError(null);
  }, []);

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    pin: "",
    role: "member",
    orgName: "",
    orgDesc: "",
  });

  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setError("");

    if (!form.first_name) return setError("Name is required");
    if (!form.last_name) return setError("Last Name is required");
    if (!form.phone) return setError("Phone is required");
    if (form.pin.length !== 4) return setError("PIN must be 4 digits");

    if (form.role === "owner" && !form.orgName) {
      return setError("Organization name is required");
    }

    try {
      await register(form);

      navigate("/auth");
    } catch (err) {
      setError(err.message || "Registration failed");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-950 dark:to-slate-900 px-4 py-6 transition-colors">

      <div className="w-full max-w-md bg-white/80 dark:bg-slate-900/70 backdrop-blur-xl rounded-3xl shadow-xl border border-white/40 dark:border-slate-700/40 p-6 space-y-5 transition-colors">

        {/* TITLE */}
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
            Create Account
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Setup your workspace
          </p>
        </div>

        {/* NAME */}
        <div className="grid grid-cols-2 gap-2">
          <input
            placeholder="First Name"
            value={form.first_name}
            onChange={(e) =>
              setForm({ ...form, first_name: e.target.value })
            }
            className="reg-input dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder-slate-400"
          />

          <input
            placeholder="Last Name"
            value={form.last_name}
            onChange={(e) =>
              setForm({ ...form, last_name: e.target.value })
            }
            className="reg-input dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder-slate-400"
          />
        </div>

        {/* PHONE */}
        <input
          placeholder="Phone Number"
          value={form.phone}
          onChange={(e) =>
            setForm({ ...form, phone: e.target.value })
          }
          className="reg-input dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder-slate-400"
        />

        {/* PIN */}
        <input
          type="password"
          maxLength={4}
          placeholder="4-digit PIN"
          value={form.pin}
          onChange={(e) =>
            setForm({ ...form, pin: e.target.value })
          }
          className="reg-input text-center tracking-widest dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder-slate-400"
        />

        {/* ROLE SELECT */}
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
            Select Role
          </p>

          <div className="grid grid-cols-2 gap-4 mx-4">
            {ROLES.map((r) => (
              <button
                key={r}
                onClick={() => setForm({ ...form, role: r })}
                className={cn(
                  "py-2 rounded-xl border text-xs capitalize transition",
                  form.role === r
                    ? "bg-primary text-primary-foreground"
                    : "bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:hover:bg-slate-700"
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* OWNER EXTRA FIELDS */}
        {form.role === "owner" && (
          <div className="space-y-3">
            <input
              placeholder="Organization Name"
              value={form.orgName}
              onChange={(e) =>
                setForm({ ...form, orgName: e.target.value })
              }
              className="reg-input dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder-slate-400"
            />

            <textarea
              placeholder="Organization Description"
              value={form.orgDesc}
              onChange={(e) =>
                setForm({ ...form, orgDesc: e.target.value })
              }
              className="reg-input dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder-slate-400"
            />
          </div>
        )}

        {/* ERROR */}
        {error && (
          <div className="text-red-600 dark:text-red-400 text-sm text-center bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900 py-2 rounded-xl">
            {error}
          </div>
        )}

        {/* SUBMIT */}
        <button
          onClick={handleSubmit}
            className="
            w-full py-3 rounded-xl font-medium shadow-md
            bg-primary text-white hover:bg-primary
            dark:bg-slate-800 border border-border dark:border-slate-700 shadow-sm  dark:hover:bg-slate-700 active:scale-95 transition text-base sm:text-lg font-semibold text-slate-900 dark:text-white
            hover:opacity-90 active:scale-[0.98] transition mt-2
          "
        >
          Create Account
        </button>

        {/* LOGIN LINK */}
        <p className="text-sm text-center text-slate-600 dark:text-slate-400">
          Already have an account?{" "}
          <span
            className="text-primary cursor-pointer"
            onClick={() => navigate("/auth")}
          >
            Login
          </span>
        </p>

      </div>
    </div>
  );
}