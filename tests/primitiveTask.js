import { test } from "uvu";
import * as assert from "uvu/assert";

import PrimitiveTask from "../src/Tasks/primitiveTask.js";
import Context from "../src/context.js";

const prim = {
  name: "foo",
  conditions: [],
  effects: [],
  operator: () => {
    console.log("test");
  },
};

const prim2 = () => {
  console.log("primitive 2");
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
    console.log("three");
  });

  assert.is(task.Name, "");
  assert.type(task.operator, "function");
});

const primPrecon1 = {
  name: "Precondition Fail",
  conditions: [
    (context, task) => false,
  ],
  effects: [],
  operator: () => {
    console.log("test");
  },
};

test("Test a failed precondition (uninitialized context)", () => {
  const task = new PrimitiveTask(primPrecon1);

  assert.is(task.isValid(new Context()), false);
});

const primPrecon2 = {
  name: "Precondition Pass",
  conditions: [
    (context, task) => true,
  ],
  effects: [],
  operator: () => {
    console.log("test");
  },
};

test("Test a passed precondition ", () => {
  const task = new PrimitiveTask(primPrecon2);
  const context = new Context();

  context.init();
  assert.is(task.isValid(context), true);
});

test.run();
