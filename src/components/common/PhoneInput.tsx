import { useEffect, useRef } from "react";
import { PHONE_MESSAGE, phoneIsValid } from "../../../shared/phone.js";
export function PhoneInput({
  value,
  onChange,
  id,
}: {
  value: string;
  onChange: (value: string) => void;
  id: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    input.current?.setCustomValidity(phoneIsValid(value) ? "" : PHONE_MESSAGE);
  }, [value]);
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-xs font-semibold uppercase text-slate-600 mb-1"
      >
        Phone number (optional)
      </label>
      <input
        ref={input}
        id={id}
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        maxLength={20}
        value={value}
        onChange={(e) => {
          e.target.setCustomValidity(
            phoneIsValid(e.target.value) ? "" : PHONE_MESSAGE,
          );
          onChange(e.target.value);
        }}
        aria-describedby={`${id}-help`}
        placeholder="9876543210 or +91 9876543210"
        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
      />
      <p id={`${id}-help`} className="text-xs text-slate-500 mt-1">
        10 digits starting with 6–9; +91 is optional.
      </p>
    </div>
  );
}
