/* eslint-disable max-statements -- Some tests are long. That's how tests be sometimes. */
import { test } from "uvu";
import * as assert from "uvu/assert";
import ContextState from "../src/contextState.js";
import DecompositionStatus from "../src/decompositionStatus.js";
import Effect from "../src/effect.js";
import EffectType from "../src/effectType.js";
import * as TestUtil from "./utils.js";
import PausePlanTask from "../src/Tasks/pausePlanTask.js";

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

test("Decompose with subtask compound subtask fails expected behavior", () => {
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


test("Decompose Failure return to previous world state expected behavior", () => {
  const ctx = TestUtil.getEmptyTestContext();

  ctx.init();
  ctx.ContextState = ContextState.Planning;
  ctx.setState("HasA", 1, true, EffectType.PlanAndExecute);
  ctx.setState("HasB", 1, true, EffectType.Permanent);
  ctx.setState("HasC", 1, true, EffectType.PlanOnly);

  const task = TestUtil.getEmptySequenceTask("Test");

  task.addSubtask(TestUtil.getSimplePrimitiveTask("Sub-task1")
    .addEffect(new Effect({
      name: "TestEffect",
      type: EffectType.Permanent,
      action: (context, _type) => context.setState("HasA", 0, true, EffectType.PlanOnly),
    })));
  task.addSubtask(TestUtil.getEmptySelectorTask("Sub-task2"));
  const { status, plan } = task.decompose(ctx, 0);

  assert.equal(status, DecompositionStatus.Failed);
  assert.ok(plan);
  assert.equal(plan.length, 0);
  assert.equal(ctx.WorldStateChangeStack.HasA.length, 1);
  assert.equal(ctx.WorldStateChangeStack.HasB.length, 1);
  assert.equal(ctx.WorldStateChangeStack.HasC.length, 1);
  assert.equal(1, ctx.getState("HasA"));
  assert.equal(1, ctx.getState("HasB"));
  assert.equal(1, ctx.getState("HasC"));
});


test("Decompose Nested Compound Subtask lost to MTR expected behavior", () => {
  const ctx = TestUtil.getEmptyTestContext();

  ctx.init();
  ctx.ContextState = ContextState.Planning;

  const task = TestUtil.getEmptySequenceTask("Test");
  const task2 = TestUtil.getEmptySelectorTask("Test2");
  const task3 = TestUtil.getEmptySelectorTask("Test3");

  task3.addSubtask(TestUtil.getSimplePrimitiveTask("Sub-task1")
    .addCondition((context) => context.Done === true));
  task3.addSubtask(TestUtil.getSimplePrimitiveTask("Sub-task2"));

  task2.addSubtask(task3);
  task2.addSubtask(TestUtil.getSimplePrimitiveTask("Sub-task3"));

  task.addSubtask(task2);
  task.addSubtask(TestUtil.getSimplePrimitiveTask("Sub-task4"));

  ctx.LastMTR.push(0);
  ctx.LastMTR.push(0);
  const { status, plan } = task.decompose(ctx, 0);

  assert.equal(status, DecompositionStatus.Rejected);
  assert.equal(plan.length, 0);
  assert.equal(ctx.MethodTraversalRecord.length, 2);
  assert.equal(ctx.MethodTraversalRecord[0], 0);
  assert.equal(ctx.MethodTraversalRecord[1], -1);
});


test("Decompose Nested Compound Subtask lost to MTR 2 expected behavior", () => {
  const ctx = TestUtil.getEmptyTestContext();

  ctx.init();
  ctx.ContextState = ContextState.Planning;

  const task = TestUtil.getEmptySequenceTask("Test");
  const task2 = TestUtil.getEmptySelectorTask("Test2");
  const task3 = TestUtil.getEmptySelectorTask("Test3");

  task3.addSubtask(TestUtil.getSimplePrimitiveTask("Sub-task1")
    .addCondition((context) => context.Done === true));
  task3.addSubtask(TestUtil.getSimplePrimitiveTask("Sub-task2"));

  task2.addSubtask(TestUtil.getSimplePrimitiveTask("Sub-task3")
    .addCondition((context) => context.Done === true));
  task2.addSubtask(task3);

  task.addSubtask(task2);
  task.addSubtask(TestUtil.getSimplePrimitiveTask("Sub-task4"));

  ctx.LastMTR.push(1);
  ctx.LastMTR.push(0);
  const { status, plan } = task.decompose(ctx, 0);

  assert.equal(status, DecompositionStatus.Rejected);
  assert.equal(plan.length, 0);
  assert.equal(ctx.MethodTraversalRecord.length, 2);
  assert.equal(ctx.MethodTraversalRecord[0], 1);
  assert.equal(ctx.MethodTraversalRecord[1], -1);
});


test("Decompose Nested Compound Subtask equal to MTR expected behavior", () => {
  const ctx = TestUtil.getEmptyTestContext();

  ctx.init();

  const task = TestUtil.getEmptySequenceTask("Test");
  const task2 = TestUtil.getEmptySelectorTask("Test2");
  const task3 = TestUtil.getEmptySelectorTask("Test3");

  task3.addSubtask(TestUtil.getSimplePrimitiveTask("Sub-task2")
    .addCondition((context) => context.Done === true));
  task3.addSubtask(TestUtil.getSimplePrimitiveTask("Sub-task3"));

  task2.addSubtask(TestUtil.getSimplePrimitiveTask("Sub-task1")
    .addCondition((context) => context.Done === true));
  task2.addSubtask(task3);

  task.addSubtask(task2);
  task.addSubtask(TestUtil.getSimplePrimitiveTask("Sub-task4"));

  ctx.LastMTR.push(1);
  ctx.LastMTR.push(1);
  const { status, plan } = task.decompose(ctx, 0);

  assert.equal(status, DecompositionStatus.Succeeded);
  assert.ok(plan);
  assert.equal(plan.length, 2);
  assert.equal(ctx.MethodTraversalRecord.length, 1);
  assert.equal(ctx.MethodTraversalRecord[0], 1);
  assert.equal("Sub-task3", plan.shift().Name);
  assert.equal("Sub-task4", plan.shift().Name);
});


test("Decompose Nested Compound Subtask lost to MTR return to previous world state expected behavior", () => {
  const ctx = TestUtil.getEmptyTestContext();

  ctx.init();
  ctx.ContextState = ContextState.Planning;
  ctx.setState("HasA", 1, true, EffectType.PlanAndExecute);
  ctx.setState("HasB", 1, true, EffectType.Permanent);
  ctx.setState("HasC", 1, true, EffectType.PlanOnly);

  const task = TestUtil.getEmptySequenceTask("Test");
  const task2 = TestUtil.getEmptySelectorTask("Test2");
  const task3 = TestUtil.getEmptySelectorTask("Test3");

  task3.addSubtask(TestUtil.getSimplePrimitiveTask("Sub-task2")
    .addCondition((context) => context.Done === true));
  task3.addSubtask(TestUtil.getSimplePrimitiveTask("Sub-task3")
    .addEffect(new Effect({
      name: "TestEffect",
      type: EffectType.Permanent,
      action: (context, _type) => context.setState("HasA", 0, true, EffectType.PlanOnly),
    })));

  task2.addSubtask(task3);
  task2.addSubtask(TestUtil.getSimplePrimitiveTask("Sub-task4")
    .addEffect(new Effect({
      name: "TestEffect",
      type: EffectType.Permanent,
      action: (context, _type) => context.setState("HasB", 0, true, EffectType.PlanOnly),
    })));

  task.addSubtask(TestUtil.getSimplePrimitiveTask("Sub-task1")
    .addEffect(new Effect({
      name: "TestEffect",
      type: EffectType.Permanent, action: (context, _type) => context.setState("HasA", 0, true, EffectType.PlanOnly),
    })));
  task.addSubtask(task2);
  task.addSubtask(TestUtil.getSimplePrimitiveTask("Sub-task5")
    .addEffect(
      new Effect({
        name: "TestEffect",
        type: EffectType.Permanent,
        action: (context, _type) => context.setState("HasC", 0, true, EffectType.PlanOnly),
      })));

  ctx.LastMTR.push(0);
  ctx.LastMTR.push(0);
  const { status, plan } = task.decompose(ctx, 0);

  assert.equal(status, DecompositionStatus.Rejected);
  assert.equal(plan.length, 0);
  assert.equal(ctx.MethodTraversalRecord.length, 2);
  assert.equal(ctx.MethodTraversalRecord[0], 0);
  assert.equal(ctx.MethodTraversalRecord[1], -1);
  assert.equal(ctx.WorldStateChangeStack.HasA.length, 1);
  assert.equal(ctx.WorldStateChangeStack.HasB.length, 1);
  assert.equal(ctx.WorldStateChangeStack.HasC.length, 1);
  assert.equal(1, ctx.getState("HasA"));
  assert.equal(1, ctx.getState("HasB"));
  assert.equal(1, ctx.getState("HasC"));
});


test("Decompose Nested Compound Subtask Fail Return to Previous World State expected behavior", () => {
  const ctx = TestUtil.getEmptyTestContext();

  ctx.init();
  ctx.ContextState = ContextState.Planning;
  ctx.setState("HasA", 1, true, EffectType.PlanAndExecute);
  ctx.setState("HasB", 1, true, EffectType.Permanent);
  ctx.setState("HasC", 1, true, EffectType.PlanOnly);

  const task = TestUtil.getEmptySequenceTask("Test");
  const task2 = TestUtil.getEmptySequenceTask("Test2");
  const task3 = TestUtil.getEmptySequenceTask("Test3");

  task3.addSubtask(TestUtil.getSimplePrimitiveTask("Sub-task2")
    .addCondition((context) => context.Done === true));
  task3.addSubtask(TestUtil.getSimplePrimitiveTask("Sub-task3")
    .addEffect(new Effect({
      name: "TestEffect",
      type: EffectType.Permanent,
      action: (context, _type) => context.setState("HasA", 0, true, EffectType.PlanOnly),
    })));

  task2.addSubtask(task3);
  task2.addSubtask(TestUtil.getSimplePrimitiveTask("Sub-task4")
    .addEffect(new Effect({
      name: "TestEffect",
      type: EffectType.Permanent,
      action: (context, _type) => context.setState("HasB", 0, true, EffectType.PlanOnly),
    })));

  task.addSubtask(TestUtil.getSimplePrimitiveTask("Sub-task1")
    .addEffect(new Effect({
      name: "TestEffect",
      type: EffectType.Permanent,
      action: (context) => context.setState("HasA", 0, true, EffectType.PlanOnly),
    })));
  task.addSubtask(task2);

  task.addSubtask(TestUtil.getSimplePrimitiveTask("Sub-task5")
    .addEffect(new Effect({
      name: "TestEffect",
      type: EffectType.Permanent,
      action: (context) => context.setState("HasC", 0, true, EffectType.PlanOnly),
    }
    )));

  const { status, plan } = task.decompose(ctx, 0);

  assert.equal(status, DecompositionStatus.Failed);
  assert.ok(plan);
  assert.equal(plan.length, 0);
  assert.equal(ctx.WorldStateChangeStack.HasA.length, 1);
  assert.equal(ctx.WorldStateChangeStack.HasB.length, 1);
  assert.equal(ctx.WorldStateChangeStack.HasC.length, 1);
  assert.equal(1, ctx.getState("HasA"));
  assert.equal(1, ctx.getState("HasB"));
  assert.equal(1, ctx.getState("HasC"));
});


test("PausePlan expected behavior", () => {
  const ctx = TestUtil.getEmptyTestContext();

  ctx.init();

  const task = TestUtil.getEmptySequenceTask("Test");

  task.addSubtask(TestUtil.getSimplePrimitiveTask("Sub-task1"));
  task.addSubtask(new PausePlanTask());
  task.addSubtask(TestUtil.getSimplePrimitiveTask("Sub-task2"));

  const { status, plan } = task.decompose(ctx, 0);

  assert.equal(status, DecompositionStatus.Partial);
  assert.ok(plan);
  assert.equal(plan.length, 1);
  assert.equal("Sub-task1", plan[0].Name);
  assert.equal(ctx.HasPausedPartialPlan, true);
  assert.equal(ctx.PartialPlanQueue.length, 1);
  assert.equal(task, ctx.PartialPlanQueue[0].task);
  assert.equal(2, ctx.PartialPlanQueue[0].taskIndex);
});

test("Continue PausePlan expected behavior", () => {
  const ctx = TestUtil.getEmptyTestContext();

  ctx.init();

  const task = TestUtil.getEmptySequenceTask("Test");

  task.addSubtask(TestUtil.getSimplePrimitiveTask("Sub-task1"));
  task.addSubtask(new PausePlanTask());
  task.addSubtask(TestUtil.getSimplePrimitiveTask("Sub-task2"));

  // eslint-disable-next-line prefer-const -- plan is not const
  let { status, plan } = task.decompose(ctx, 0);

  assert.equal(status, DecompositionStatus.Partial);
  assert.ok(plan);
  assert.equal(plan.length, 1);
  assert.equal("Sub-task1", plan.shift().Name);
  assert.equal(ctx.HasPausedPartialPlan, true);
  assert.equal(ctx.PartialPlanQueue.length, 1);
  assert.equal(task, ctx.PartialPlanQueue[0].task);
  assert.equal(2, ctx.PartialPlanQueue[0].taskIndex);

  ctx.HasPausedPartialPlan = false;
  plan = [];
  while (ctx.PartialPlanQueue.length > 0) {
    const kvp = ctx.PartialPlanQueue.shift();

    const { status: s, plan: p } = kvp.task.decompose(ctx, kvp.taskIndex);

    if (s === DecompositionStatus.Succeeded || s === DecompositionStatus.Partial) {
      while (p.length > 0) {
        plan.push(p.shift());
      }
    }
  }
  assert.ok(plan);
  assert.equal(plan.length, 1);
  assert.equal("Sub-task2", plan[0].Name);
});


test("Nested PausePlan expected behavior", () => {
  const ctx = TestUtil.getEmptyTestContext();

  ctx.LogDecomposition = true;
  ctx.init();

  const task = TestUtil.getEmptySequenceTask("Test");
  const task2 = TestUtil.getEmptySelectorTask("Test2");
  const task3 = TestUtil.getEmptySequenceTask("Test3");

  task3.addSubtask(TestUtil.getSimplePrimitiveTask("Sub-task1"));
  task3.addSubtask(new PausePlanTask());
  task3.addSubtask(TestUtil.getSimplePrimitiveTask("Sub-task2"));

  task2.addSubtask(task3);
  task2.addSubtask(TestUtil.getSimplePrimitiveTask("Sub-task3"));

  task.addSubtask(task2);
  task.addSubtask(TestUtil.getSimplePrimitiveTask("Sub-task4"));

  const { status, plan } = task.decompose(ctx, 0);

  assert.equal(status, DecompositionStatus.Partial);
  assert.ok(plan);
  assert.equal(plan.length, 1);
  assert.equal("Sub-task1", plan[0].Name);
  assert.equal(ctx.HasPausedPartialPlan, true);
  assert.equal(ctx.PartialPlanQueue.length, 2);
  const queueAsArray = ctx.PartialPlanQueue;

  assert.equal(task3, queueAsArray[0].task);
  assert.equal(2, queueAsArray[0].taskIndex);
  assert.equal(task, queueAsArray[1].task);
  assert.equal(1, queueAsArray[1].taskIndex);
});


test("Continue Nested PausePlan expected behavior", () => {
  const ctx = TestUtil.getEmptyTestContext();

  ctx.init();

  const task = TestUtil.getEmptySequenceTask("Test");
  const task2 = TestUtil.getEmptySelectorTask("Test2");
  const task3 = TestUtil.getEmptySequenceTask("Test3");

  task3.addSubtask(TestUtil.getSimplePrimitiveTask("Sub-task1"));
  task3.addSubtask(new PausePlanTask());
  task3.addSubtask(TestUtil.getSimplePrimitiveTask("Sub-task2"));

  task2.addSubtask(task3);
  task2.addSubtask(TestUtil.getSimplePrimitiveTask("Sub-task3"));

  task.addSubtask(task2);
  task.addSubtask(TestUtil.getSimplePrimitiveTask("Sub-task4"));

  // eslint-disable-next-line prefer-const -- plan is mutable
  let { status, plan } = task.decompose(ctx, 0);

  assert.equal(status, DecompositionStatus.Partial);
  assert.ok(plan);
  assert.equal(plan.length, 1);
  assert.equal("Sub-task1", plan.shift().Name);
  assert.equal(ctx.HasPausedPartialPlan, true);
  assert.equal(ctx.PartialPlanQueue.length, 2);
  const queueAsArray = ctx.PartialPlanQueue;

  assert.equal(task3, queueAsArray[0].task);
  assert.equal(2, queueAsArray[0].taskIndex);
  assert.equal(task, queueAsArray[1].task);
  assert.equal(1, queueAsArray[1].taskIndex);

  ctx.HasPausedPartialPlan = false;
  plan = [];
  while (ctx.PartialPlanQueue.length > 0) {
    const kvp = ctx.PartialPlanQueue.shift();
    const { status: s, plan: p } = kvp.task.decompose(ctx, kvp.taskIndex);

    if (s === DecompositionStatus.Succeeded || s === DecompositionStatus.Partial) {
      while (p.length > 0) {
        plan.push(p.shift());
      }
    }

    if (ctx.HasPausedPartialPlan) {
      break;
    }
  }

  assert.ok(plan);
  assert.equal(plan.length, 2);
  assert.equal("Sub-task2", plan.shift().Name);
  assert.equal("Sub-task4", plan.shift().Name);
});

test("Continue Multiple Nested PausePlan expected behavior", () => {
  const ctx = TestUtil.getEmptyTestContext();

  ctx.init();

  const task = TestUtil.getEmptySequenceTask("Test");
  const task2 = TestUtil.getEmptySelectorTask("Test2");
  const task3 = TestUtil.getEmptySequenceTask("Test3");
  const task4 = TestUtil.getEmptySequenceTask("Test4");

  task3.addSubtask(TestUtil.getSimplePrimitiveTask("Sub-task1"));
  task3.addSubtask(new PausePlanTask());
  task3.addSubtask(TestUtil.getSimplePrimitiveTask("Sub-task2"));

  task2.addSubtask(task3);
  task2.addSubtask(TestUtil.getSimplePrimitiveTask("Sub-task3"));

  task4.addSubtask(TestUtil.getSimplePrimitiveTask("Sub-task5"));
  task4.addSubtask(new PausePlanTask());
  task4.addSubtask(TestUtil.getSimplePrimitiveTask("Sub-task6"));

  task.addSubtask(task2);
  task.addSubtask(TestUtil.getSimplePrimitiveTask("Sub-task4"));
  task.addSubtask(task4);
  task.addSubtask(TestUtil.getSimplePrimitiveTask("Sub-task7"));

  // eslint-disable-next-line prefer-const -- plan is mutable
  let { status, plan } = task.decompose(ctx, 0);

  assert.equal(status, DecompositionStatus.Partial);
  assert.ok(plan);
  assert.equal(plan.length, 1);
  assert.equal("Sub-task1", plan.shift().Name);
  assert.equal(ctx.HasPausedPartialPlan, true);
  assert.equal(ctx.PartialPlanQueue.length, 2);
  const queueAsArray = ctx.PartialPlanQueue;

  assert.equal(task3, queueAsArray[0].task);
  assert.equal(2, queueAsArray[0].taskIndex);
  assert.equal(task, queueAsArray[1].task);
  assert.equal(1, queueAsArray[1].taskIndex);

  ctx.HasPausedPartialPlan = false;
  plan = [];
  while (ctx.PartialPlanQueue.length > 0) {
    const kvp = ctx.PartialPlanQueue.shift();
    const { status: s, plan: p } = kvp.task.decompose(ctx, kvp.TaskIndex);

    if (s === DecompositionStatus.Succeeded || s === DecompositionStatus.Partial) {
      while (p.length > 0) {
        plan.push(p.shift());
      }
    }

    if (ctx.HasPausedPartialPlan) {
      break;
    }
  }

  assert.ok(plan);
  assert.equal(plan.length, 3);
  assert.equal("Sub-task2", plan.shift().Name);
  assert.equal("Sub-task4", plan.shift().Name);
  assert.equal("Sub-task5", plan.shift().Name);

  ctx.HasPausedPartialPlan = false;
  plan = [];
  while (ctx.PartialPlanQueue.length > 0) {
    const kvp = ctx.PartialPlanQueue.shift();
    const { status: s, plan: p } = kvp.task.decompose(ctx, kvp.TaskIndex);

    if (s === DecompositionStatus.Succeeded || s === DecompositionStatus.Partial) {
      while (p.length > 0) {
        plan.push(p.shift());
      }
    }

    if (ctx.HasPausedPartialPlan) {
      break;
    }
  }

  assert.ok(plan);
  assert.equal(plan.length, 2);
  assert.equal("Sub-task6", plan.shift().Name);
  assert.equal("Sub-task7", plan.shift().Name);
});


test.run();
