import {
  assert,
  assertEquals,
  assertInstanceOf,
  assertMatch,
  assertThrows,
} from "@std/assert";
import {
  Database,
  Entity,
  field,
  memoryDatabaseAdapter,
  Model,
  Timestamps,
  UuidPrimaryKey,
} from "@/mod.ts";
import {
  createFixtureBuilder,
  type FixtureBuildContext,
} from "@/testing.ts";

const UserModel = new Model({
  name: "User",
  table: "users",
  uses: [UuidPrimaryKey, Timestamps],
  fields: {
    email: field.string({ unique: true }).required(),
    name: field.string().required(),
    slug: field.string().required(),
    notes: field.text(),
    isActive: field.boolean(),
    age: field.integer(),
    score: field.number(),
    role: field.enum(["admin", "member"] as const),
    profile: field.json<Record<string, unknown>>(),
  },
});

class UserEntityBase extends Entity {
  declare email: string;

  get domain() {
    return this.email.split("@")[1];
  }
}

const UserEntity = UserEntityBase.from(UserModel);

const ArticleModel = new Model({
  name: "Article",
  table: "articles",
  fields: {
    id: field.id(),
    homepageUrl: field.string(),
    pageTitle: field.string(),
    passwordHint: field.string(),
    code: field.string(),
    metadata: field.json<{ tags: string[] }>({
      default: { tags: ["draft"] },
    }),
    status: field.enum(["draft", "published"] as const),
    luckyNumber: field.number(),
    favoriteColor: field.string(),
  },
});

const BrokenEnumModel = new Model({
  name: "BrokenEnum",
  table: "broken_enums",
  fields: {
    id: field.id(),
    state: field.enum<string>([]),
  },
});

Deno.test("createFixtureBuilder generates deterministic model-aware records and can reset", () => {
  const fixtures = createFixtureBuilder(UserModel, {
    seed: "users",
  });

  const first = fixtures.build();
  const second = fixtures.build();

  assertMatch(
    first.id,
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
  );
  assertEquals(first.email, "user+1@example.com");
  assertEquals(first.name, "User 1");
  assertEquals(first.slug, "user-1");
  assertEquals(first.notes, "User notes 1");
  assertEquals(first.isActive, true);
  assertEquals(first.age, 1);
  assertEquals(first.score, 1.5);
  assertEquals(first.role, "admin");
  assertEquals((first.profile as { field: string }).field, "profile");
  assertEquals((first.profile as { index: number }).index, 1);
  assertEquals((first.profile as { model: string }).model, "User");
  assertEquals(typeof (first.profile as { seed: number }).seed, "number");
  assertInstanceOf(first.createdAt, Date);
  assertInstanceOf(first.updatedAt, Date);
  assertEquals(second.email, "user+2@example.com");
  assertEquals(second.role, "member");

  fixtures.reset();

  const reset = fixtures.build();
  assertEquals(reset, first);
});

Deno.test("createFixtureBuilder supports custom generators, overrides, and hydration", () => {
  const fixtures = createFixtureBuilder(UserEntity, {
    generators: {
      email: ({ index }) => `member-${index}@example.com`,
      score: () => 42,
    },
    seed: "custom",
  });

  const built = fixtures.build({
    age: 99,
    name: "Custom User",
  });
  const hydrated = fixtures.hydrate({
    email: "owner@example.com",
  });

  assertEquals(built.email, "member-1@example.com");
  assertEquals(built.score, 42);
  assertEquals(built.age, 99);
  assertEquals(built.name, "Custom User");

  assertInstanceOf(hydrated, UserEntityBase);
  assertEquals(hydrated.email, "owner@example.com");
  assertEquals(hydrated.domain, "example.com");
});

Deno.test("createFixtureBuilder can persist fixture batches through repositories", async () => {
  const db = Database.create({
    adapter: memoryDatabaseAdapter(),
    tables: {
      User: UserEntity,
    },
  });
  const fixtures = createFixtureBuilder(UserEntity, {
    seed: "repo",
  });

  const created = await fixtures.createMany(db.User, 2, (index) => ({
    name: `Member ${index + 1}`,
  }));

  assertEquals(created.length, 2);
  assertEquals(created[0]?.name, "Member 1");
  assertEquals(created[1]?.name, "Member 2");
  assertEquals((await db.User.findMany()).length, 2);
});

Deno.test("createFixtureBuilder rejects invalid batch counts", () => {
  const fixtures = createFixtureBuilder(UserModel);

  assertThrows(
    () => fixtures.buildMany(-1),
    RangeError,
    "Fixture count must be a non-negative integer.",
  );
});

Deno.test("createFixtureBuilder covers deterministic defaults, cloning, and batch helpers", async () => {
  const fixtures = createFixtureBuilder(ArticleModel, {
    seed: "article-fixtures",
    generators: {
      luckyNumber: (context: FixtureBuildContext) =>
        Number(context.random().toFixed(6)),
      favoriteColor: (
        context: FixtureBuildContext<Record<string, unknown>>,
      ) => context.pick(["red", "blue", "green"] as const),
    },
  });

  const first = fixtures.build();
  const many = fixtures.buildMany(2);
  const hydratedMany = fixtures.hydrateMany(2, {
    favoriteColor: "green",
  });

  assertEquals(first.id, "article_1");
  assertEquals(first.homepageUrl, "https://example.com/article/homepageurl/1");
  assertEquals(first.pageTitle, "Article Title 1");
  assertEquals(first.passwordHint, "secret-article-1");
  assertEquals(first.code, "articles-code-1");
  assertEquals(first.status, "draft");
  assertEquals(typeof first.luckyNumber, "number");
  assert(["red", "blue", "green"].includes(first.favoriteColor));
  assertEquals(first.metadata, { tags: ["draft"] });

  first.metadata.tags.push("mutated");

  const second = fixtures.build();
  assertEquals(second.metadata, { tags: ["draft"] });

  assertEquals(many.length, 2);
  assertEquals(many[0]?.id, "article_2");
  assertEquals(many[1]?.id, "article_3");
  assertEquals(hydratedMany.length, 2);
  assertEquals(hydratedMany[0]?.favoriteColor, "green");
  assertEquals(hydratedMany[1]?.favoriteColor, "green");

  const db = Database.create({
    adapter: memoryDatabaseAdapter(),
    tables: {
      Article: ArticleModel,
    },
  });

  const created = await fixtures.create(db.Article, {
    code: "manual-code",
  });

  assertEquals(created.code, "manual-code");
  assertEquals((await db.Article.findMany()).length, 1);
});

Deno.test("createFixtureBuilder surfaces generator and enum edge cases explicitly", () => {
  const emptyPickFixtures = createFixtureBuilder(ArticleModel, {
    generators: {
      favoriteColor: (context: FixtureBuildContext<Record<string, unknown>>) =>
        context.pick([] as const),
    },
  });
  const brokenEnumFixtures = createFixtureBuilder(BrokenEnumModel);

  assertThrows(
    () => emptyPickFixtures.build(),
    Error,
    "Cannot pick from an empty fixture value list.",
  );
  assertThrows(
    () => brokenEnumFixtures.build(),
    Error,
    'Enum field "BrokenEnum.state" has no registered values.',
  );
});


Deno.test("fixtures handles missing values property on enum fields by defaulting to empty array", () => {
  const ModelWithoutValues = new Model({
    name: "NoValues",
    table: "novalues",
    fields: { 
      id: field.id(),
    }
  });
  ModelWithoutValues.fields["badEnum"] = {
    ...field.string().definition,
    kind: "enum",
  } as any;

  const b = createFixtureBuilder(ModelWithoutValues);
  
  assertThrows(
    () => b.build(),
    Error,
    'Enum field "NoValues.badEnum" has no registered values.'
  );
});

