import { test } from "uvu";
import * as assert from "uvu/assert";

import PrimitiveTask from "../src/Tasks/primitiveTask.js";

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
  assert.type(task.Operator, "function");
});

test("Create simple functional primitive task ", () => {
  const task = new PrimitiveTask(prim2);

  assert.is(task.Name, "");
  assert.type(task.Operator, "function");
});


test("Create simple anonymous primitive task ", () => {
  const task = new PrimitiveTask(() => {
    console.log("three");
  });

  assert.is(task.Name, "");
  assert.type(task.Operator, "function");
});

test.run();
