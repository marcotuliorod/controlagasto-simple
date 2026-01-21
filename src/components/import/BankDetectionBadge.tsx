import { Badge } from "@/components/ui/badge";
import { CheckCircle, Building2 } from "lucide-react";

// Simplified bank info from API (without patterns regex)
interface DetectedBankInfo {
  name: string;
  code: string;
  displayName: string;
}

interface BankDetectionBadgeProps {
  bank: DetectedBankInfo | null;
  className?: string;
}

export function BankDetectionBadge({ bank, className }: BankDetectionBadgeProps) {
  if (!bank) {
    return (
      <div className={`flex items-center gap-2 p-3 bg-muted/50 rounded-lg ${className}`}>
        <Building2 className="h-5 w-5 text-muted-foreground" />
        <span className="text-muted-foreground">
          Banco não identificado - usando extração genérica
        </span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg ${className}`}>
      <CheckCircle className="h-5 w-5 text-green-500" />
      <span>
        Banco detectado: <strong className="text-green-700 dark:text-green-400">{bank.displayName}</strong>
      </span>
      <Badge variant="outline" className="ml-auto text-xs">
        Código {bank.code}
      </Badge>
    </div>
  );
}
