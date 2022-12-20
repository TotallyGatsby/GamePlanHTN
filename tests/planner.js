// Portions of this file are derived from FluidHTN (MIT License)
// Copyright (c) 2019 Pål Trefall
// https://github.com/ptrefall/fluid-hierarchical-task-network

import { test } from "uvu";
import * as assert from "uvu/assert";
import Effect from "../src/effect.js";
import EffectType from "../src/effectType.js";
import Planner from "../src/planner.js";
import PrimitiveTask from "../src/Tasks/primitiveTask.js";
import TaskStatus from "../src/taskStatus.js";
import * as TestUtil from "./utils.js";


test("Get Plan returns instance at start ", () => {
  const planner = new Planner();
  const plan = planner.getPlan();

  assert.ok(plan, null);
  assert.equal(plan.length, 0);
});

test("Get current task returns null at start ", () => {
  const planner = new Planner();
  const task = planner.getCurrentTask();

  assert.equal(task, null);
});

test("Tick with null parameters throws error ", () => {
  const planner = new Planner();

  assert.throws(() => {
    planner.tick(null, null);
  });
});

test("Tick with null domain throws exception ", () => {
  const ctx = TestUtil.getEmptyTestContext();

  ctx.init();

  const planner = new Planner();

  assert.throws(() => {
    planner.tick(null, ctx);
  });
});

test("Tick without initialized context throws exception ", () => {
  const ctx = TestUtil.getEmptyTestContext();
  const domain = TestUtil.getEmptyTestDomain();
  const planner = new Planner();

  assert.throws(() => {
    planner.tick(domain, ctx);
  });
});

test("Tick with empty domain expected behavior ", () => {
  const ctx = TestUtil.getEmptyTestContext();

  ctx.init();
  const domain = TestUtil.getEmptyTestDomain();
  const planner = new Planner();

  planner.tick(domain, ctx);
});

test("Tick with primitive task without operator expected behavior ", () => {
  const ctx = TestUtil.getEmptyTestContext();

  ctx.init();
  const planner = new Planner();
  const domain = TestUtil.getEmptyTestDomain();
  const task1 = TestUtil.getEmptySelectorTask("Test");
  const task2 = new PrimitiveTask({ name: "Sub-task" });

  domain.add(domain.Root, task1);
  domain.add(task1, task2);

  planner.tick(domain, ctx);
  const currentTask = planner.getCurrentTask();

  assert.not(currentTask);
  assert.equal(planner.LastStatus, TaskStatus.Failure);
});

test("Tick with operator with null function expected behavior ", () => {
  const ctx = TestUtil.getEmptyTestContext();

  ctx.init();
  const planner = new Planner();

  const domain = TestUtil.getEmptyTestDomain();
  const task1 = TestUtil.getEmptySelectorTask("Test");
  const task2 = TestUtil.getSimplePrimitiveTask("Sub-task");

  task2.setOperator(undefined);
  domain.add(domain.Root, task1);
  domain.add(task1, task2);

  planner.tick(domain, ctx);
  const currentTask = planner.getCurrentTask();

  assert.not(currentTask);
  assert.equal(planner.LastStatus, TaskStatus.Failure);
});

test("Tick with default success operator won't stack overflow expected behavior ", () => {
  const ctx = TestUtil.getEmptyTestContext();

  ctx.init();
  const planner = new Planner();

  const domain = TestUtil.getEmptyTestDomain();

  const task1 = TestUtil.getEmptySelectorTask("Test");
  const task2 = TestUtil.getSimplePrimitiveTask("Sub-task");

  task2.setOperator((_context) => TaskStatus.Success);
  domain.add(domain.Root, task1);
  domain.add(task1, task2);

  planner.tick(domain, ctx);
  const currentTask = planner.getCurrentTask();

  assert.not(currentTask);
  assert.equal(planner.LastStatus, TaskStatus.Success);
});


test("Tick with default continue operator expected behavior", () => {
  const ctx = TestUtil.getEmptyTestContext();

  ctx.init();
  const planner = new Planner();

  const domain = TestUtil.getEmptyTestDomain();
  const task1 = TestUtil.getEmptySelectorTask("Test");
  const task2 = TestUtil.getSimplePrimitiveTask("Sub-task");

  task2.setOperator((_context) => TaskStatus.Continue);
  domain.add(domain.Root, task1);
  domain.add(task1, task2);

  planner.tick(domain, ctx);
  const currentTask = planner.getCurrentTask();

  assert.ok(currentTask);
  assert.equal(planner.LastStatus, TaskStatus.Continue);
});

test("On New Plan expected behavior ", () => {
  let result = false;
  const ctx = TestUtil.getEmptyTestContext();

  ctx.init();
  const planner = new Planner();

  planner.onNewPlan = (p) => {
    result = p.length === 1;
  };

  const domain = TestUtil.getEmptyTestDomain();
  const task1 = TestUtil.getEmptySelectorTask("Test");
  const task2 = TestUtil.getSimplePrimitiveTask("Sub-task");

  task2.setOperator((_context) => TaskStatus.Continue);
  domain.add(domain.Root, task1);
  domain.add(task1, task2);

  planner.tick(domain, ctx);

  assert.ok(result);
});


test("On Replace Plan expected behavior ", () => {
  let result = false;
  const ctx = TestUtil.getEmptyTestContext();

  ctx.init();
  const planner = new Planner();

  planner.onReplacePlan = (op, ct, p) => {
    result = op.length === 0 && ct !== null && p.length === 1;
  };

  const domain = TestUtil.getEmptyTestDomain();
  const task1 = TestUtil.getEmptySelectorTask("Test");
  const task2 = TestUtil.getEmptySelectorTask("Test2");
  const task3 = new PrimitiveTask({ name: "Sub-task1" }).addCondition((context) => context.Done === false);
  const task4 = new PrimitiveTask({ name: "Sub-task2" });

  task3.setOperator((_context) => TaskStatus.Continue);
  task4.setOperator((_context) => TaskStatus.Continue);
  domain.add(domain.Root, task1);
  domain.add(domain.Root, task2);
  domain.add(task1, task3);
  domain.add(task2, task4);

  ctx.Done = true;
  planner.tick(domain, ctx);

  ctx.Done = false;
  ctx.IsDirty = true;
  planner.tick(domain, ctx);

  assert.ok(result);
});

test("On New Task expected behavior ", () => {
  let result = false;
  const ctx = TestUtil.getEmptyTestContext();

  ctx.init();
  const planner = new Planner();

  planner.onNewTask = (t) => {
    result = t.Name === "Sub-task";
  };
  const domain = TestUtil.getEmptyTestDomain();
  const task1 = TestUtil.getEmptySelectorTask("Test");
  const task2 = TestUtil.getSimplePrimitiveTask("Sub-task");

  task2.setOperator((_context) => TaskStatus.Continue);
  domain.add(domain.Root, task1);
  domain.add(task1, task2);

  planner.tick(domain, ctx);

  assert.ok(result);
});

test("On New Task Condition Failed expected behavior ", () => {
  let result = false;
  const ctx = TestUtil.getEmptyTestContext();

  ctx.init();
  const planner = new Planner();

  planner.onNewTaskConditionFailed = (t, _c) => {
    result = t.Name === "Sub-task1";
  };
  const domain = TestUtil.getEmptyTestDomain();
  const task1 = TestUtil.getEmptySelectorTask("Test");
  const task2 = TestUtil.getEmptySelectorTask("Test2");
  const task3 = new PrimitiveTask({ name: "Sub-task1" }).addCondition((context) => context.Done === false);
  const task4 = new PrimitiveTask({ Nname: "Sub-task2" });

  task3.setOperator((_context) => TaskStatus.Success);
  // Note that one should not use AddEffect on types that's not part of WorldState unless you
  // know what you're doing. Outside of the WorldState, we don't get automatic trimming of
  // state change. This method is used here only to invoke the desired callback, not because
  // its correct practice.

  task3.addEffect(new Effect({
    name: "TestEffect",
    type: EffectType.PlanAndExecute,
    action: (context, _type) => {
      context.Done = true;
    },
  }));

  task4.setOperator((_context) => TaskStatus.Continue);
  domain.add(domain.Root, task1);
  domain.add(domain.Root, task2);
  domain.add(task1, task3);
  domain.add(task2, task4);

  ctx.Done = true;
  planner.tick(domain, ctx);

  ctx.Done = false;
  ctx.IsDirty = true;
  planner.tick(domain, ctx);

  assert.ok(result);
});

test.run();
