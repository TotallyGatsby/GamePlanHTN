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
const onDecomposeCompoundTask = (context, task, taskIndex, oldStackDepth, result, plan) => {
  const subPlan = [];
  var status = task.decompose(context, 0, subPlan);

  // If result is null, that means the entire planning procedure should cancel.
  if (status === DecompositionStatus.Rejected) {
    plan = [];
    context.trimToStackDepth(oldStackDepth);
    result = [];

    return DecompositionStatus.Rejected;
  }

  // If the decomposition failed
  if (status === DecompositionStatus.Failed) {
    plan = [];
    context.trimToStackDepth(oldStackDepth);
    result = plan;

    return DecompositionStatus.Failed;
  }

  plan.concat(subPlan);
  result = plan;

  return DecompositionStatus.Succeeded;
};

// eslint-disable-next-line max-params -- TODO: Fix this
const onDecomposeTask = (context, task, taskIndex, oldStackDepth, result, plan) => {
  if (!task.isValid(context)) {
    plan = [];
    context.trimToStackDepth(oldStackDepth);
    result = plan;

    return DecompositionStatus.Failed;
  }

  if (task instanceof CompoundTask) {
    return onDecomposeCompoundTask(context, task, taskIndex, oldStackDepth, result, plan);
  } else if (task instanceof PrimitiveTask) {
    log.debug(`Adding primitive task to plan: ${task.Name}`);
    task.applyEffects(context);
    plan.push(task);
  }

  result = plan;

  return (result.length === 0) ? DecompositionStatus.Failed : DecompositionStatus.Succeeded;
};

// For a sequence task, all children need to successfully decompose
const decompose = (context, startIndex, result, task) => {
  log.debug(`Decomposing Task: ${task.Name} with start index: ${startIndex}`);
  const plan = [];

  for (let index = startIndex; index < task.Children.length; index++) {
    const childTask = task.Children[index];

    log.debug(`Evaluating child task: ${childTask.Name}`);

    // Note: result and plan will be mutated by this function
    // TODO: To make this simpler to understand should these functions return an object that contains
    // a status and the plan?
    const status = onDecomposeTask(context, childTask, index, undefined, result, plan);

    // If we cannot make a plan OR if any task failed, short circuit this for loop
    if (status === DecompositionStatus.Rejected || status === DecompositionStatus.Failed) {
      log.debug(`Child task of [${task.Name}] named [${childTask.Name}] failed to decompose with status: ${status}`);

      return status;
    }
  }

  result.length = 0;
  result.push(...plan);

  log.debug(`Resulting plan from ${task.Name}: ${JSON.stringify(result)}`);

  return result.Count === 0 ? DecompositionStatus.Failed : DecompositionStatus.Succeeded;
};

export { isValid, decompose };
