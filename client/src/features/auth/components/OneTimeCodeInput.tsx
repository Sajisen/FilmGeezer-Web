import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

export interface OneTimeCodeInputHandle {
  focus: () => void;
  select: () => void;
}

interface OneTimeCodeInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  hasError?: boolean;
  autoFocus?: boolean;
}

function sanitizeCode(
  value: string,
): string {
  return value
    .replace(/\D/gu, "")
    .slice(0, 6);
}

const OneTimeCodeInput =
  forwardRef<
    OneTimeCodeInputHandle,
    OneTimeCodeInputProps
  >(function OneTimeCodeInput(
    {
      value,
      onChange,
      disabled = false,
      hasError = false,
      autoFocus = false,
    },
    forwardedRef,
  ) {
    const inputRef =
      useRef<HTMLInputElement>(
        null,
      );

    const [isFocused, setIsFocused] =
      useState(false);

    useImperativeHandle(
      forwardedRef,
      () => ({
        focus: () => {
          inputRef.current?.focus();
        },

        select: () => {
          inputRef.current?.select();
        },
      }),
      [],
    );

    const activeIndex =
      Math.min(
        value.length,
        5,
      );

    return (
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={6}
          value={value}
          disabled={disabled}
          autoFocus={autoFocus}
          onFocus={() => {
            setIsFocused(true);
          }}
          onBlur={() => {
            setIsFocused(false);
          }}
          onChange={(event) => {
            onChange(
              sanitizeCode(
                event.target.value,
              ),
            );
          }}
          onPaste={(event) => {
            const pastedCode =
              sanitizeCode(
                event.clipboardData.getData(
                  "text",
                ),
              );

            if (!pastedCode) {
              return;
            }

            event.preventDefault();
            onChange(pastedCode);
          }}
          aria-label="Six-digit email verification code"
          aria-invalid={hasError}
          className="absolute inset-0 z-10 h-full w-full cursor-text opacity-0 disabled:cursor-not-allowed"
        />

        <div
          aria-hidden="true"
          className="grid grid-cols-6 gap-2 sm:gap-2.5"
        >
          {Array.from(
            {
              length: 6,
            },
            (
              _unused,
              index,
            ) => {
              const digit =
                value[index] ?? "";

              const isActive =
                value.length < 6 &&
                index === activeIndex;

              const showActiveFocus =
                isFocused &&
                isActive &&
                !hasError;

              return (
                <span
                  key={index}
                  className={`flex h-14 min-w-0 items-center justify-center rounded-xl border text-xl font-bold tabular-nums transition sm:h-16 sm:text-2xl ${
                    hasError
                      ? "border-rose-400/70 bg-rose-400/8 text-white"
                      : digit
                        ? "border-sky-300/55 bg-sky-400/12 text-white shadow-[0_0_20px_rgba(56,189,248,0.1)]"
                        : showActiveFocus
                          ? "border-sky-300 bg-sky-400/10 text-white ring-2 ring-sky-300/25"
                          : "border-white/10 bg-slate-950/65 text-white"
                  } ${
                    disabled
                      ? "opacity-55"
                      : ""
                  }`}
                >
                  {digit}
                </span>
              );
            },
          )}
        </div>
      </div>
    );
  });

export default OneTimeCodeInput;
