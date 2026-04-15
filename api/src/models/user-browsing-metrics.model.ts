import mongoose, { Schema, Document, Types } from "mongoose";

export interface IUserBrowsingMetricsToday {
  totalActiveTime: number;
  sitesVisited: number;
  topSite: string | null;
  topSiteLabel: string | null;
  topSiteTime: number;
  focusScore: number | null;
  longestSession: number;
  longestSessionStart: string | null;
  longestSessionEnd: string | null;
  productiveTime: number;
  distractingTime: number;
  neutralTime: number;
  topCategorySlug: string | null;
}

export interface IUserBrowsingMetricsPeriod {
  totalActiveTime: number;
  sitesVisited: number;
  focusScore: number | null;
  productiveTime: number;
  distractingTime: number;
  neutralTime: number;
  topSite: string | null;
  topSiteLabel: string | null;
  topCategorySlug: string | null;
  longestSession: number;
}

export interface IUserBrowsingMetricsPrev {
  todayTotalTime: number;
  todayFocusScore: number | null;
  todaySitesVisited: number;
  todayLongestSession: number;
  todayProductiveTime: number;
  weekTotalTime: number;
  weekFocusScore: number | null;
  monthTotalTime: number;
  monthFocusScore: number | null;
}

export interface IUserBrowsingMetrics extends Document {
  userId: Types.ObjectId;
  /** YYYY-MM-DD in user TZ — for midnight rollover (same idea as download metrics `todayDate`) */
  todayDate: string;
  weekStart: string;
  monthStart: string;
  today: IUserBrowsingMetricsToday;
  week: IUserBrowsingMetricsPeriod;
  month: IUserBrowsingMetricsPeriod;
  prev: IUserBrowsingMetricsPrev;
  updatedAt: Date;
}

const todaySchema = new Schema<IUserBrowsingMetricsToday>(
  {
    totalActiveTime: { type: Number, default: 0, min: 0 },
    sitesVisited: { type: Number, default: 0, min: 0 },
    topSite: { type: String, default: null },
    topSiteLabel: { type: String, default: null },
    topSiteTime: { type: Number, default: 0, min: 0 },
    focusScore: { type: Number, default: null, min: 0, max: 100 },
    longestSession: { type: Number, default: 0, min: 0 },
    longestSessionStart: { type: String, default: null },
    longestSessionEnd: { type: String, default: null },
    productiveTime: { type: Number, default: 0, min: 0 },
    distractingTime: { type: Number, default: 0, min: 0 },
    neutralTime: { type: Number, default: 0, min: 0 },
    topCategorySlug: { type: String, default: null },
  },
  { _id: false },
);

const periodSchema = new Schema<IUserBrowsingMetricsPeriod>(
  {
    totalActiveTime: { type: Number, default: 0, min: 0 },
    sitesVisited: { type: Number, default: 0, min: 0 },
    focusScore: { type: Number, default: null, min: 0, max: 100 },
    productiveTime: { type: Number, default: 0, min: 0 },
    distractingTime: { type: Number, default: 0, min: 0 },
    neutralTime: { type: Number, default: 0, min: 0 },
    topSite: { type: String, default: null },
    topSiteLabel: { type: String, default: null },
    topCategorySlug: { type: String, default: null },
    longestSession: { type: Number, default: 0, min: 0 },
  },
  { _id: false },
);

const prevSchema = new Schema<IUserBrowsingMetricsPrev>(
  {
    todayTotalTime: { type: Number, default: 0, min: 0 },
    todayFocusScore: { type: Number, default: null, min: 0, max: 100 },
    todaySitesVisited: { type: Number, default: 0, min: 0 },
    todayLongestSession: { type: Number, default: 0, min: 0 },
    todayProductiveTime: { type: Number, default: 0, min: 0 },
    weekTotalTime: { type: Number, default: 0, min: 0 },
    weekFocusScore: { type: Number, default: null, min: 0, max: 100 },
    monthTotalTime: { type: Number, default: 0, min: 0 },
    monthFocusScore: { type: Number, default: null, min: 0, max: 100 },
  },
  { _id: false },
);

const userBrowsingMetricsSchema = new Schema<IUserBrowsingMetrics>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    todayDate: { type: String, default: "" },
    weekStart: { type: String, default: "" },
    monthStart: { type: String, default: "" },
    today: { type: todaySchema, required: true, default: () => ({}) },
    week: { type: periodSchema, required: true, default: () => ({}) },
    month: { type: periodSchema, required: true, default: () => ({}) },
    prev: { type: prevSchema, required: true, default: () => ({}) },
  },
  { timestamps: true },
);

userBrowsingMetricsSchema.index({ userId: 1 }, { unique: true });

export const UserBrowsingMetrics = mongoose.model<IUserBrowsingMetrics>(
  "UserBrowsingMetrics",
  userBrowsingMetricsSchema,
);
