import {
  createProfileInitials,
  resolveProfileImageUrl,
} from "../utils/profileImage";

interface ProfileAvatarProps {
  displayName: string;
  profileImagePath: string | null;
  className?: string;
  imageClassName?: string;
  initialsClassName?: string;
  alt?: string;
}

function ProfileAvatar({
  displayName,
  profileImagePath,
  className = "h-12 w-12",
  imageClassName = "",
  initialsClassName = "text-sm",
  alt,
}: ProfileAvatarProps) {
  const resolvedImageUrl = resolveProfileImageUrl(
    profileImagePath,
  );

  const initials = createProfileInitials(displayName);
  const imageAlt = alt ?? `${displayName}'s profile picture`;

  return (
    <span
      role={imageAlt ? "img" : undefined}
      aria-label={imageAlt || undefined}
      aria-hidden={imageAlt ? undefined : true}
      className={`relative grid shrink-0 place-items-center overflow-hidden rounded-full border border-sky-200/20 bg-[radial-gradient(circle_at_30%_20%,rgba(125,211,252,0.34),rgba(14,116,144,0.18)_45%,rgba(15,23,42,0.92))] font-black text-sky-50 shadow-lg shadow-sky-950/30 ${className}`}
    >
      <span
        aria-hidden="true"
        className={initialsClassName}
      >
        {initials}
      </span>

      {resolvedImageUrl && (
        <img
          key={resolvedImageUrl}
          src={resolvedImageUrl}
          alt=""
          loading="lazy"
          decoding="async"
          onError={(event) => {
            event.currentTarget.hidden = true;
          }}
          className={`absolute inset-0 h-full w-full object-cover ${imageClassName}`}
        />
      )}
    </span>
  );
}

export default ProfileAvatar;
