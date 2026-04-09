import * as v from "@valibot/valibot";
import {
  Entity,
  field,
  Model,
  relation,
  Timestamps,
  UuidPrimaryKey,
} from "@curio/core";

const userCreateValidationSchema = v.object({
  id: v.optional(v.string()),
  email: v.pipe(v.string(), v.email()),
  passwordHash: v.string(),
  createdAt: v.optional(v.date()),
  updatedAt: v.optional(v.date()),
});

const userUpdateValidationSchema = v.partial(v.object({
  email: v.pipe(v.string(), v.email()),
  passwordHash: v.string(),
  updatedAt: v.optional(v.date()),
}));

/**
 * Application user model consumed by Curio admin auth.
 *
 * @remarks
 * Roles are normalized through the `UserRole` join table rather than stored as
 * a direct enum on the user row.
 */
export const UserModel = new Model({
  name: "User",
  table: "users",
  uses: [UuidPrimaryKey, Timestamps],
  fields: {
    email: field.string().required().unique().sortable(),
    passwordHash: field.string().required().hidden().searchable(false),
  },
  relations: {
    userRoles: relation.hasMany("UserRole").foreignKey("userId"),
    sessions: relation.hasMany("Session").foreignKey("userId"),
    auditEvents: relation.hasMany("AuditEvent").foreignKey("actorUserId"),
  },
  defaultOrder: [{ createdAt: "desc" }],
  validation: {
    create: userCreateValidationSchema,
    update: userUpdateValidationSchema,
  },
});

/** Hydrated application user entity returned by Curio repositories. */
export class UserEntity extends Entity {
  declare id: string;
  declare email: string;
  declare passwordHash: string;
  declare createdAt: Date;
  declare updatedAt: Date;

  get emailDomain(): string {
    return this.email.split("@")[1] ?? "";
  }
}

/** Bound application user entity registration for `Database.create(...)`. */
export const User = UserEntity.from(UserModel);
