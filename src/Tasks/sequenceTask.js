// Portions of this file are derived from FluidHTN (MIT License)
// Copyright (c) 2019 Pål Trefall
// https://github.com/ptrefall/fluid-hierarchical-task-network

import log from "loglevel";
import DecompositionStatus from "../decompositionStatus.js";
import CompoundTask from "./compoundTask.js";
import PrimitiveTask from "./primitiveTask.js";
import PausePlanTask from "./pausePlanTask.js";

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
const onDecomposeCompoundTask = (context, childTask, taskIndex, oldStackDepth, plan, task) => {
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

  plan.push(...childResult.plan);
  if (context.HasPausedPartialPlan) {
    if (context.LogDecomposition) {
      log.debug(`Sequence.OnDecomposeCompoundTask:Return partial plan at index ${taskIndex}!`);
    }

    if (taskIndex < task.Children.length - 1) {
      context.PartialPlanQueue.push({
        task,
        taskIndex: taskIndex + 1,
      });
    }

    return {
      plan,
      status: DecompositionStatus.Partial,
    };
  }

  return { plan, status: DecompositionStatus.Succeeded };
};

// eslint-disable-next-line max-params -- TODO: Fix this
const onDecomposeTask = (context, childTask, taskIndex, oldStackDepth, plan, task) => {
  if (!childTask.isValid(context)) {
    context.trimToStackDepth(oldStackDepth);

    return { plan: [], status: DecompositionStatus.Failed };
  }

  if (context.LogDecomposition) {
    log.debug(`Sequence.OnDecomposeTask: Child task is valid.`);
  }

  if (childTask instanceof CompoundTask) {
    return onDecomposeCompoundTask(context, childTask, taskIndex, oldStackDepth, plan, task);
  } else if (childTask instanceof PrimitiveTask) {
    log.debug(`Adding primitive task to plan: ${childTask.Name}`);
    childTask.applyEffects(context);
    plan.push(childTask);
  } else if (childTask instanceof PausePlanTask) {
    if (context.LogDecomposition) {
      log.debug(`Sequence.OnDecomposeTask:Return partial plan at index ${taskIndex}!`);
    }
    context.HasPausedPartialPlan = true;
    context.PartialPlanQueue.push({
      task,
      taskIndex: taskIndex + 1,
    });

    return {
      plan,
      status: DecompositionStatus.Partial,
    };
  }

  if (context.LogDecomposition) {
    log.debug(`Sequence.OnDecomposeTask: Returning plan ${JSON.stringify(plan)}.`);
  }

  return { plan, status: (plan.length === 0) ? DecompositionStatus.Failed : DecompositionStatus.Succeeded };
};

// For a sequence task, all children need to successfully decompose
const decompose = (context, startIndex, task) => {
  let result = {
    plan: [],
    status: DecompositionStatus.Rejected,
  };

  const oldStackDepth = context.getWorldStateChangeDepth();

  for (let index = startIndex; index < task.Children.length; index++) {
    const childTask = task.Children[index];

    if (context.LogDecomposition) {
      log.debug(`Sequence.OnDecompose:Task index: ${index}: ${childTask?.Name}`);
    }

    // Note: result and plan will be mutated by this function
    result = onDecomposeTask(context, childTask, index, oldStackDepth, result.plan, task);

    if (context.LogDecomposition) {
      log.debug(`Sequence.OnDecompose: Received Result: ${JSON.stringify(result)}`);
    }
    // If we cannot make a plan OR if any task failed, short circuit this for loop
    if (result.status === DecompositionStatus.Rejected ||
      result.status === DecompositionStatus.Failed ||
      result.status === DecompositionStatus.Partial) {
      return result;
    }
  }

  result.status = result.plan.length === 0 ? DecompositionStatus.Failed : DecompositionStatus.Succeeded;

  return result;
};

export { isValid, decompose };
