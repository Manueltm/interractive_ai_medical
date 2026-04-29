// app/dashboard/components/Spinner.tsx
import { cn } from "@/utils";

interface SpinnerProps {
  className?: string;
}

const Spinner: React.FC<SpinnerProps> = ({ className }) => (
  <div className={cn("flex items-center justify-center p-4", className)}>
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
  </div>
);

export default Spinner;