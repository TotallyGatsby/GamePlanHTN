// Portions of this file are derived from FluidHTN (MIT License)
// Copyright (c) 2019 Pål Trefall
// https://github.com/ptrefall/fluid-hierarchical-task-network

import { test } from "uvu";
import log from "loglevel";
import * as assert from "uvu/assert";

import PrimitiveTask from "../src/Tasks/primitiveTask.js";
import Context from "../src/context.js";
import Effect from "../src/effect.js";

function getTestContext() {
  const context = new Context();

  context.WorldState = {
    HasA: 0,
    HasB: 0,
    HasC: 0,
  };

  return context;
}

const prim = {
  name: "foo",
  conditions: [],
  effects: [],
  operator: () => {
    log.info("test");
  },
};

const prim2 = () => {
  log.info("primitive 2");
};

test("Create simple primitive task", () => {
  const task = new PrimitiveTask(prim);

  assert.is(task.Name, "foo");
  assert.type(task.operator, "function");
});

test("Create simple functional primitive task ", () => {
  const task = new PrimitiveTask(prim2);

  assert.is(task.Name, "");
  assert.type(task.operator, "function");
});


test("Create simple anonymous primitive task ", () => {
  const task = new PrimitiveTask(() => {
    log.info("three");
  });

  assert.is(task.Name, "");
  assert.type(task.operator, "function");
});

const primPrecon1 = {
  name: "Precondition Fail",
  conditions: [
    () => false,
  ],
  effects: [],
  operator: () => {
    log.info("test");
  },
};

test("Test a failed precondition (uninitialized context)", () => {
  const task = new PrimitiveTask(primPrecon1);

  assert.is(task.isValid(new Context()), false);
});

const primPrecon2 = {
  name: "Precondition Pass",
  conditions: [
    () => true,
  ],
  effects: [],
  operator: () => {
    log.info("test");
  },
};

test("Test a passed precondition ", () => {
  const task = new PrimitiveTask(primPrecon2);
  const context = new Context();

  context.init();
  assert.is(task.isValid(context), true);
});

test("Test a conditions that aren't functions are invalid ", () => {
  const task = new PrimitiveTask(primPrecon2);

  task.Conditions.push("Spaghetti");

  const context = new Context();

  context.init();
  assert.not(task.isValid(context));
});

test("Test a conditions that return false invalidate ", () => {
  const task = new PrimitiveTask(primPrecon2);

  task.Conditions.push(() => false);

  const context = new Context();

  context.init();
  assert.not(task.isValid(context));
});

test("Applying effects, expected behavior ", () => {
  const ctx = getTestContext();
  const task = new PrimitiveTask(primPrecon2);

  task.Effects.push(new Effect((context) => {
    context.Done = true;
  }));

  task.applyEffects(ctx);

  assert.ok(ctx.Done);
});

test.run();
