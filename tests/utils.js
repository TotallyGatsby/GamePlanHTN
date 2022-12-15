import Context from "../src/context.js";
import CompoundTask from "../src/Tasks/compoundTask.js";

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

export {
  getEmptyTestContext,
  getEmptyCompoundTask,
};
