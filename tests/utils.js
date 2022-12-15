// Portions of this file are derived from FluidHTN (MIT License)
// Copyright (c) 2019 Pål Trefall
// https://github.com/ptrefall/fluid-hierarchical-task-network

import Context from "../src/context.js";
import Domain from "../src/domain.js";
import CompoundTask from "../src/Tasks/compoundTask.js";
import PrimitiveTask from "../src/Tasks/primitiveTask.js";
import log from "loglevel";

function getEmptyTestContext() {
  const context = new Context();

  context.WorldState = {
    HasA: 0,
    HasB: 0,
    HasC: 0,
  };

  return context;
}

function getEmptyCompoundTask() {
  return new CompoundTask({
    name: "TestTask",
    type: "sequence",
    conditions: [],
    effects: [],
    tasks: [],
  });
}

function getEmptySelectorTask(name) {
  return new CompoundTask({
    name,
    type: "select",
    conditions: [],
    effects: [],
    tasks: [],
  });
}

function getSimplePrimitiveTask(name) {
  return new PrimitiveTask({
    name,
    conditions: [],
    effects: [],
    operator: () => {
      log.info("test");
    },
  });
}

function getEmptyTestDomain() {
  return new Domain({ name: "Test" });
}

export {
  getEmptyTestContext,
  getEmptyCompoundTask,
  getEmptyTestDomain,
  getEmptySelectorTask,
  getSimplePrimitiveTask,
};
