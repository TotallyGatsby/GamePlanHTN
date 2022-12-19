// Portions of this file are derived from FluidHTN (MIT License)
// Copyright (c) 2019 Pål Trefall
// https://github.com/ptrefall/fluid-hierarchical-task-network

import { test } from "uvu";
import * as assert from "uvu/assert";
import Planner from "../src/planner.js";
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
  const task2 = TestUtil.getSimplePrimitiveTask("Sub-task");

  domain.add(domain.Root, task1);
  domain.add(task1, task2);

  planner.tick(domain, ctx);
  const currentTask = planner.getCurrentTask();

  assert.not(currentTask);
  assert.equal(planner.lastStatus, TaskStatus.Failure);
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
  assert.equal(planner.lastStatus, TaskStatus.Failure);
});

test.run();
