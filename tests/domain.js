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
  var ctx = TestUtil.getEmptyTestContext();

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

test("FindPlan expected behavior", () => {
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

test.run();
