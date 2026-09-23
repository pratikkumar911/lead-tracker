import { useState, type FormEvent } from "react";
import {
  ApiError,
  LEAD_STATUSES,
  type Lead,
  type LeadInput,
  type LeadStatus,
} from "../api/leads";

interface LeadFormProps {
  initial?: Lead | null;
  onCancel: () => void;
  onSubmit: (values: LeadInput) => Promise<void>;
}
type FieldErrors = Partial<Record<keyof LeadInput, string>>;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+()\-\s0-9]{7,20}$/;

export function LeadForm({ initial, onCancel, onSubmit }: LeadFormProps) {
  const isEdit = Boolean(initial);
  const [values, setValues] = useState<LeadInput>({
    name: initial?.name ?? "",
    email: initial?.email ?? "",
    phone: initial?.phone ?? "",
    status: initial?.status ?? "New",
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const setField = <K extends keyof LeadInput>(
    field: K,
    value: LeadInput[K],
  ) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };
  const validate = (): FieldErrors => {
    const next: FieldErrors = {};
    if (values.name.trim().length < 2)
      next.name = "Name must be at least 2 characters";
    if (!EMAIL_RE.test(values.email.trim()))
      next.email = "Enter a valid email address";
    if (!PHONE_RE.test(values.phone.trim()))
      next.phone = "Enter a valid phone number (7-20 digits)";
    return next;
  };
  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const validation = validate();
    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      await onSubmit({
        name: values.name.trim(),
        email: values.email.trim().toLowerCase(),
        phone: values.phone.trim(),
        status: values.status,
      });
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.message);
        if (err.fieldErrors) setErrors(err.fieldErrors as FieldErrors);
      } else setFormError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <form className="form" onSubmit={handleSubmit} noValidate>
      {formError && <div className="alert alert--error">{formError}</div>}
      {(["name", "email", "phone"] as const).map((field) => (
        <label className="field" key={field}>
          <span className="field__label">
            {field[0].toUpperCase() + field.slice(1)}
          </span>
          <input
            className={`input ${errors[field] ? "input--invalid" : ""}`}
            type={field === "email" ? "email" : "text"}
            value={values[field]}
            onChange={(e) => setField(field, e.target.value)}
            placeholder={
              field === "name"
                ? "Ada Lovelace"
                : field === "email"
                  ? "ada@example.com"
                  : "+1 415 555 0100"
            }
            autoFocus={field === "name"}
          />
          {errors[field] && (
            <span className="field__error">{errors[field]}</span>
          )}
        </label>
      ))}
      <label className="field">
        <span className="field__label">Status</span>
        <select
          className="input"
          value={values.status}
          onChange={(e) => setField("status", e.target.value as LeadStatus)}
        >
          {LEAD_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </label>
      <div className="form__actions">
        <button
          type="button"
          className="btn"
          onClick={onCancel}
          disabled={submitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn btn--primary"
          disabled={submitting}
        >
          {submitting ? "Saving..." : isEdit ? "Save changes" : "Create lead"}
        </button>
      </div>
    </form>
  );
}
