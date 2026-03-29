import { Types } from "mongoose";
import {
  type BrowsingRuleValue,
  type IUserBrowsingRule,
  UserBrowsingRuleModel,
} from "../models/user-browsing-rule.model";

export interface CreateBrowsingDomainRuleDto {
  userId: string;
  domain: string;
  rule: BrowsingRuleValue;
}

export const BrowsingRuleRepository = {
  async findByUserId(userId: string): Promise<IUserBrowsingRule[]> {
    return UserBrowsingRuleModel.find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .lean()
      .exec() as Promise<IUserBrowsingRule[]>;
  },

  async findDomainRulesByUserId(userId: string): Promise<IUserBrowsingRule[]> {
    return UserBrowsingRuleModel.find({
      userId: new Types.ObjectId(userId),
      ruleType: "domain",
    })
      .sort({ createdAt: -1 })
      .lean()
      .exec() as Promise<IUserBrowsingRule[]>;
  },

  async findDomainRuleByDomain(
    userId: string,
    domain: string,
  ): Promise<IUserBrowsingRule | null> {
    return UserBrowsingRuleModel.findOne({
      userId: new Types.ObjectId(userId),
      ruleType: "domain",
      domain,
    })
      .lean()
      .exec();
  },

  async findById(userId: string, id: string): Promise<IUserBrowsingRule | null> {
    return UserBrowsingRuleModel.findOne({
      _id: new Types.ObjectId(id),
      userId: new Types.ObjectId(userId),
    })
      .lean()
      .exec();
  },

  async createDomainRule(
    data: CreateBrowsingDomainRuleDto,
  ): Promise<IUserBrowsingRule> {
    const doc = await UserBrowsingRuleModel.create({
      userId: new Types.ObjectId(data.userId),
      ruleType: "domain",
      domain: data.domain,
      rule: data.rule,
    });

    return doc.toObject() as IUserBrowsingRule;
  },

  async updateRuleById(
    userId: string,
    id: string,
    rule: BrowsingRuleValue,
  ): Promise<IUserBrowsingRule | null> {
    const doc = await UserBrowsingRuleModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(id),
        userId: new Types.ObjectId(userId),
      },
      { $set: { rule } },
      { returnDocument: "after" },
    )
      .lean()
      .exec();

    return doc as IUserBrowsingRule | null;
  },

  async deleteById(userId: string, id: string): Promise<IUserBrowsingRule | null> {
    const doc = await UserBrowsingRuleModel.findOneAndDelete({
      _id: new Types.ObjectId(id),
      userId: new Types.ObjectId(userId),
    })
      .lean()
      .exec();

    return doc as IUserBrowsingRule | null;
  },
};