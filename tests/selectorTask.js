import { test } from "uvu";
import * as assert from "uvu/assert";
import ContextState from "../src/contextState.js";
import DecompositionStatus from "../src/decompositionStatus.js";
import * as TestUtil from "./utils.js";

test("Add condition expected behavior", () => {
  const task = TestUtil.getEmptySelectorTask("Test");
  const t = task.addCondition((context) => context.Done === false);

  assert.equal(t, task);
  assert.equal(task.Conditions.length, 1);
});

test("Add subtask expected behavior", () => {
  const task = TestUtil.getEmptySelectorTask("Test");
  const t = task.addSubtask(TestUtil.getSimplePrimitiveTask("Sub-task"));

  assert.equal(t, task);
  assert.equal(task.Children.length, 1);
});

test("Is valid fails without subtasks expected behavior", () => {
  const ctx = TestUtil.getEmptyTestContext();
  const task = TestUtil.getEmptySelectorTask("Test");

  assert.equal(task.isValid(ctx), false);
});

test("Is valid expected behavior", () => {
  const ctx = TestUtil.getEmptyTestContext();
  const task = TestUtil.getEmptySelectorTask("Test");

  task.addSubtask(TestUtil.getSimplePrimitiveTask("Sub-task"));

  assert.equal(task.isValid(ctx), true);
});

test("Decompose with no subtasks expected behavior", () => {
  const ctx = TestUtil.getEmptyTestContext();
  const task = TestUtil.getEmptySelectorTask("Test");
  const status = task.decompose(ctx, 0);

  assert.equal(status.status, DecompositionStatus.Failed);
  assert.ok(status.plan);
  assert.equal(status.plan.length, 0);
});

test("Decompose with subtasks expected behavior", () => {
  const ctx = TestUtil.getEmptyTestContext();

  const task = TestUtil.getEmptySelectorTask("Test");

  task.addSubtask(TestUtil.getSimplePrimitiveTask("Sub-task1"));
  task.addSubtask(TestUtil.getSimplePrimitiveTask("Sub-task2"));
  const status = task.decompose(ctx, 0);

  assert.equal(status.status, DecompositionStatus.Succeeded);
  assert.ok(status.plan);
  assert.equal(status.plan.length, 1);
  assert.equal("Sub-task1", status.plan[0].Name);
});

test("Decompose with subtasks 2 expected behavior", () => {
  const ctx = TestUtil.getEmptyTestContext();
  const task = TestUtil.getEmptySelectorTask("Test");

  task.addSubtask(TestUtil.getEmptySelectorTask("Sub-task1"));
  task.addSubtask(TestUtil.getSimplePrimitiveTask("Sub-task2"));
  const status = task.decompose(ctx, 0);

  assert.equal(status.status, DecompositionStatus.Succeeded);
  assert.ok(status.plan);
  assert.equal(status.plan.length, 1);
  assert.equal("Sub-task2", status.plan[0].Name);
});
test.run();
