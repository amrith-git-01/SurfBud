export interface DomainClassificationJobData {
  /** If set, only these domains (must still be `pending` in DB). If omitted, worker drains global pending. */
  domains?: string[];
}
