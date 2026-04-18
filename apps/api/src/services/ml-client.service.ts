import axios, { type AxiosInstance } from "axios";
import FormData from "form-data";
import { env } from "@/config/env";

export class MLServiceError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "MLServiceError";
  }
}

const client: AxiosInstance = axios.create({
  baseURL: env.ML_SERVICE_URL,
  timeout: 60_000,
  headers: { "x-api-key": env.ML_SERVICE_API_KEY },
});

const UNAVAILABLE_CODES = new Set([
  "ECONNREFUSED",
  "ECONNABORTED",
  "ECONNRESET",
  "ETIMEDOUT",
  "ENOTFOUND",
]);

function isUnavailableError(err: unknown): boolean {
  const anyErr = err as { code?: string; message?: string };
  if (anyErr?.code && UNAVAILABLE_CODES.has(anyErr.code)) return true;
  if (anyErr?.message?.toLowerCase().includes("socket hang up")) return true;
  return false;
}

client.interceptors.response.use(
  (r) => r,
  (err) => {
    if (isUnavailableError(err)) {
      throw new MLServiceError(
        503,
        "ML_SERVICE_UNAVAILABLE",
        "ML service is not available. Please try again later.",
      );
    }
    throw err;
  },
);

export interface OMRScanParams {
  fileBuffer: Buffer;
  fileName: string;
  contentType: string;
  totalQuestions: number;
  marksPerCorrect: number;
  marksPerWrong: number;
  marksPerUnattempted: number;
  answerKey: Record<number, number>;
}

export interface OMRResult {
  total_questions: number;
  correct: number;
  incorrect: number;
  unattempted: number;
  score: number;
  positive_marks: number;
  negative_marks: number;
  roll_number: string | null;
  responses: Array<{
    question_number: number;
    selected_option: number | null;
    confidence: number;
    filled_ratio: number;
  }>;
  flagged_questions: number[];
  needs_review: boolean;
}

export async function scanOMR(params: OMRScanParams): Promise<OMRResult> {
  const form = new FormData();
  form.append("file", params.fileBuffer, {
    filename: params.fileName,
    contentType: params.contentType,
  });
  form.append("total_questions", params.totalQuestions.toString());
  form.append("marks_per_correct", params.marksPerCorrect.toString());
  form.append("marks_per_wrong", params.marksPerWrong.toString());
  form.append("marks_per_unattempted", params.marksPerUnattempted.toString());
  form.append("answer_key_json", JSON.stringify(params.answerKey));

  const { data } = await client.post("/omr/scan", form, {
    headers: form.getHeaders(),
    maxBodyLength: 15 * 1024 * 1024,
    maxContentLength: 15 * 1024 * 1024,
  });
  return data.data as OMRResult;
}

export interface DropoutFactor {
  feature: string;
  value: number;
  importance: number;
  contribution: number;
}

export interface DropoutPrediction {
  available: boolean;
  reason?: string;
  risk_score?: number;
  probability?: number;
  level?: "low" | "medium" | "high";
  top_factors?: DropoutFactor[];
  suggestion?: string;
  student_id?: string;
  features?: Record<string, number>;
}

export async function predictDropout(
  tenantId: string,
  studentId: string,
): Promise<DropoutPrediction> {
  const { data } = await client.post("/dropout/predict", {
    tenant_id: tenantId,
    student_id: studentId,
  });
  return data.data as DropoutPrediction;
}

export async function predictDropoutBatch(
  tenantId: string,
  studentIds: string[],
): Promise<DropoutPrediction[]> {
  const { data } = await client.post("/dropout/predict-batch", {
    tenant_id: tenantId,
    student_ids: studentIds,
  });
  return data.data as DropoutPrediction[];
}

export interface PerformancePrediction {
  available: boolean;
  reason?: string;
  predicted_percentage?: number;
  confidence_interval?: { lower: number; upper: number; level: string };
  confidence?: "low" | "medium" | "high";
}

export async function predictPerformance(
  tenantId: string,
  studentId: string,
  subjectId: string,
): Promise<PerformancePrediction> {
  const { data } = await client.post("/performance/predict", {
    tenant_id: tenantId,
    student_id: studentId,
    subject_id: subjectId,
  });
  return data.data as PerformancePrediction;
}

export async function bootstrapModels(): Promise<{
  dropout: boolean;
  performance: boolean;
}> {
  try {
    await client.post("/training/dropout/bootstrap");
    await client.post("/training/performance/bootstrap");
    return { dropout: true, performance: true };
  } catch {
    return { dropout: false, performance: false };
  }
}

export async function checkMLHealth(): Promise<boolean> {
  try {
    const { data } = await client.get("/health", { timeout: 3000 });
    return data.status === "ok";
  } catch {
    return false;
  }
}

export async function checkModelsStatus(): Promise<{
  dropout_classifier: boolean;
  performance_regressor: boolean;
} | null> {
  try {
    const { data } = await client.get("/training/models/status", { timeout: 3000 });
    return data.data;
  } catch {
    return null;
  }
}
