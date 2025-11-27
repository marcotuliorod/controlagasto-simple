import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export function ChartSkeleton() {
  return (
    <Card className="p-6">
      <div className="space-y-4">
        <Skeleton className="h-6 w-40" />
        <div className="h-64 flex items-end justify-around gap-2">
          {[60, 80, 45, 90, 70, 55].map((height, i) => (
            <Skeleton
              key={i}
              className="w-full rounded-t-md"
              style={{ height: `${height}%` }}
            />
          ))}
        </div>
        <div className="flex justify-center gap-4">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
    </Card>
  );
}
