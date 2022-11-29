import { test } from "uvu";
import log from "loglevel";
import * as assert from "uvu/assert";

import CompoundTask from "../src/Tasks/compoundTask.js";
import Context from "../src/context.js";

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

const compound = {
  name: "foo2",
  type: "sequence",
  conditions: [],
  effects: [],
  tasks: [
    prim,
    () => {
      log.info("test");
    },
    prim2,
  ],
};

test("Create a simple sequence of 3 primitive tasks", () => {
  const task = new CompoundTask(compound);

  assert.is(task.Name, "foo2");
  assert.is(task.Type, "sequence");
  assert.is(task.Children.length, 3);
  assert.is(task.Children[0].Name, "foo");
});

const compound2 = {
  name: "foo3",
  type: "sequence",
  conditions: [],
  effects: [],
  tasks: () => {
    log.info("test");
  },
};

test("Create a compound task with only one anonymous primitive task", () => {
  const task = new CompoundTask(compound2);

  assert.is(task.Name, "foo3");
  assert.is(task.Type, "sequence");
  assert.is(task.Children.length, 1);
  assert.is(task.Children[0].Name, "");
});

const compound3 = {
  name: "Compound with conditions",
  type: "sequence",
  conditions: [() => true],
  effects: [],
  tasks: () => {
    log.info("test");
  },
};

test("Create a compound task with one valid condition", () => {
  const task = new CompoundTask(compound3);
  const ctx = new Context();

  ctx.init();

  assert.is(task.Name, "Compound with conditions");
  assert.is(task.Type, "sequence");
  assert.is(task.Conditions.length, 1);
  assert.is(task.Children[0].Name, "");
  assert.is(task.isValid(ctx), true);
});

const compound4 = {
  name: "Compound with conditions",
  type: "select",
  conditions: [() => true],
  effects: [],
  tasks: () => {
    log.info("test");
  },
};

test("Create a compound task with one valid condition", () => {
  const task = new CompoundTask(compound4);
  const ctx = new Context();

  ctx.init();

  assert.is(task.Name, "Compound with conditions");
  assert.is(task.Type, "select");
  assert.is(task.Conditions.length, 1);
  assert.is(task.Children[0].Name, "");
  assert.is(task.isValid(ctx), true);
});

test.run();
