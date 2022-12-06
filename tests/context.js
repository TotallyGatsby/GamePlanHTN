import { test } from "uvu";
import * as assert from "uvu/assert";
import Context from "../src/context.js";
import ContextState from "../src/contextState.js";
import EffectType from "../src/effectType.js";

test("Context defaults to Executing", () => {
  var ctx = new Context();

  assert.is(ctx.ContextState, ContextState.Executing);
});

test("Init Initializes Collections", () => {
  var ctx = new Context();

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
  var ctx = new Context();

  ctx.init();
  ctx.setState("HasB", 1, true, EffectType.Permanent);

  assert.equal(false, ctx.hasState("HasA"));
  assert.equal(true, ctx.hasState("HasB"));
});

test("setState Planning Context expected behavior", () => {
  var ctx = new Context();

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


test.run();
