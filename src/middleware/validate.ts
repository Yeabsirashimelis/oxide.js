import type { IncomingMessage, ServerResponse } from "http";
import type { Middleware } from "./types";

type FieldType = "string" | "number" | "boolean" | "array" | "object";

interface FieldSchema {
  type?: FieldType;
  required?: boolean;
  min?: number; // min value for number, min length for string/array
  max?: number; // max value for number, max length for string/array
  pattern?: RegExp;
  enum?: unknown[];
  message?: string; // custom error message
}

interface ValidationSchema {
  body?: Record<string, FieldSchema>;
  query?: Record<string, FieldSchema>;
  params?: Record<string, FieldSchema>;
}

interface ValidationError {
  field: string;
  message: string;
  location: "body" | "query" | "params";
}

function validateField(
  value: unknown,
  field: string,
  schema: FieldSchema,
  location: "body" | "query" | "params",
): ValidationError | null {
  const missing = value === undefined || value === null || value === "";

  if (schema.required && missing) {
    return {
      field,
      message: schema.message || `${field} is required`,
      location,
    };
  }

  if (missing) return null;

  if (schema.type) {
    let valid = false;
    switch (schema.type) {
      case "string":
        valid = typeof value === "string";
        break;
      case "number":
        valid = typeof value === "number" || (typeof value === "string" && !isNaN(Number(value)) && value !== "");
        break;
      case "boolean":
        valid = typeof value === "boolean" || value === "true" || value === "false";
        break;
      case "array":
        valid = Array.isArray(value);
        break;
      case "object":
        valid = typeof value === "object" && !Array.isArray(value) && value !== null;
        break;
    }
    if (!valid) {
      return {
        field,
        message: schema.message || `${field} must be of type ${schema.type}`,
        location,
      };
    }
  }

  if (schema.min !== undefined) {
    const numValue = typeof value === "number" ? value : typeof value === "string" ? value.length : Array.isArray(value) ? value.length : null;
    if (numValue !== null && numValue < schema.min) {
      const unit = typeof value === "number" ? "" : " characters";
      return {
        field,
        message: schema.message || `${field} must be at least ${schema.min}${unit}`,
        location,
      };
    }
  }

  if (schema.max !== undefined) {
    const numValue = typeof value === "number" ? value : typeof value === "string" ? value.length : Array.isArray(value) ? value.length : null;
    if (numValue !== null && numValue > schema.max) {
      const unit = typeof value === "number" ? "" : " characters";
      return {
        field,
        message: schema.message || `${field} must be at most ${schema.max}${unit}`,
        location,
      };
    }
  }

  if (schema.pattern && typeof value === "string") {
    if (!schema.pattern.test(value)) {
      return {
        field,
        message: schema.message || `${field} has invalid format`,
        location,
      };
    }
  }

  if (schema.enum) {
    if (!schema.enum.includes(value)) {
      return {
        field,
        message: schema.message || `${field} must be one of: ${schema.enum.join(", ")}`,
        location,
      };
    }
  }

  return null;
}

function validateData(
  data: Record<string, unknown>,
  schema: Record<string, FieldSchema>,
  location: "body" | "query" | "params",
): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const [field, fieldSchema] of Object.entries(schema)) {
    const error = validateField(data[field], field, fieldSchema, location);
    if (error) {
      errors.push(error);
    }
  }

  return errors;
}

export function validate(schema: ValidationSchema): Middleware {
  return (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const errors: ValidationError[] = [];
    const reqAny = req as any;

    if (schema.body && reqAny.body) {
      errors.push(...validateData(reqAny.body as Record<string, unknown>, schema.body, "body"));
    } else if (schema.body) {
      // Check required fields when body is missing
      for (const [field, fieldSchema] of Object.entries(schema.body)) {
        if (fieldSchema.required) {
          errors.push({ field, message: `${field} is required`, location: "body" });
        }
      }
    }

    if (schema.query && reqAny.query) {
      errors.push(...validateData(reqAny.query as Record<string, unknown>, schema.query, "query"));
    }

    if (schema.params && reqAny.params) {
      errors.push(...validateData(reqAny.params as Record<string, unknown>, schema.params, "params"));
    }

    if (errors.length > 0) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ errors }));
      return;
    }

    next();
  };
}
