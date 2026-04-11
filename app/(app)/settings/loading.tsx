import { CardSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <div className="space-y-6">
      <CardSkeleton lines={4} />
      <CardSkeleton lines={3} />
    </div>
  );
}
