// api/src/repositories/download-rule.repository.ts
import { Types } from "mongoose";
import {
  type DownloadRuleValue,
  type IUserDownloadRule,
  UserDownloadRuleModel,
} from "../models/user-download-rule.model";
import type { FileCategory } from "../utils/file-utils";

export interface CreateDomainRuleDto {
  userId: string;
  domain: string;
  rule: DownloadRuleValue;
}

export interface UpsertCategoryRuleDto {
  userId: string;
  category: FileCategory;
  rule: DownloadRuleValue;
}

export const DownloadRuleRepository = {
  async findByUserId(userId: string): Promise<IUserDownloadRule[]> {
    return UserDownloadRuleModel.find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .lean()
      .exec() as Promise<IUserDownloadRule[]>;
  },

  async findDomainRulesByUserId(userId: string): Promise<IUserDownloadRule[]> {
    return UserDownloadRuleModel.find({
      userId: new Types.ObjectId(userId),
      ruleType: "domain",
    })
      .sort({ createdAt: -1 })
      .lean()
      .exec() as Promise<IUserDownloadRule[]>;
  },

  async findCategoryRulesByUserId(userId: string): Promise<IUserDownloadRule[]> {
    return UserDownloadRuleModel.find({
      userId: new Types.ObjectId(userId),
      ruleType: "category",
    })
      .sort({ createdAt: -1 })
      .lean()
      .exec() as Promise<IUserDownloadRule[]>;
  },

  async findDomainRuleByDomain(
    userId: string,
    domain: string,
  ): Promise<IUserDownloadRule | null> {
    return UserDownloadRuleModel.findOne({
      userId: new Types.ObjectId(userId),
      ruleType: "domain",
      domain,
    })
      .lean()
      .exec();
  },

  async findCategoryRuleByCategory(
    userId: string,
    category: FileCategory,
  ): Promise<IUserDownloadRule | null> {
    return UserDownloadRuleModel.findOne({
      userId: new Types.ObjectId(userId),
      ruleType: "category",
      category,
    })
      .lean()
      .exec();
  },

  async findById(
    userId: string,
    id: string,
  ): Promise<IUserDownloadRule | null> {
    return UserDownloadRuleModel.findOne({
      _id: new Types.ObjectId(id),
      userId: new Types.ObjectId(userId),
    })
      .lean()
      .exec();
  },

  async createDomainRule(data: CreateDomainRuleDto): Promise<IUserDownloadRule> {
    const doc = await UserDownloadRuleModel.create({
      userId: new Types.ObjectId(data.userId),
      ruleType: "domain",
      domain: data.domain,
      category: null,
      rule: data.rule,
    });

    return doc.toObject() as IUserDownloadRule;
  },

  async updateRuleById(
    userId: string,
    id: string,
    rule: DownloadRuleValue,
  ): Promise<IUserDownloadRule | null> {
    const doc = await UserDownloadRuleModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(id),
        userId: new Types.ObjectId(userId),
      },
      { $set: { rule } },
      { returnDocument: "after" },
    )
      .lean()
      .exec();

    return doc as IUserDownloadRule | null;
  },

  async deleteById(
    userId: string,
    id: string,
  ): Promise<IUserDownloadRule | null> {
    const doc = await UserDownloadRuleModel.findOneAndDelete({
      _id: new Types.ObjectId(id),
      userId: new Types.ObjectId(userId),
    })
      .lean()
      .exec();

    return doc as IUserDownloadRule | null;
  },

  async upsertCategoryRule(
    data: UpsertCategoryRuleDto,
  ): Promise<IUserDownloadRule> {
    const doc = await UserDownloadRuleModel.findOneAndUpdate(
      {
        userId: new Types.ObjectId(data.userId),
        ruleType: "category",
        category: data.category,
      },
      {
        $set: {
          rule: data.rule,
        },
        $setOnInsert: {
          userId: new Types.ObjectId(data.userId),
          ruleType: "category",
          category: data.category,
          domain: null,
        },
      },
      {
        upsert: true,
        returnDocument: "after",
        setDefaultsOnInsert: true,
      },
    )
      .lean()
      .exec();

    return doc as IUserDownloadRule;
  },
};