interface TelegramIconProps {
  className?: string;
}

function TelegramIcon({ className = "h-5 w-5" }: TelegramIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="currentColor"
    >
      <path d="M21.7 3.4a1.45 1.45 0 0 0-1.49-.2L3.08 9.88a1.58 1.58 0 0 0 .08 2.98l4.28 1.43 1.67 5.23a1.42 1.42 0 0 0 2.43.5l2.43-2.5 4.2 3.09a1.44 1.44 0 0 0 2.26-.88l2.06-14.9a1.45 1.45 0 0 0-.79-1.43ZM9.12 13.13l7.82-5.06-6.3 6.34-.57 3.04-1.02-3.2a.96.96 0 0 1 .07-1.12Zm2.48 4.22.38-2.03 1.05.77-1.43 1.26Z" />
    </svg>
  );
}

export default TelegramIcon;
