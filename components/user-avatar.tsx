import { getUserAvatarColor } from "@/lib/formatters";

type UserAvatarProps = {
  name: string;
  size?: "sm" | "md";
};

export function UserAvatar({ name, size = "md" }: UserAvatarProps) {
  const color = getUserAvatarColor(name);
  const sizeClasses = size === "sm" ? "size-6 text-[10px]" : "size-8 text-xs";

  return (
    <div
      className={`flex items-center justify-center rounded-full font-semibold text-white ${sizeClasses}`}
      style={{ backgroundColor: color }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}
