import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NumberStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  label?: string;
}

const NumberStepper = ({ value, onChange, min = 0, max = 99, label }: NumberStepperProps) => {
  const handleDecrement = () => {
    if (value > min) {
      onChange(value - 1);
    }
  };

  const handleIncrement = () => {
    if (value < max) {
      onChange(value + 1);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={handleDecrement}
        disabled={value <= min}
        className="h-10 w-10 rounded-full shrink-0"
      >
        <Minus className="h-4 w-4" />
      </Button>
      <div className="flex-1 text-center">
        <span className="text-xl font-semibold text-foreground">{value}</span>
        {label && <span className="text-sm text-muted-foreground ml-1">{label}</span>}
      </div>
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={handleIncrement}
        disabled={value >= max}
        className="h-10 w-10 rounded-full shrink-0"
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default NumberStepper;
