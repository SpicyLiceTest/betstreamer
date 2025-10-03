import { cn } from "@/lib/utils";
import type { JobStatusDisplay } from "@/types";

interface JobStatusProps {
  job: JobStatusDisplay;
}

export default function JobStatus({ job }: JobStatusProps) {
  const statusStyles = {
    running: "bg-green-500",
    success: "bg-blue-500",
    failed: "bg-destructive"
  };

  const statusText = {
    running: "Running",
    success: "Success", 
    failed: "Failed"
  };

  const statusTextStyles = {
    running: "text-green-500",
    success: "text-blue-500",
    failed: "text-destructive"
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className={cn("w-2 h-2 rounded-full", statusStyles[job.status])}></div>
        <div>
          <p className="text-sm font-medium">{job.displayName}</p>
          <p className="text-xs text-muted-foreground">Last run: {job.lastRun}</p>
        </div>
      </div>
      <span className={cn("text-xs", statusTextStyles[job.status])}>
        {statusText[job.status]}
      </span>
    </div>
  );
}
