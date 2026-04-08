import { Admin } from "@curio/sdk/admin";
import { db } from "@/db/index.ts";

/** Starter Curio admin mounted at `/admin`. */
export const admin = Admin.create({
  db,
  presets: ["default"],
  branding: {
    name: "__CURIO_PROJECT_NAME__ Admin",
    tagline: "Control room.",
  },
});
