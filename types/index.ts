export interface SacMessage {
  id: number;
  saved_id: string;
  sentiment: string | null;
  situation: string | null;
  message: string | null;
  canal: string | null;
  ciutada: string | null;
  clas1: string | null;
  clas2: string | null;
  clas3: string | null;
  lng: number | null;
  lat: number | null;
  barri: string | null;
  data_inici: string | null;
  // AI-inferred fields
  intent: string | null;
  department: string | null;
  action_required: string | null;
  location_extracted: string | null;
  followup_needed: boolean | null;
  language: string | null;
  citizen_experience_signal: string | null;
}

export type PeriodType = 'day' | 'week' | 'month' | 'year' | 'custom';
export type TimelineGranularity = 'hour' | 'day' | 'week' | 'month';

export interface DateRange {
  from: Date;
  to: Date;
  period: PeriodType;
}

export interface FilterState {
  from?: Date;
  to?: Date;
  barri?: string;
  canal?: string;
  clas1?: string;
  clas2?: string;
  sentimentMin?: number;
  sentimentMax?: number;
  intent?: string;
  department?: string;
  action_required?: string;
  language?: string;
  citizen_experience_signal?: string;
  followup_needed?: boolean;
  q?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

export interface MessagesResponse {
  data: SacMessage[];
  count: number;
}

export interface TimelineBucket {
  bucket: string;
  count: number;
  avg_sentiment: number | null;
}

export interface BarriStat {
  barri: string;
  count: number;
  avg_sentiment: number | null;
  top_category: string | null;
  critical_count: number;
}

export interface CanalStat {
  canal: string;
  count: number;
}

export interface CategoryStat {
  category: string;
  count: number;
}

export interface StatsResponse {
  total: number;
  avg_sentiment: number | null;
  critical_count: number;
  by_barri: BarriStat[];
  by_canal: CanalStat[];
  by_clas1: CategoryStat[];
  sentiment_distribution: { range: string; count: number }[];
  heatmap: { day: number; hour: number; count: number }[];
}

export interface ChatChartData {
  type: 'bar' | 'pie' | 'line';
  title: string;
  data: { name: string; value: number }[];
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  chart?: ChatChartData;
}

export interface ReportConfig {
  title: string;
  from: Date;
  to: Date;
  barris: string[];
  sections: {
    summary: boolean;
    timeline: boolean;
    sentiment: boolean;
    categories: boolean;
    channels: boolean;
    neighborhoods: boolean;
    alerts: boolean;
    messages: boolean;
  };
}
