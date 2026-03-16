// api/src/repositories/download-rule.repository.ts
import { Types } from "mongoose";
import {
  type DownloadRuleValue,
  type IUserDownloadRule,
  UserDownloadRuleModel,
} from "../models/user-download-rule.model";

export interface CreateDomainRuleDto {
  userId: string;
  domain: string;
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

};