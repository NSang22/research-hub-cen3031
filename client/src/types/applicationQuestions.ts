export type ApplicationQuestionType = 'text' | 'number' | 'dropdown' | 'choice';

export interface ApplicationQuestion {
  id: string;
  type: ApplicationQuestionType;
  label: string;
  required?: boolean;
  /** Required when type is dropdown or choice */
  options?: string[];
}

export type QuestionAnswersMap = Record<string, string | number>;
