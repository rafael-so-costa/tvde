import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { validateField, formatFieldValue } from "@/utils/contractFieldValidation";
import type { ContractField } from "@/types/contract";
import {
  AlertCircle,
  CheckCircle,
  Loader2,
  Sparkles,
  Calendar,
  Hash,
  Mail,
  Phone,
  CreditCard,
  Type,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DynamicFieldFormProps {
  fields: ContractField[];
  values: Record<string, string>;
  onChange: (name: string, value: string) => void;
  onSubmit: () => void;
  isSubmitting?: boolean;
  readonly?: boolean;
  aiSuggestions?: Record<string, string>;
  hideSubmit?: boolean;
}

const fieldTypeIcons: Record<ContractField["type"], React.ReactNode> = {
  text: <Type className="w-4 h-4" />,
  number: <Hash className="w-4 h-4" />,
  date: <Calendar className="w-4 h-4" />,
  currency: <CreditCard className="w-4 h-4" />,
  cpf_cnpj: <CreditCard className="w-4 h-4" />,
  email: <Mail className="w-4 h-4" />,
  phone: <Phone className="w-4 h-4" />,
};

export function DynamicFieldForm({
  fields,
  values,
  onChange,
  onSubmit,
  isSubmitting = false,
  readonly = false,
  aiSuggestions = {},
  hideSubmit = false,
}: DynamicFieldFormProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validateAll = (): boolean => {
    const newErrors: Record<string, string> = {};
    let isValid = true;

    fields.forEach((field) => {
      const result = validateField(field, values[field.name] || "");
      if (!result.isValid) {
        newErrors[field.name] = result.error || "Campo inválido";
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  const handleBlur = (field: ContractField) => {
    setTouched((prev) => ({ ...prev, [field.name]: true }));
    const result = validateField(field, values[field.name] || "");
    
    if (!result.isValid) {
      setErrors((prev) => ({ ...prev, [field.name]: result.error || "Campo inválido" }));
    } else {
      setErrors((prev) => {
        const { [field.name]: _, ...rest } = prev;
        return rest;
      });
    }
  };

  const handleChange = (field: ContractField, value: string) => {
    onChange(field.name, value);
    
    if (touched[field.name]) {
      const result = validateField(field, value);
      if (!result.isValid) {
        setErrors((prev) => ({ ...prev, [field.name]: result.error || "Campo inválido" }));
      } else {
        setErrors((prev) => {
          const { [field.name]: _, ...rest } = prev;
          return rest;
        });
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Mark all fields as touched
    const allTouched: Record<string, boolean> = {};
    fields.forEach((f) => (allTouched[f.name] = true));
    setTouched(allTouched);

    if (validateAll()) {
      onSubmit();
    }
  };

  const applySuggestion = (fieldName: string) => {
    const suggestion = aiSuggestions[fieldName];
    if (suggestion) {
      onChange(fieldName, suggestion);
    }
  };

  const getInputType = (type: ContractField["type"]): string => {
    switch (type) {
      case "email":
        return "email";
      case "number":
      case "currency":
        return "text";
      case "date":
        return "date";
      case "phone":
        return "tel";
      default:
        return "text";
    }
  };

  const requiredFields = fields.filter((f) => f.required);
  const optionalFields = fields.filter((f) => !f.required);
  const completedRequired = requiredFields.filter(
    (f) => values[f.name]?.trim() && !errors[f.name]
  ).length;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Progress */}
      {requiredFields.length > 0 && (
        <div className="p-4 bg-muted rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Campos Obrigatórios</span>
            <span className="text-sm text-muted-foreground">
              {completedRequired}/{requiredFields.length}
            </span>
          </div>
          <div className="h-2 bg-background rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{
                width: `${(completedRequired / requiredFields.length) * 100}%`,
              }}
            />
          </div>
        </div>
      )}

      <ScrollArea className="max-h-[400px] pr-4">
        <div className="space-y-4">
          {/* Required Fields */}
          {requiredFields.length > 0 && (
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-destructive flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                Campos Obrigatórios
              </h4>
              {requiredFields.map((field) => (
                <FieldInput
                  key={field.id}
                  field={field}
                  value={values[field.name] || ""}
                  error={touched[field.name] ? errors[field.name] : undefined}
                  suggestion={aiSuggestions[field.name]}
                  onChange={(value) => handleChange(field, value)}
                  onBlur={() => handleBlur(field)}
                  onApplySuggestion={() => applySuggestion(field.name)}
                  readonly={readonly}
                  inputType={getInputType(field.type)}
                />
              ))}
            </div>
          )}

          {/* Optional Fields */}
          {optionalFields.length > 0 && (
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-muted-foreground">
                Campos Opcionais
              </h4>
              {optionalFields.map((field) => (
                <FieldInput
                  key={field.id}
                  field={field}
                  value={values[field.name] || ""}
                  error={touched[field.name] ? errors[field.name] : undefined}
                  suggestion={aiSuggestions[field.name]}
                  onChange={(value) => handleChange(field, value)}
                  onBlur={() => handleBlur(field)}
                  onApplySuggestion={() => applySuggestion(field.name)}
                  readonly={readonly}
                  inputType={getInputType(field.type)}
                />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {!readonly && !hideSubmit && (
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button type="submit" disabled={isSubmitting} className="btn-primary">
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4 mr-2" />
            )}
            Salvar Alterações
          </Button>
        </div>
      )}
    </form>
  );
}

interface FieldInputProps {
  field: ContractField;
  value: string;
  error?: string;
  suggestion?: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  onApplySuggestion: () => void;
  readonly?: boolean;
  inputType: string;
}

function FieldInput({
  field,
  value,
  error,
  suggestion,
  onChange,
  onBlur,
  onApplySuggestion,
  readonly,
  inputType,
}: FieldInputProps) {
  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        {fieldTypeIcons[field.type]}
        {field.label}
        {field.required && <span className="text-destructive">*</span>}
      </Label>

      <div className="relative">
        <Input
          type={inputType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={field.placeholder}
          disabled={readonly}
          className={cn(
            error && "border-destructive focus-visible:ring-destructive"
          )}
        />

        {suggestion && !value && !readonly && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 text-xs"
            onClick={onApplySuggestion}
          >
            <Sparkles className="w-3 h-3 mr-1 text-primary" />
            {suggestion.length > 20 ? suggestion.slice(0, 20) + "..." : suggestion}
          </Button>
        )}
      </div>

      {error && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {error}
        </p>
      )}
    </div>
  );
}
