import { Types } from "mongoose";
import {
  type ITabGroupActivationEvent,
  TabGroupActivationEventModel,
} from "../models/tab-group-activation-event.model";

export interface CreateTabGroupActivationEventDto {
  userId: string;
  tabGroupId: string;
  tabGroupName: string;
  tabGroupColor: string;
  urls: string[];
}

export const TabGroupActivationEventRepository = {
  async create(
    data: CreateTabGroupActivationEventDto,
  ): Promise<ITabGroupActivationEvent> {
    const doc = await TabGroupActivationEventModel.create({
      userId: new Types.ObjectId(data.userId),
      tabGroupId: new Types.ObjectId(data.tabGroupId),
      tabGroupName: data.tabGroupName,
      tabGroupColor: data.tabGroupColor,
      urls: data.urls,
      activatedAt: new Date(),
    });

    return doc.toObject() as ITabGroupActivationEvent;
  },

  async findRecentByUserId(
    userId: string,
    limit: number,
  ): Promise<ITabGroupActivationEvent[]> {
    return TabGroupActivationEventModel.find({
      userId: new Types.ObjectId(userId),
    })
      .sort({ activatedAt: -1 })
      .limit(limit)
      .lean()
      .exec() as Promise<ITabGroupActivationEvent[]>;
  },
};
