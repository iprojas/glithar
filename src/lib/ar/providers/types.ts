import type { ProviderResult, StageRunInput } from "../types";

export interface ImageProvider {
	id: string;
	model: string;
	generate(input: StageRunInput): Promise<ProviderResult>;
}

export interface ModelProvider {
	id: string;
	model: string;
	generate(input: StageRunInput): Promise<ProviderResult>;
}

export interface ProviderError extends Error {
	code?: string;
	retryable?: boolean;
}
