import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { Entity } from "@/db/entity.ts";
import { field } from "@/db/field.ts";
import { memoryDatabaseAdapter } from "@/db/memory-adapter.ts";
import { Model } from "@/db/model.ts";
import type {
  RawRecord,
  ResolvedTableDefinition,
  WhereClause,
} from "@/db/types.ts";

const MemoryRecordModel = new Model({
  name: "MemoryRecord",
  table: "memory_records",
  fields: {
    id: field.id(),
    name: field.string().required().unique(),
    score: field.number(),
    active: field.boolean(),
    note: field.string().nullable(),
  },
});

const MemoryRecordEntity = Entity.from(MemoryRecordModel);

const OptionalMemoryRecordModel = new Model({
  name: "OptionalMemoryRecord",
  table: "optional_memory_records",
  fields: {
    id: field.id(),
    nickname: field.string().unique(),
  },
});

const OptionalMemoryRecordEntity = Entity.from(OptionalMemoryRecordModel);

const MEMORY_DEFINITION: ResolvedTableDefinition = {
  key: "MemoryRecord",
  model: MemoryRecordModel,
  entity: MemoryRecordEntity,
  primaryKey: "id",
  relations: {},
};

const OPTIONAL_MEMORY_DEFINITION: ResolvedTableDefinition = {
  key: "OptionalMemoryRecord",
  model: OptionalMemoryRecordModel,
  entity: OptionalMemoryRecordEntity,
  primaryKey: "id",
  relations: {},
};

describe("memoryDatabaseAdapter", () => {
  it("sorts and filters numbers, booleans, strings, and null values", async () => {
    const runtime = memoryDatabaseAdapter({
      seed: {
        MemoryRecord: [
          {
            id: "c",
            name: "charlie",
            score: 9,
            active: true,
            note: null,
          },
          {
            id: "a",
            name: "alpha",
            score: 3,
            active: false,
            note: "prefix-value",
          },
          {
            id: "b",
            name: "bravo",
            score: 6,
            active: true,
            note: "suffix-value",
          },
        ],
      },
    }).bind([MEMORY_DEFINITION]);

    assertEquals(
      (await runtime.findMany("MemoryRecord", {
        orderBy: [{ score: "asc" }],
      })).map((record) => record.id),
      ["a", "b", "c"],
    );
    assertEquals(
      (await runtime.findMany("MemoryRecord", {
        orderBy: [{ active: "asc" }, { name: "asc" }],
      })).map((record) => record.id),
      ["a", "b", "c"],
    );
    assertEquals(
      (await runtime.findMany("MemoryRecord", {
        where: { note: { isNull: true } },
      })).map((record) => record.id),
      ["c"],
    );
    assertEquals(
      (await runtime.findMany("MemoryRecord", {
        where: { note: { isNull: false } },
        orderBy: [{ id: "asc" }],
      })).map((record) => record.id),
      ["a", "b"],
    );
    assertEquals(
      (await runtime.findMany("MemoryRecord", {
        where: { note: { contains: "value" } },
        orderBy: [{ id: "asc" }],
      })).map((record) => record.id),
      ["a", "b"],
    );
    assertEquals(
      (await runtime.findMany("MemoryRecord", {
        where: { note: { startsWith: "prefix" } },
      })).map((record) => record.id),
      ["a"],
    );
    assertEquals(
      (await runtime.findMany("MemoryRecord", {
        where: { note: { endsWith: "value" } },
        orderBy: [{ id: "asc" }],
      })).map((record) => record.id),
      ["a", "b"],
    );
    assertEquals(
      (await runtime.findMany("MemoryRecord", {
        orderBy: [{ note: "asc" }],
      })).map((record) => record.id),
      ["c", "a", "b"],
    );
    assertEquals(
      (await runtime.findMany("MemoryRecord", {
        where: {
          AND: [
            { active: true },
            { OR: [{ score: { gt: 5 } }] },
            { NOT: [{ name: { eq: "charlie" } }] },
          ],
        },
      })).map((record) => record.id),
      ["b"],
    );
    assertEquals(
      await runtime.findMany("MemoryRecord", {
        where: { note: { contains: 12 as never } },
      }),
      [],
    );
  });

  it("returns null for missing updates/deletes and throws for unknown tables", async () => {
    const runtime = memoryDatabaseAdapter().bind([
      MEMORY_DEFINITION,
      OPTIONAL_MEMORY_DEFINITION,
    ]);

    const created = await runtime.create("MemoryRecord", {
      id: "one",
      name: "alpha",
      score: 1,
      active: true,
      note: null,
    });
    const updated = await runtime.updateById("MemoryRecord", created.id, {
      score: 2,
    });

    assertEquals(updated?.name, "alpha");
    assertEquals(updated?.score, 2);
    const optionalRecord = await runtime.create("OptionalMemoryRecord", {
      id: "optional-1",
    });
    assertEquals(optionalRecord.nickname, undefined);
    assertEquals(
      await runtime.updateById("MemoryRecord", "missing", { name: "next" }),
      null,
    );
    assertEquals(await runtime.deleteById("MemoryRecord", "missing"), null);
    assertThrows(
      () => runtime.findById("Missing", { id: "1" }),
      TypeError,
      'Unknown bound table "Missing" in memory adapter.',
    );
  });

  it("commits successful transactions and rolls back failed ones", async () => {
    const runtime = memoryDatabaseAdapter({
      seed: {
        MemoryRecord: [
          {
            id: "a",
            name: "alpha",
            score: 3,
            active: true,
            note: null,
          },
        ],
      },
    }).bind([MEMORY_DEFINITION]);

    await runtime.transaction(async (tx) => {
      await tx.create("MemoryRecord", {
        id: "b",
        name: "bravo",
        score: 5,
        active: false,
        note: "ok",
      });
    });

    assertEquals((await runtime.findMany("MemoryRecord")).length, 2);

    await assertRejects(
      () =>
        runtime.transaction(async (tx) => {
          await tx.create("MemoryRecord", {
            id: "c",
            name: "charlie",
            score: 7,
            active: true,
            note: "nope",
          });
          throw new Error("rollback");
        }),
      Error,
      "rollback",
    );

    assertEquals((await runtime.findMany("MemoryRecord")).length, 2);
  });

  it("supports the remaining scalar operators and pagination variants", async () => {
    const runtime = memoryDatabaseAdapter({
      seed: {
        MemoryRecord: [
          {
            id: "a",
            name: "alpha",
            score: 1,
            active: true,
            note: null,
          },
          {
            id: "b",
            name: "bravo",
            score: 2,
            active: false,
            note: "memo",
          },
          {
            id: "c",
            name: "charlie",
            score: 3,
            active: true,
            note: "memo",
          },
        ],
      },
    }).bind([MEMORY_DEFINITION]);

    assertEquals(
      (await runtime.findMany("MemoryRecord", {
        where: { name: { eq: "alpha" } },
      })).map((record) => record.id),
      ["a"],
    );
    assertEquals(
      (await runtime.findMany("MemoryRecord", {
        where: { name: { ne: "alpha" } },
        orderBy: [{ id: "asc" }],
      })).map((record) => record.id),
      ["b", "c"],
    );
    assertEquals(
      (await runtime.findMany("MemoryRecord", {
        where: { id: { in: ["a", "c"] } },
        orderBy: [{ id: "asc" }],
      })).map((record) => record.id),
      ["a", "c"],
    );
    assertEquals(
      (await runtime.findMany("MemoryRecord", {
        where: { id: { notIn: ["a"] } },
        orderBy: [{ id: "asc" }],
      })).map((record) => record.id),
      ["b", "c"],
    );
    assertEquals(
      (await runtime.findMany("MemoryRecord", {
        where: { score: { gte: 2, lte: 3 } },
        orderBy: [{ id: "asc" }],
      })).map((record) => record.id),
      ["b", "c"],
    );
    assertEquals(
      (await runtime.findMany("MemoryRecord", {
        where: { score: { lt: 3 } },
        orderBy: [{ id: "asc" }],
      })).map((record) => record.id),
      ["a", "b"],
    );
    assertEquals(
      (await runtime.findMany("MemoryRecord", {
        where: { score: { gte: 1 } },
        limit: 1,
        offset: 1,
        orderBy: [{ id: "asc" }],
      })).map((record) => record.id),
      ["b"],
    );
  });
});

Deno.test("Memory adapter deep coverage", async () => {
  type MemoryCoverageRecord = {
    id: string;
    name: string;
    score: number;
    active: boolean;
    note: string | null;
  };

  const where = (
    clause: WhereClause<MemoryCoverageRecord>,
  ): WhereClause<RawRecord> => clause as unknown as WhereClause<RawRecord>;

  const runtime = memoryDatabaseAdapter({
    seed: {
      MemoryRecord: [
        { id: "x", name: "foo", score: 10, active: true, note: "hello" },
        { id: "y", name: "bar", score: -10, active: false, note: "world" },
      ],
    },
  }).bind([MEMORY_DEFINITION]);

  // Test various operators
  assertEquals(
    (await runtime.findMany("MemoryRecord", {
      where: where({ score: { gt: 0 } }),
    })).map((record) => record.id),
    ["x"],
  );
  assertEquals(
    (await runtime.findMany("MemoryRecord", {
      where: where({ score: { gte: 10 } }),
    })).map((record) => record.id),
    ["x"],
  );
  assertEquals(
    (await runtime.findMany("MemoryRecord", {
      where: where({ score: { lt: 0 } }),
    })).map((record) => record.id),
    ["y"],
  );
  assertEquals(
    (await runtime.findMany("MemoryRecord", {
      where: where({ score: { lte: -10 } }),
    })).map((record) => record.id),
    ["y"],
  );
  assertEquals(
    (await runtime.findMany("MemoryRecord", {
      where: where({ name: { notIn: ["bar"] } }),
    })).map((record) => record.id),
    ["x"],
  );
  assertEquals(
    await runtime.findMany("MemoryRecord", {
      where: where({ score: { isNull: true } }),
    }),
    [],
  );
  assertEquals(
    (await runtime.findMany("MemoryRecord", {
      where: where({ name: { contains: "f" } }),
    })).map((record) => record.id),
    ["x"],
  );
  assertEquals(
    (await runtime.findMany("MemoryRecord", {
      where: where({ note: { startsWith: "hel" } }),
    })).map((record) => record.id),
    ["x"],
  );
  assertEquals(
    (await runtime.findMany("MemoryRecord", {
      where: where({ note: { endsWith: "rld" } }),
    })).map((record) => record.id),
    ["y"],
  );
  assertEquals(
    (await runtime.findMany("MemoryRecord", {
      where: where({ AND: [{ score: 10 }, { name: "foo" }] }),
    })).map((record) => record.id),
    ["x"],
  );
  assertEquals(
    (await runtime.findMany("MemoryRecord", {
      where: where({ OR: [{ score: 99 }, { name: "bar" }] }),
    })).map((record) => record.id),
    ["y"],
  );
  assertEquals(
    (await runtime.findMany("MemoryRecord", {
      where: where({ NOT: [{ score: 10 }] }),
    })).map((record) => record.id),
    ["y"],
  );

  // Missing conditions covered!
  assertThrows(
    () => runtime.findMany("non-existent-table"),
    TypeError,
    'Unknown bound table "non-existent-table" in memory adapter.',
  );
});
