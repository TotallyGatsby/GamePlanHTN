// Portions of this file are derived from FluidHTN (MIT License)
// Copyright (c) 2019 Pål Trefall
// https://github.com/ptrefall/fluid-hierarchical-task-network

import { test } from "uvu";
import * as assert from "uvu/assert";

import Effect from "../src/effect.js";
import EffectType from "../src/effectType.js";
import * as TestUtil from "./utils.js";

test("Create simple effect", () => {
  const effectFunction = (context) => {
    context.Done = true;
  };
  const testEffect = new Effect(effectFunction);

  assert.ok(testEffect);
  assert.equal(testEffect.Name, "Unnamed Effect");
  assert.not(testEffect.Type);
  assert.equal(testEffect._effectFunction, effectFunction);
});

test("Create simple effect with props", () => {
  const effectFunction = (context) => {
    context.Done = true;
  };
  const type = EffectType.PlanAndExecute;
  const name = "Test Effect";
  const testEffect = new Effect({
    action: effectFunction,
    type,
    name,
  });

  assert.ok(testEffect);
  assert.equal(testEffect.Name, name);
  assert.equal(testEffect.Type, type);
  assert.equal(testEffect._effectFunction, effectFunction);
});

test("Simple effect can mutate context", () => {
  const testContext = TestUtil.getEmptyTestContext();
  const effectFunction = (context) => {
    context.Done = true;
  };
  const testEffect = new Effect(effectFunction);

  testEffect.apply(testContext);

  assert.ok(testEffect);
  assert.equal(testEffect.Name, "Unnamed Effect");
  assert.not(testEffect.Type);
  assert.equal(testEffect._effectFunction, effectFunction);
  assert.equal(testContext.Done, true);
});

test("Props Effect can mutate context", () => {
  const testContext = TestUtil.getEmptyTestContext();
  const effectFunction = (context) => {
    context.Done = true;
  };
  const type = EffectType.PlanAndExecute;
  const name = "Test Effect";
  const testEffect = new Effect({
    action: effectFunction,
    type,
    name,
  });

  testEffect.apply(testContext);


  assert.ok(testEffect);
  assert.equal(testEffect.Name, name);
  assert.equal(testEffect.Type, type);
  assert.equal(testEffect._effectFunction, effectFunction);
  assert.equal(testContext.Done, true);
});

test("Effect with incorrect type for action doesn't crash", () => {
  const testContext = TestUtil.getEmptyTestContext();
  const effectFunction = "test";

  const type = EffectType.PlanAndExecute;
  const name = "Test Effect";
  const testEffect = new Effect({
    action: effectFunction,
    type,
    name,
  });

  testEffect.apply(testContext);

  assert.ok(testEffect);
  assert.equal(testEffect.Name, name);
  assert.equal(testEffect.Type, type);
  assert.equal(testEffect._effectFunction, effectFunction);
  assert.not(testContext.Done);
});
