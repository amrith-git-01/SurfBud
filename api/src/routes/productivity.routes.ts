import { Router } from "express";
import { ProductivityController } from "../controllers/productivity.controller";
import { authenticate } from "../middleware/auth.middleware";
import {
  validate,
  validateParams,
  validateQuery,
} from "../middleware/validate.middleware";
import {
  CreateStreakSchema,
  CreateTabGroupSchema,
  ActivateFocusDraftSchema,
  EndFocusSessionSchema,
  FocusDraftsQuerySchema,
  FocusHistoryQuerySchema,
  ProductivityObjectIdParamSchema,
  SaveFocusDraftSchema,
  StartFocusSessionSchema,
  StreakCalendarQuerySchema,
  TabEvolutionSchema,
  TabGroupActivationsQuerySchema,
  UpdateFocusSessionSchema,
  UpdateProductivityUserSettingsSchema,
  UpdateStreakSchema,
  UpdateTabGroupSchema,
} from "../schemas/productivity.schemas";

export const productivityRouter = Router();

productivityRouter.use(authenticate);

productivityRouter.get(
  "/settings",
  ProductivityController.getProductivityUserSettings,
);

productivityRouter.patch(
  "/settings",
  validate(UpdateProductivityUserSettingsSchema),
  ProductivityController.updateProductivityUserSettings,
);

productivityRouter.get("/tab-groups", ProductivityController.getTabGroups);

productivityRouter.get(
  "/tab-groups/activations",
  validateQuery(TabGroupActivationsQuerySchema),
  ProductivityController.getRecentTabGroupActivations,
);

productivityRouter.get(
  "/tab-groups/:id/launch-urls",
  validateParams(ProductivityObjectIdParamSchema),
  ProductivityController.getTabGroupLaunchUrls,
);

productivityRouter.post(
  "/tab-groups",
  validate(CreateTabGroupSchema),
  ProductivityController.createTabGroup,
);

productivityRouter.patch(
  "/tab-groups/:id",
  validateParams(ProductivityObjectIdParamSchema),
  validate(UpdateTabGroupSchema),
  ProductivityController.updateTabGroup,
);

productivityRouter.delete(
  "/tab-groups/:id",
  validateParams(ProductivityObjectIdParamSchema),
  ProductivityController.deleteTabGroup,
);

productivityRouter.post(
  "/tab-groups/:id/activate",
  validateParams(ProductivityObjectIdParamSchema),
  ProductivityController.activateTabGroup,
);

productivityRouter.post(
  "/tab-groups/:id/tab-evolution",
  validateParams(ProductivityObjectIdParamSchema),
  validate(TabEvolutionSchema),
  ProductivityController.saveTabEvolution,
);

productivityRouter.get("/streaks", ProductivityController.getStreaks);

productivityRouter.post(
  "/streaks",
  validate(CreateStreakSchema),
  ProductivityController.createStreak,
);

productivityRouter.patch(
  "/streaks/:id",
  validateParams(ProductivityObjectIdParamSchema),
  validate(UpdateStreakSchema),
  ProductivityController.updateStreak,
);

productivityRouter.delete(
  "/streaks/:id",
  validateParams(ProductivityObjectIdParamSchema),
  ProductivityController.deleteStreak,
);

productivityRouter.get(
  "/streaks/:id/calendar",
  validateParams(ProductivityObjectIdParamSchema),
  validateQuery(StreakCalendarQuerySchema),
  ProductivityController.getStreakCalendar,
);

productivityRouter.get(
  "/focus/active",
  ProductivityController.getActiveFocusSession,
);

productivityRouter.get(
  "/focus/drafts",
  validateQuery(FocusDraftsQuerySchema),
  ProductivityController.getFocusDrafts,
);

productivityRouter.post(
  "/focus/sessions",
  validate(StartFocusSessionSchema),
  ProductivityController.startFocusSession,
);

productivityRouter.post(
  "/focus/drafts",
  validate(SaveFocusDraftSchema),
  ProductivityController.saveFocusDraft,
);

productivityRouter.post(
  "/focus/sessions/:id/start",
  validateParams(ProductivityObjectIdParamSchema),
  validate(ActivateFocusDraftSchema),
  ProductivityController.activateFocusDraft,
);

productivityRouter.patch(
  "/focus/sessions/:id/end",
  validateParams(ProductivityObjectIdParamSchema),
  validate(EndFocusSessionSchema),
  ProductivityController.endFocusSession,
);

productivityRouter.patch(
  "/focus/sessions/:id",
  validateParams(ProductivityObjectIdParamSchema),
  validate(UpdateFocusSessionSchema),
  ProductivityController.updateFocusSession,
);

productivityRouter.delete(
  "/focus/sessions/:id",
  validateParams(ProductivityObjectIdParamSchema),
  ProductivityController.deleteFocusSession,
);

productivityRouter.get(
  "/focus/sessions",
  validateQuery(FocusHistoryQuerySchema),
  ProductivityController.getFocusHistory,
);
