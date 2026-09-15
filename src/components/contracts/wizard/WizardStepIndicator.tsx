import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface Step {
  id: string;
  label: string;
  icon: React.ReactNode;
}

interface WizardStepIndicatorProps {
  steps: Step[];
  currentStep: string;
  completedSteps: string[];
}

export function WizardStepIndicator({
  steps,
  currentStep,
  completedSteps,
}: WizardStepIndicatorProps) {
  const currentIndex = steps.findIndex((s) => s.id === currentStep);

  return (
    <div className="w-full">
      {/* Desktop version */}
      <div className="hidden md:flex items-center justify-between relative">
        {/* Progress line */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-muted mx-12" />
        <div
          className="absolute top-5 left-0 h-0.5 bg-primary mx-12 transition-all duration-300"
          style={{
            width: `calc(${(currentIndex / (steps.length - 1)) * 100}% - 3rem)`,
          }}
        />

        {steps.map((step, index) => {
          const isActive = step.id === currentStep;
          const isCompleted = completedSteps.includes(step.id);
          const isPast = index < currentIndex;

          return (
            <div
              key={step.id}
              className={cn(
                "relative z-10 flex flex-col items-center gap-2 transition-all",
                isActive && "scale-105"
              )}
            >
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center transition-all border-2",
                  isActive
                    ? "bg-primary text-primary-foreground border-primary shadow-lg"
                    : isCompleted || isPast
                    ? "bg-primary/10 text-primary border-primary/50"
                    : "bg-muted text-muted-foreground border-muted-foreground/20"
                )}
                aria-current={isActive ? "step" : undefined}
              >
                {isCompleted || isPast ? (
                  <Check className="w-5 h-5" />
                ) : (
                  step.icon
                )}
              </div>
              <span
                className={cn(
                  "text-xs font-medium transition-colors text-center",
                  isActive
                    ? "text-primary"
                    : isCompleted || isPast
                    ? "text-foreground"
                    : "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Mobile version */}
      <div className="flex md:hidden items-center justify-center gap-2 mb-4">
        {steps.map((step, index) => {
          const isActive = step.id === currentStep;
          const isCompleted = completedSteps.includes(step.id);
          const isPast = index < currentIndex;

          return (
            <div
              key={step.id}
              className={cn(
                "h-2 rounded-full transition-all",
                isActive ? "w-8 bg-primary" : "w-2",
                isCompleted || isPast ? "bg-primary/50" : "bg-muted"
              )}
              aria-label={`${step.label} ${isActive ? "(atual)" : ""}`}
            />
          );
        })}
      </div>
      <p className="text-center md:hidden text-sm font-medium text-primary">
        {steps.find((s) => s.id === currentStep)?.label}
      </p>
    </div>
  );
}
