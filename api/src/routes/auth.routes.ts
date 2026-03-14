import { Router } from "express";
import { z } from "zod";
import { AuthController } from "../controllers/auth.controller";
import { validate } from "../middleware/validate.middleware";
import { authenticate } from "../middleware/auth.middleware";

const RegisterSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  displayName: z.string().min(1, "Display name is required"),
  timezone: z.string().optional(),
});

const LoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  timezone: z.string().optional(),
});

export const authRouter = Router();

authRouter.post("/register", validate(RegisterSchema), AuthController.register);
authRouter.post("/login", validate(LoginSchema), AuthController.login);
authRouter.post("/logout", AuthController.logout);
authRouter.get("/me", authenticate, AuthController.me);
