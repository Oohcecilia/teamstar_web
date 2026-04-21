import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

export default function Auth() {
  const { login, authError, setAuthError } = useAuth();
  const navigate = useNavigate();

  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  const inputRef = useRef(null);

  useEffect(() => {

    const savedTheme = localStorage.getItem("theme") || "light";

    const isDark = savedTheme === "dark";

    document.documentElement.classList.toggle("dark", isDark);

    setAuthError(null);
    inputRef.current?.focus();
  }, []);

  const handleNumberClick = (num) => {
    if (pin.length < 4) {
      setPin((p) => p + num);
      setError("");
    }
  };

  const handleDelete = () => setPin((p) => p.slice(0, -1));

  const handleSubmit = async () => {
    setError("");

    if (!phone) {
      setError("Please enter your phone number");
      return;
    }

    if (pin.length !== 4) {
      setError("PIN must be 4 digits");
      return;
    }

    try {
      await login({
        phone: phone,
        pin: pin,
      });

      navigate("/");
    } catch (err) {
      setError(err.message || "Login failed");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key >= "0" && e.key <= "9") handleNumberClick(e.key);
    if (e.key === "Backspace") handleDelete();
    if (e.key === "Enter") handleSubmit();
  };

  const numbers = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted px-4 py-6 transition-colors">

      <div className="w-full max-w-sm bg-card/80 backdrop-blur-xl border border-border shadow-xl rounded-3xl p-5 sm:p-6 flex flex-col gap-5 transition-colors">

        {/* Title */}
        <div className="text-center space-y-1">
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">
            Welcome Back
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Enter phone & PIN
          </p>
        </div>

        {/* Phone */}
        <input
          placeholder="Phone Number"
          value={phone}
          onChange={(e) => {
            setPhone(e.target.value);
            setError("");
          }}
          className="w-full px-4 py-3 text-sm sm:text-base rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
        />

        {/* hidden input for keyboard */}
        <input
          ref={inputRef}
          type="tel"
          onKeyDown={handleKeyDown}
          className="absolute opacity-0 pointer-events-none"
        />

        {/* PIN */}
        <div className="flex justify-center gap-2 sm:gap-3 py-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-3 w-3 rounded-full transition-all",
                pin[i]
                  ? "bg-primary scale-110"
                  : "bg-muted"
              )}
            />
          ))}
        </div>

        {/* ERROR */}
        {(error || authError) && (
          <div className="text-center text-xs sm:text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl py-2 px-3">
            {error || authError}
          </div>
        )}

        {/* NUMBER PAD */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-1">
          {numbers.map((n, i) => {
            if (n === "") return <div key={i} />;

            if (n === "⌫") {
              return (
                <button
                  key={i}
                  onClick={handleDelete}
                  className="h-12 sm:h-14 rounded-2xl bg-muted text-foreground active:scale-95 transition font-semibold"
                >
                  ⌫
                </button>
              );
            }

            return (
              <button
                key={i}
                onClick={() => handleNumberClick(n)}
                className="h-12 sm:h-14 rounded-2xl bg-card border border-border shadow-sm hover:bg-muted active:scale-95 transition text-base sm:text-lg font-semibold text-foreground"
              >
                {n}
              </button>
            );
          })}
        </div>

        {/* LOGIN */}
        <button
          onClick={handleSubmit}
          className="            w-full py-3 rounded-xl font-medium shadow-md
            bg-primary text-white hover:bg-primary
            dark:bg-slate-800 border border-border dark:border-slate-700 shadow-sm  dark:hover:bg-slate-700 active:scale-95 transition text-base sm:text-lg font-semibold text-slate-900 dark:text-white
            hover:opacity-90 active:scale-[0.98] transition mt-2"
        >
          Login
        </button>

        {/* SIGNUP */}
        <p className="text-xs sm:text-sm text-center text-muted-foreground">
          No account?{" "}
          <span
            className="text-primary font-medium cursor-pointer"
            onClick={() => navigate("/register")}
          >
            Sign up
          </span>
        </p>

      </div>
    </div>
  );
}