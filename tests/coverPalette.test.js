import test from 'node:test';
import assert from 'node:assert/strict';
import {coverForKey, coverPalette} from '../shared/coverPalette.js';
test('consecutive memory spaces get varied colours that remain stable',()=>{
  const selected=Array.from({length:coverPalette.length},(_,i)=>coverForKey(i+1));
  assert.equal(new Set(selected.map(c=>c.name)).size,coverPalette.length);
  for(let id=1;id<50;id++) {
    assert.equal(coverForKey(id),coverForKey(id));
    assert.notEqual(coverForKey(id).name,coverForKey(id+1).name);
  }
});
test('string keys are deterministic and every cover has a distinct dark shade',()=>{
  assert.deepEqual(coverForKey('Campus memories'),coverForKey('Campus memories'));
  for(const colour of coverPalette){assert.match(colour.light,/^#[0-9a-f]{6}$/);assert.match(colour.dark,/^#[0-9a-f]{6}$/);assert.notEqual(colour.light,colour.dark);}
});
