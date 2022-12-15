// Portions of this file are derived from FluidHTN (MIT License)
// Copyright (c) 2019 Pål Trefall
// https://github.com/ptrefall/fluid-hierarchical-task-network

import log from "loglevel";
import DecompositionStatus from "../decompositionStatus.js";
import CompoundTask from "./compoundTask.js";
import PrimitiveTask from "./primitiveTask.js";

const isValid = (context, task) => {
  if (task.defaultValidityTest(context) === false) {
    return false;
  }

  // A sequence with 0 children is not valid
  if (task.Children.length === 0) {
    return false;
  }

  return true;
};

// eslint-disable-next-line max-params -- TODO: Fix this
const onDecomposeCompoundTask = (context, childTask, taskIndex, oldStackDepth, plan) => {
  log.debug(`Decomposing compund task: ${JSON.stringify(plan)}`);
  const childResult = childTask.decompose(context, 0);

  // If result is null, that means the entire planning procedure should cancel.
  if (childResult.status === DecompositionStatus.Rejected) {
    context.trimToStackDepth(oldStackDepth);

    return { plan: [], status: DecompositionStatus.Rejected };
  }

  // If the decomposition failed
  if (childResult.status === DecompositionStatus.Failed) {
    context.trimToStackDepth(oldStackDepth);

    return { plan: [], status: DecompositionStatus.Failed };
  }

  return { plan: plan.concat(childResult.plan), status: DecompositionStatus.Succeeded };
};

// eslint-disable-next-line max-params -- TODO: Fix this
const onDecomposeTask = (context, childTask, taskIndex, oldStackDepth, plan) => {
  if (!childTask.isValid(context)) {
    context.trimToStackDepth(oldStackDepth);

    return { plan: [], status: DecompositionStatus.Failed };
  }

  if (childTask instanceof CompoundTask) {
    return onDecomposeCompoundTask(context, childTask, taskIndex, oldStackDepth, plan);
  } else if (childTask instanceof PrimitiveTask) {
    log.debug(`Adding primitive task to plan: ${childTask.Name}`);
    childTask.applyEffects(context);
    plan.push(childTask);
  }

  return { plan, status: (plan.length === 0) ? DecompositionStatus.Failed : DecompositionStatus.Succeeded };
};

// For a sequence task, all children need to successfully decompose
const decompose = (context, startIndex, task) => {
  log.debug(`Decomposing Task: ${task.Name} with start index: ${startIndex}`);

  let result = {
    plan: [],
    status: DecompositionStatus.Rejected,
  };

  for (let index = startIndex; index < task.Children.length; index++) {
    const childTask = task.Children[index];

    log.debug(`Evaluating child task: ${childTask.Name}`);

    // Note: result and plan will be mutated by this function
    // TODO: To make this simpler to understand should these functions return an object that contains
    // a status and the plan?
    result = onDecomposeTask(context, childTask, index, undefined, result.plan);

    // If we cannot make a plan OR if any task failed, short circuit this for loop
    if (result.status === DecompositionStatus.Rejected || result.status === DecompositionStatus.Failed) {
      log.debug(`Child task of [${task.Name}] named [${childTask.Name}] failed to decompose with status: ${result.status}`);

      return result;
    }
  }

  result.status = result.plan.length === 0 ? DecompositionStatus.Failed : DecompositionStatus.Succeeded;
  log.debug(`Resulting plan from ${task.Name}: ${JSON.stringify(result)}`);

  return result;
};

export { isValid, decompose };
