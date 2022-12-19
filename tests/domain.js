/* eslint-disable max-statements -- Some long tests are long */
// Portions of this file are derived from FluidHTN (MIT License)
// Copyright (c) 2019 Pål Trefall
// https://github.com/ptrefall/fluid-hierarchical-task-network

import { test } from "uvu";
import * as assert from "uvu/assert";
import log from "loglevel";
import Domain from "../src/domain.js";
import TaskStatus from "../src/taskStatus.js";
import DecompositionStatus from "../src/decompositionStatus.js";
import * as TestUtil from "./utils.js";
import ContextState from "../src/contextState.js";
import EffectType from "../src/effectType.js";
import PausePlanTask from "../src/Tasks/pausePlanTask.js";

log.enableAll();

const example1 = {
  name: "Test",
  tasks: [
    {
      name: "GetC",
      type: "select",
      tasks: [
        {
          name: "Get C (Primitive Task)",
          conditions: [
            // Has A and B
            (context) => context.hasState("HasA") && context.hasState("HasB"),
            // Has NOT C
            (context) => !context.hasState("HasC"),
          ],
          operator: () => {
            log.info("Get C");

            return TaskStatus.Success;
          },
          effects: [
            // Has C
            (context) => context.setState("HasC"),
          ],
        },
      ],
    },
    {
      name: "GatAandB",
      type: "sequence",
      tasks: [
        {
          name: "Get A (Primitive Task)",
          conditions: [
            // Has NOT A NOR B
            (context) => !(context.hasState("HasA") && context.hasState("HasB")),
          ],
          operator:
            // Get A
            () => {
              log.info("Get A");

              return TaskStatus.Success;
            },
          effects: [
            // Has A
            (context) => context.setState("HasA"),
          ],
        }, {
          name: "Get B (Primitive Task)",
          operator:
            // Get A
            () => {
              log.info("Get B");

              return TaskStatus.Success;
            },
          effects: [
            // Has B
            (context) => context.setState("HasB"),
          ],
        },
      ],
    },
    {
      name: "Done",
      type: "select",
      tasks: [
        {
          name: "Done",
          operator: () => {
            log.info("Done");

            return TaskStatus.Continue;
          },
        },
      ],
    },
  ],
};

// This style is planned but not supported yet
/*
let example2 = {
  name: "Get A, B, then C",
  tasks: [
    {
      name: "GetC",
      type: "select",
      tasks: [
        {
          conditions: ["hasAandB", "hasNotC"],
          actions: ["getC"],
          effects: ["hasC"],
        },
      ],
    },
    {
      name: "GetAandB",
      type: "sequence",
      tasks: [
        {
          conditions: ["hasNotANorB"],
          actions: ["getA"],
          effects: ["hasA"],
        }, {
          actions: ["getA"],
          effects: ["hasB"],
        },
      ],
    }, {
      name: "Done",
      type: "sequence",
      tasks: [
        {
          name: "Done",
          actions: ["done"],
        },
      ],
    },
  ],
  actions: {
    done: (context) => {
      console.log("Done");

      return TaskStatus.Continue;
    },
    // Get A
    getA: () => {
      console.log("Get A");
      return TaskStatus.Success;
    },
    // Get B
    getB:
      () => {
        console.log("Get B");
        return TaskStatus.Success;
      },
    // Get C
    getC:
      () => {
        console.log("Get C");
        return TaskStatus.Success;
      },
  },
  conditions: {
    // Has NOT A NOR B
    hasNotANorB: (context) => !(context.hasState("HasA") && context.hasState("HasB")),
    // Has A and B
    hasAandB: (context) => context.hasState("HasA") && context.hasState("HasB"),
    // Has NOT C
    hasNotC: (context) => !context.hasState("HasC"),
  },
  effects: {
    hasA: (context) => context.setState("HasA"),
    hasB: (context) => context.setState("HasB"),
    hasC: (context) => context.setState("HasC"),
  },
};
*/


test("Create a Domain successfully", () => {
  new Domain(example1);
});

test("Name and Root are added to domains", () => {
  const domain = new Domain(example1);

  assert.ok(domain.Root);
  assert.equal(domain.Name, "Test");
});

test("Add Subtask to domain expected behavior", () => {
  const domain = new Domain({});

  const task1 = TestUtil.getEmptyCompoundTask();
  const task2 = TestUtil.getSimplePrimitiveTask("foo");

  domain.add(task1, task2);
  assert.ok(task1.Children.includes(task2));
  assert.equal(task2.Parent, task1);
});

test("Planning throws without a context", () => {
  const domain = new Domain({});

  assert.throws(() => {
    domain.findPlan(null);
  });
});

test("Planning throws with an uninitialized context", () => {
  const ctx = TestUtil.getEmptyTestContext();
  const domain = new Domain({});

  assert.throws(() => {
    domain.findPlan(ctx);
  });
});


test("Planning returns null if there are no tasks", () => {
  const ctx = TestUtil.getEmptyTestContext();

  ctx.init();

  const domain = new Domain({ name: "Test" });
  const planResult = domain.findPlan(ctx);

  assert.equal(planResult.status, DecompositionStatus.Rejected);
  assert.equal(planResult.plan.length, 0);
});

test("MTR Null throws exception", () => {
  const ctx = TestUtil.getEmptyTestContext();

  ctx.init();
  ctx.MethodTraversalRecord = null;

  const domain = new Domain({ name: "Test" });

  assert.throws(() => {
    domain.findPlan(ctx);
  });
});

test("Planning leaves context in Executing state", () => {
  const ctx = TestUtil.getEmptyTestContext();

  ctx.init();

  const domain = TestUtil.getEmptyTestDomain();

  domain.findPlan(ctx);
  assert.equal(ctx.ContextState, ContextState.Executing);
});

test("findPlan expected behavior", () => {
  const ctx = TestUtil.getEmptyTestContext();

  ctx.init();

  const domain = TestUtil.getEmptyTestDomain();
  const task1 = TestUtil.getEmptySelectorTask("Test");
  const task2 = TestUtil.getSimplePrimitiveTask("Sub-task");

  domain.add(domain.Root, task1);
  domain.add(task1, task2);

  const planResult = domain.findPlan(ctx);

  assert.equal(planResult.status, DecompositionStatus.Succeeded);
  assert.ok(planResult.plan);
  assert.equal(planResult.plan.length, 1);
  assert.equal(planResult.plan[0].Name, "Sub-task");
});

test("findPlan trims non permanent state changes", () => {
  const ctx = TestUtil.getEmptyTestContext();

  ctx.init();

  const domain = TestUtil.getEmptyTestDomain();
  const task1 = TestUtil.getEmptySequenceTask("Test");
  const task2 = TestUtil.getSimplePrimitiveTask("Sub-task1");

  task2.Effects.push(TestUtil.getSimpleEffect("TestEffect1",
    EffectType.PlanOnly,
    "HasA"));

  const task3 = TestUtil.getSimplePrimitiveTask("Sub-task2");

  task3.Effects.push(TestUtil.getSimpleEffect("TestEffect2",
    EffectType.PlanAndExecute,
    "HasB"));

  const task4 = TestUtil.getSimplePrimitiveTask("Sub-task3");

  task4.Effects.push(TestUtil.getSimpleEffect("TestEffect3",
    EffectType.Permanent,
    "HasC"));

  domain.add(domain.Root, task1);
  domain.add(task1, task2);
  domain.add(task1, task3);
  domain.add(task1, task4);

  const planResult = domain.findPlan(ctx);

  assert.equal(planResult.status, DecompositionStatus.Succeeded);
  assert.equal(ctx.WorldStateChangeStack.HasA.length, 0);
  assert.equal(ctx.WorldStateChangeStack.HasB.length, 0);
  assert.equal(ctx.WorldStateChangeStack.HasC.length, 0);
  assert.equal(ctx.WorldState.HasA, 0);
  assert.equal(ctx.WorldState.HasB, 0);
  assert.equal(ctx.WorldState.HasC, 1);
  assert.equal(planResult.plan.length, 3);
});


test("findPlan clears state change when plan is empty", () => {
  const ctx = TestUtil.getEmptyTestContext();

  ctx.init();
  const domain = TestUtil.getEmptyTestDomain();
  const task1 = TestUtil.getEmptySequenceTask("Test");
  const task2 = TestUtil.getSimplePrimitiveTask("Sub-task1");
  const task3 = TestUtil.getSimplePrimitiveTask("Sub-task2");
  const task4 = TestUtil.getSimplePrimitiveTask("Sub-task3");
  const task5 = TestUtil.getSimplePrimitiveTask("Sub-task4");

  task2.Effects.push(TestUtil.getSimpleEffect("TestEffect1", EffectType.PlanOnly, "HasA"));
  task3.Effects.push(TestUtil.getSimpleEffect("TestEffect2", EffectType.PlanAndExecute, "HasB"));
  task4.Effects.push(TestUtil.getSimpleEffect("TestEffect3", EffectType.Permanent, "HasC"));

  task5.Conditions.push((context) => context.Done === true);

  domain.add(domain.Root, task1);
  domain.add(task1, task2);
  domain.add(task1, task3);
  domain.add(task1, task4);
  domain.add(task1, task5);

  const status = domain.findPlan(ctx);

  assert.equal(status.status, DecompositionStatus.Rejected);
  assert.equal(ctx.WorldStateChangeStack.HasA.length, 0);
  assert.equal(ctx.WorldStateChangeStack.HasB.length, 0);
  assert.equal(ctx.WorldStateChangeStack.HasC.length, 0);
  assert.equal(ctx.WorldState.HasA, 0);
  assert.equal(ctx.WorldState.HasB, 0);
  assert.equal(ctx.WorldState.HasC, 0);
  assert.equal(status.plan, []);
});


test("findPlan if MTRs are equal then return empty plan", () => {
  const ctx = TestUtil.getEmptyTestContext();

  ctx.init();
  ctx.LastMTR.push(1);

  // Root is a Selector that branch off into task1 selector or task2 sequence.
  // MTR only tracks decomposition of compound tasks, so our MTR is only 1 layer deep here,
  // Since both compound tasks decompose into primitive tasks.
  const domain = TestUtil.getEmptyTestDomain();
  const task1 = TestUtil.getEmptySequenceTask("Test1");
  const task2 = TestUtil.getEmptySelectorTask("Test2");
  const task3 = TestUtil.getSimplePrimitiveTask("Sub-task1").addCondition((context) => context.Done === true);
  const task4 = TestUtil.getSimplePrimitiveTask("Sub-task1");
  const task5 = TestUtil.getSimplePrimitiveTask("Sub-task2").addCondition((context) => context.Done === true);

  domain.add(domain.Root, task1);
  domain.add(domain.Root, task2);
  domain.add(task1, task3);
  domain.add(task2, task4);
  domain.add(task2, task5);
  const { status, plan } = domain.findPlan(ctx);

  assert.equal(status, DecompositionStatus.Rejected);
  assert.equal(plan.length, 0);
  assert.equal(ctx.MethodTraversalRecord.length, 1);
  assert.equal(ctx.MethodTraversalRecord[0], ctx.LastMTR[0]);
});


test("Pause Plan expected behavior", () => {
  const ctx = TestUtil.getEmptyTestContext();

  ctx.init();
  const domain = TestUtil.getEmptyTestDomain();
  const task = TestUtil.getEmptySequenceTask("Test");

  domain.add(domain.Root, task);
  domain.add(task, TestUtil.getSimplePrimitiveTask("Sub-task1"));
  domain.add(task, new PausePlanTask());
  domain.add(task, TestUtil.getSimplePrimitiveTask("Sub-task2"));

  const { status, plan } = domain.findPlan(ctx);

  assert.equal(status, DecompositionStatus.Partial);
  assert.ok(plan);
  assert.equal(plan.length, 1);
  assert.equal("Sub-task1", plan[0].Name);
  assert.equal(ctx.HasPausedPartialPlan, true);
  assert.equal(ctx.PartialPlanQueue.length, 1);
  assert.equal(task, ctx.PartialPlanQueue[0].task);
  assert.equal(2, ctx.PartialPlanQueue[0].taskIndex);
});

test("Continue Paused Plan expected behavior", () => {
  const ctx = TestUtil.getEmptyTestContext();

  ctx.LogDecomposition = true;
  ctx.init();

  const domain = TestUtil.getEmptyTestDomain();
  const task = TestUtil.getEmptySequenceTask("Test");

  domain.add(domain.Root, task);
  domain.add(task, TestUtil.getSimplePrimitiveTask("Sub-task1"));
  domain.add(task, new PausePlanTask());
  domain.add(task, TestUtil.getSimplePrimitiveTask("Sub-task2"));

  let { status, plan } = domain.findPlan(ctx);

  assert.equal(status, DecompositionStatus.Partial);
  assert.ok(plan);
  assert.equal(plan.length, 1);
  assert.equal("Sub-task1", plan.shift().Name);
  assert.equal(ctx.HasPausedPartialPlan, true);
  assert.equal(ctx.PartialPlanQueue.length, 1);
  assert.equal(task, ctx.PartialPlanQueue[0].task);
  assert.equal(2, ctx.PartialPlanQueue[0].taskIndex);

  ({ status, plan } = domain.findPlan(ctx));

  assert.equal(status, DecompositionStatus.Succeeded);
  assert.ok(plan);
  assert.equal(plan.length, 1);
  assert.equal("Sub-task2", plan[0].Name);
});

test("Nested Pause Plan Expected behavior", () => {
  const ctx = TestUtil.getEmptyTestContext();

  ctx.init();

  const domain = TestUtil.getEmptyTestDomain();
  const task = TestUtil.getEmptySequenceTask("Test");
  const task2 = TestUtil.getEmptySelectorTask("Test2");
  const task3 = TestUtil.getEmptySequenceTask("Test3");

  domain.add(domain.Root, task);
  domain.add(task, task2);
  domain.add(task, TestUtil.getSimplePrimitiveTask("Sub-task4"));

  domain.add(task2, task3);
  domain.add(task2, TestUtil.getSimplePrimitiveTask("Sub-task3"));

  domain.add(task3, TestUtil.getSimplePrimitiveTask("Sub-task1"));
  domain.add(task3, new PausePlanTask());
  domain.add(task3, TestUtil.getSimplePrimitiveTask("Sub-task2"));

  const { status, plan } = domain.findPlan(ctx);

  assert.equal(status, DecompositionStatus.Partial);
  assert.ok(plan);
  assert.equal(plan.length, 1);
  assert.equal("Sub-task1", plan[0].Name);
  assert.equal(ctx.HasPausedPartialPlan, true);
  assert.equal(ctx.PartialPlanQueue.length, 2);
  const queueAsArray = ctx.PartialPlanQueue;

  assert.equal(task3, queueAsArray[0].Task);
  assert.equal(2, queueAsArray[0].TaskIndex);
  assert.equal(task, queueAsArray[1].Task);
  assert.equal(1, queueAsArray[1].TaskIndex);
});


test("Continue nested pause plan expected behavior", () => {
  const ctx = TestUtil.getEmptyTestContext();

  ctx.init();
  const domain = TestUtil.getEmptyTestDomain();

  const task = TestUtil.getEmptySequenceTask("Test");
  const task2 = TestUtil.getEmptySelectorTask("Test2");
  const task3 = TestUtil.getEmptySequenceTask("Test3");

  domain.add(domain.Root, task);
  domain.add(task, task2);
  domain.add(task, TestUtil.getSimplePrimitiveTask("Sub-task4"));

  domain.add(task2, task3);
  domain.add(task2, TestUtil.getSimplePrimitiveTask("Sub-task3"));

  domain.add(task3, TestUtil.getSimplePrimitiveTask("Sub-task1"));
  domain.add(task3, new PausePlanTask());
  domain.add(task3, TestUtil.getSimplePrimitiveTask("Sub-task2"));

  let { status, plan } = domain.findPlan(ctx);

  assert.equal(status, DecompositionStatus.Partial);
  assert.ok(plan);
  assert.equal(plan.length, 1);
  assert.equal("Sub-task1", plan.shift().Name);
  assert.equal(ctx.HasPausedPartialPlan);
  assert.equal(ctx.PartialPlanQueue.length, 2);
  const queueAsArray = ctx.PartialPlanQueue;

  assert.equal(task3, queueAsArray[0].Task);
  assert.equal(2, queueAsArray[0].TaskIndex);
  assert.equal(task, queueAsArray[1].Task);
  assert.equal(1, queueAsArray[1].TaskIndex);

  ({ status, plan } = domain.findPlan(ctx));

  assert.equal(status, DecompositionStatus.Succeeded);
  assert.ok(plan);
  assert.equal(plan.length, 2);
  assert.equal("Sub-task2", plan.shift().Name);
  assert.equal("Sub-task4", plan.shift().Name);
});

test("Continue multiple nested pause plan expected behavior", () => {
  const ctx = TestUtil.getEmptyTestContext();

  ctx.init();
  const domain = TestUtil.getEmptyTestDomain();

  const task = TestUtil.getEmptySequenceTask("Test");
  const task2 = TestUtil.getEmptySelectorTask("Test2");
  const task3 = TestUtil.getEmptySequenceTask("Test3");
  const task4 = TestUtil.getEmptySequenceTask("Test4");

  domain.add(domain.Root, task);

  domain.add(task3, TestUtil.getSimplePrimitiveTask("Sub-task1"));
  domain.add(task3, new PausePlanTask());
  domain.add(task3, TestUtil.getSimplePrimitiveTask("Sub-task2"));

  domain.add(task2, task3);
  domain.add(task2, TestUtil.getSimplePrimitiveTask("Sub-task3"));

  domain.add(task4, TestUtil.getSimplePrimitiveTask("Sub-task5"));
  domain.add(task4, new PausePlanTask());
  domain.add(task4, TestUtil.getSimplePrimitiveTask("Sub-task6"));

  domain.add(task, task2);
  domain.add(task, TestUtil.getSimplePrimitiveTask("Sub-task4"));
  domain.add(task, task4);
  domain.add(task, TestUtil.getSimplePrimitiveTask("Sub-task7"));

  let { status, plan } = domain.findPlan(ctx);

  assert.equal(status, DecompositionStatus.Partial);
  assert.ok(plan);
  assert.equal(plan.length, 1);
  assert.equal("Sub-task1", plan.shift().Name);
  assert.equal(ctx.HasPausedPartialPlan);
  assert.equal(ctx.PartialPlanQueue.length, 2);
  const queueAsArray = ctx.PartialPlanQueue;

  assert.equal(task3, queueAsArray[0].Task);
  assert.equal(2, queueAsArray[0].TaskIndex);
  assert.equal(task, queueAsArray[1].Task);
  assert.equal(1, queueAsArray[1].TaskIndex);

  ({ status, plan } = domain.findPlan(ctx));

  assert.equal(status, DecompositionStatus.Partial);
  assert.ok(plan);
  assert.equal(plan.length, 3);
  assert.equal("Sub-task2", plan.shift().Name);
  assert.equal("Sub-task4", plan.shift().Name);
  assert.equal("Sub-task5", plan.shift().Name);

  ({ status, plan } = domain.findPlan(ctx));

  assert.equal(status, DecompositionStatus.Succeeded);
  assert.ok(plan);
  assert.equal(plan.length, 2);
  assert.equal("Sub-task6", plan.shift().Name);
  assert.equal("Sub-task7", plan.shift().Name);
});

test.run();
