import { test } from "uvu";
import * as assert from "uvu/assert";

import CompoundTask from "../src/Tasks/compoundTask.js";
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

const compound = {
  name: "foo2",
  type: "sequence",
  conditions: [],
  effects: [],
  tasks: [
    prim,
    () => {
      console.log("test");
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
    console.log("test");
  },
};

test("Create a compound task with only one anonymous primitive task", () => {
  const task = new CompoundTask(compound2);

  assert.is(task.Name, "foo3");
  assert.is(task.Type, "sequence");
  assert.is(task.Children.length, 1);
  assert.is(task.Children[0].Name, "");
});

test.run();
