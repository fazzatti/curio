import {
  findExistingSuperadmin,
  DEFAULT_ROLE_KEYS,
  syncUserRoles,
} from "@curio/core/admin/modules/rbac";
import { hashPassword } from "@curio/core/auth";

type UserRecord = {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
};

type RoleRecord = {
  id: string;
  key: string;
};

type UserRepository = {
  create(
    input: Pick<UserRecord, "email" | "passwordHash">,
  ): Promise<UserRecord>;
};

type RoleRepository = {
  findOne(
    options?: { where?: Partial<Pick<RoleRecord, "key">> },
  ): Promise<RoleRecord | null>;
};

type AppDatabase = {
  User: UserRepository;
  Role: RoleRepository;
  transaction<TResult>(
    operation: (database: AppDatabase) => Promise<TResult>,
  ): Promise<TResult>;
};

export class SuperAdminAlreadyExistsError extends Error {
  constructor(email: string) {
    super(`A superadmin already exists for ${email}.`);
    this.name = "SuperAdminAlreadyExistsError";
  }
}

export type CreateSuperAdminInput = {
  email: string;
  password: string;
  db: AppDatabase;
};

/**
 * Creates the first application superadmin account.
 *
 * @param input Superadmin creation input.
 * @returns The created user entity.
 *
 * @remarks
 * The database must already be prepared and seeded with the built-in admin
 * roles before this helper runs.
 */
export const createSuperAdmin = async (
  input: CreateSuperAdminInput,
): Promise<UserRecord> => {
  const email = input.email.trim().toLowerCase();

  if (!email) {
    throw new Error("Superadmin email cannot be empty.");
  }

  if (!input.password) {
    throw new Error("Superadmin password cannot be empty.");
  }

  const existingSuperAdmin = await findExistingSuperadmin(
    input.db as Parameters<typeof findExistingSuperadmin>[0],
  );

  if (existingSuperAdmin) {
    throw new SuperAdminAlreadyExistsError(existingSuperAdmin.email);
  }

  const superadminRole = await input.db.Role.findOne({
    where: {
      key: DEFAULT_ROLE_KEYS.superadmin,
    },
  });

  if (!superadminRole) {
    throw new Error("Built-in superadmin role has not been seeded.");
  }

  const passwordHash = await hashPassword(input.password);

  return await input.db.transaction(async (tx) => {
    const user = await tx.User.create({
      email,
      passwordHash,
    });

    await syncUserRoles(
      tx as Parameters<typeof syncUserRoles>[0],
      user.id,
      [superadminRole.id],
    );

    return user;
  });
};
