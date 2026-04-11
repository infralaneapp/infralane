import { PageHeaderSkeleton, CardSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <CardSkeleton lines={4} />
    </div>
  );
}
