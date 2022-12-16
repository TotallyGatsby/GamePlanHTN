import { test } from "uvu";
import * as assert from "uvu/assert";
import ContextState from "../src/contextState.js";
import DecompositionStatus from "../src/decompositionStatus.js";
import * as TestUtil from "./utils.js";

test("Add Condition", () => {
  const task = TestUtil.getEmptySequenceTask("Test");
  const t = task.addCondition((context) => context.Done === false);

  assert.equal(t, task);
  assert.equal(task.Conditions.length, 1);
});

test("Add Subtask", () => {
  const task = TestUtil.getEmptySequenceTask("Test");
  const t = task.addSubtask(TestUtil.getSimplePrimitiveTask("Sub-task"));


  assert.equal(t, task);
  assert.equal(task.Children.length, 1);
});

test("IsValid fails without subtasks", () => {
  const task = TestUtil.getEmptySequenceTask("Test");
  const ctx = TestUtil.getEmptyTestContext();

  assert.not(task.isValid(ctx));
});


test("IsValid expected behavior", () => {
  const task = TestUtil.getEmptySequenceTask("Test");
  const ctx = TestUtil.getEmptyTestContext();

  task.addSubtask(TestUtil.getSimplePrimitiveTask("Sub-task"));

  assert.ok(task.isValid(ctx));
});

test("Decompose throws on unintialized context expected behavior", () => {
  const task = TestUtil.getEmptySequenceTask("Test");
  const ctx = TestUtil.getEmptyTestContext();

  assert.throws(() => {
    task.decompose(ctx, 0);
  });
});

test("Decompose with no subtasks expected behavior", () => {
  const ctx = TestUtil.getEmptyTestContext();

  ctx.init();
  const task = TestUtil.getEmptySequenceTask("Test");

  const status = task.decompose(ctx, 0);

  assert.equal(status.status, DecompositionStatus.Failed);
  assert.ok(status.plan);
  assert.equal(status.plan.length, 0);
});

test("Decompose with subtasks expected behavior", () => {
  const ctx = TestUtil.getEmptyTestContext();

  ctx.init();
  const task = TestUtil.getEmptySequenceTask("Test");

  task.addSubtask(TestUtil.getSimplePrimitiveTask("Sub-task1"));
  task.addSubtask(TestUtil.getSimplePrimitiveTask("Sub-task2"));
  const status = task.decompose(ctx, 0);

  assert.equal(status.status, DecompositionStatus.Succeeded);
  assert.ok(status.plan);
  assert.equal(status.plan.length, 2);
  assert.equal("Sub-task1", status.plan[0].Name);
});

test("Decompose nested subtasks expected behavior", () => {
  const ctx = TestUtil.getEmptyTestContext();

  ctx.init();
  const task = TestUtil.getEmptySequenceTask("Test");
  const task2 = TestUtil.getEmptySelectorTask("Test2");
  const task3 = TestUtil.getEmptySelectorTask("Test3");

  task3.addSubtask(TestUtil.getSimplePrimitiveTask("Sub-task1")
    .addCondition("Done == true", (context) => context.Done === true));
  task3.addSubtask(TestUtil.getSimplePrimitiveTask("Sub-task2"));

  task2.addSubtask(task3);
  task2.addSubtask(TestUtil.getSimplePrimitiveTask("Sub-task3"));

  task.addSubtask(task2);
  task.addSubtask(TestUtil.getSimplePrimitiveTask("Sub-task4"));

  const status = task.decompose(ctx, 0);

  assert.equal(status.status, DecompositionStatus.Succeeded);
  assert.ok(status.plan);
  assert.equal(status.plan.length, 2);
  assert.equal("Sub-task2", status.plan[0].Name);
  assert.equal("Sub-task4", status.plan[1].Name);
});

test("Decompose with subtasks one fail expected behavior", () => {
  const ctx = TestUtil.getEmptyTestContext();

  ctx.init();
  ctx.ContextState = ContextState.Planning;

  const task = TestUtil.getEmptySequenceTask("Test");

  task.addSubtask(TestUtil.getSimplePrimitiveTask("Sub-task1"));
  task.addSubtask(TestUtil.getSimplePrimitiveTask("Sub-task2")
    .addCondition("Done == true", (context) => context.Done === true));
  const status = task.decompose(ctx, 0);

  assert.equal(status.status, DecompositionStatus.Failed);
  assert.ok(status.plan);
  assert.equal(status.plan.length, 0);
});

test("Decompose with subtasks compound subtask fails expected behavior", () => {
  const ctx = TestUtil.getEmptyTestContext();

  ctx.init();
  ctx.ContextState = ContextState.Planning;

  const task = TestUtil.getEmptySequenceTask("Test");

  task.addSubtask(TestUtil.getEmptySelectorTask("Sub-task1"));
  task.addSubtask(TestUtil.getSimplePrimitiveTask("Sub-task2"));
  const status = task.decompose(ctx, 0);

  assert.equal(status.status, DecompositionStatus.Failed);
  assert.ok(status.plan);
  assert.equal(status.plan.length, 0);
});

test.run();
