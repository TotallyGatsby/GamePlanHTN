// Portions of this file are derived from FluidHTN (MIT License)
// Copyright (c) 2019 Pål Trefall
// https://github.com/ptrefall/fluid-hierarchical-task-network

import { test } from "uvu";
import * as assert from "uvu/assert";
import ContextState from "../src/contextState.js";
import EffectType from "../src/effectType.js";
import * as TestUtil from "./utils.js";


test("Context defaults to Executing", () => {
  var ctx = TestUtil.getEmptyTestContext();

  assert.is(ctx.ContextState, ContextState.Executing);
});

test("Init Initializes Collections", () => {
  var ctx = TestUtil.getEmptyTestContext();

  ctx.init();

  assert.is(true, ctx.WorldStateChangeStack !== null);

  // TODO: Evaluate how to handle the MyWorldState concept since we're in JS land
  // assert.is(Enum.GetValues(typeof (MyWorldState)).Length, ctx.WorldStateChangeStack.Length);
  assert.equal(false, ctx.DebugMTR);
  assert.equal(false, ctx.LogDecomposition);
  assert.equal([], ctx.MTRDebug);
  assert.equal([], ctx.LastMTRDebug);
  assert.equal([], ctx.DecompositionLog);
});

test("hasState expected behavior", () => {
  var ctx = TestUtil.getEmptyTestContext();

  ctx.init();
  ctx.setState("HasB", 1, true, EffectType.Permanent);

  assert.equal(false, ctx.hasState("HasA"));
  assert.equal(true, ctx.hasState("HasB"));
});

test("setState Planning Context expected behavior", () => {
  var ctx = TestUtil.getEmptyTestContext();

  ctx.init();
  ctx.ContextState = ContextState.Planning;
  ctx.setState("HasB", 1, true, EffectType.Permanent);

  assert.equal(true, ctx.hasState("HasB"));
  assert.equal(ctx.WorldStateChangeStack.HasA.length, 0);
  assert.equal(ctx.WorldStateChangeStack.HasB.length, 1);
  assert.equal(ctx.WorldStateChangeStack.HasB[0].effectType, EffectType.Permanent);
  assert.equal(ctx.WorldStateChangeStack.HasB[0].value, 1);
  assert.equal(ctx.WorldState.HasB, 0);
});

test("setState executing Context expected behavior", () => {
  var ctx = TestUtil.getEmptyTestContext();

  ctx.init();
  ctx.ContextState = ContextState.Executing;
  ctx.setState("HasB", 1, true, EffectType.Permanent);

  assert.ok(ctx.hasState("HasB"));
  assert.equal(ctx.WorldStateChangeStack.HasB.length, 0);
  assert.equal(ctx.WorldState.HasB, 1);
});


test("GetState planning context expected behavior", () => {
  var ctx = TestUtil.getEmptyTestContext();

  ctx.init();
  ctx.ContextState = ContextState.Planning;
  ctx.setState("HasB", 1, true, EffectType.Permanent);

  assert.equal(0, ctx.getState("HasA"));
  assert.equal(1, ctx.getState("HasB"));
});

test("GetState executing context expected behavior", () => {
  var ctx = TestUtil.getEmptyTestContext();

  ctx.init();
  ctx.ContextState = ContextState.Executing;
  ctx.setState("HasB", 1, true, EffectType.Permanent);

  assert.equal(0, ctx.getState("HasA"));
  assert.equal(1, ctx.getState("HasB"));
});


test("GetWorldStateChangeDepth expected behavior", () => {
  var ctx = TestUtil.getEmptyTestContext();

  ctx.init();
  ctx.ContextState = ContextState.Executing;
  ctx.setState("HasB", 1, true, EffectType.Permanent);
  const changeDepthExecuting = ctx.getWorldStateChangeDepth();

  ctx.ContextState = ContextState.Planning;
  ctx.setState("HasB", true, EffectType.Permanent);
  const changeDepthPlanning = ctx.getWorldStateChangeDepth();

  assert.equal(Object.keys(ctx.WorldStateChangeStack).length, Object.keys(changeDepthExecuting).length);
  assert.equal(changeDepthExecuting.HasA, 0);
  assert.equal(changeDepthExecuting.HasB, 0);

  assert.equal(Object.keys(ctx.WorldStateChangeStack).length, Object.keys(changeDepthPlanning).length);
  assert.equal(changeDepthPlanning.HasA, 0);
  assert.equal(changeDepthPlanning.HasB, 1);
});

test("Trim for execution expected behavior", () => {
  var ctx = TestUtil.getEmptyTestContext();

  ctx.init();
  ctx.ContextState = ContextState.Planning;
  ctx.setState("HasA", 1, true, EffectType.PlanAndExecute);
  ctx.setState("HasB", 1, true, EffectType.Permanent);
  ctx.setState("HasC", 1, true, EffectType.PlanOnly);
  ctx.trimForExecution();

  assert.equal(ctx.WorldStateChangeStack.HasA.length, 0);
  assert.equal(ctx.WorldStateChangeStack.HasB.length, 1);
  assert.equal(ctx.WorldStateChangeStack.HasC.length, 0);
});

test("Trim for execution throws exception on wrong context state", () => {
  var ctx = TestUtil.getEmptyTestContext();

  ctx.init();
  ctx.ContextState = ContextState.Executing;
  assert.throws(() =>
    ctx.trimForExecution()
  );
});

test("Trim to stack depth expected behavior", () => {
  var ctx = TestUtil.getEmptyTestContext();

  ctx.init();
  ctx.ContextState = ContextState.Planning;
  ctx.setState("HasA", 1, true, EffectType.PlanAndExecute);
  ctx.setState("HasB", 1, true, EffectType.Permanent);
  ctx.setState("HasC", 1, true, EffectType.PlanOnly);
  const stackDepth = ctx.getWorldStateChangeDepth();

  ctx.setState("HasA", 1, false, EffectType.PlanAndExecute);
  ctx.setState("HasB", 1, false, EffectType.Permanent);
  ctx.setState("HasC", 1, false, EffectType.PlanOnly);
  ctx.trimToStackDepth(stackDepth);

  assert.equal(ctx.WorldStateChangeStack.HasA.length, 1);
  assert.equal(ctx.WorldStateChangeStack.HasB.length, 1);
  assert.equal(ctx.WorldStateChangeStack.HasC.length, 1);
});

test("Trim to stack depth throws exception on wrong context state", () => {
  var ctx = TestUtil.getEmptyTestContext();

  ctx.init();
  ctx.ContextState = ContextState.Executing;
  const stackDepth = ctx.getWorldStateChangeDepth();

  assert.throws(() =>
    ctx.trimToStackDepth(stackDepth)
  );
});

test.run();
