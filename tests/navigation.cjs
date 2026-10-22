/* Meaningful regression: every accessible tile is reachable without crossing furniture. */
const assert = require('node:assert/strict');
const { pathfind, walkable, width, height, nearest } = require('../www/world.js');
let checked = 0;
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    if (!walkable(x,y)) continue;
    const start={x:8,y:7}, route=pathfind(start,{x,y});
    let previous=start;
    for(const step of route){
      assert(walkable(step.x,step.y),'Path crosses blocked furniture');
      const dx=Math.abs(step.x-previous.x),dy=Math.abs(step.y-previous.y);
      assert(dx<=1 && dy<=1 && dx+dy>0,'Path skips a tile');
      if(dx&&dy){assert(walkable(step.x,previous.y));assert(walkable(previous.x,step.y));}
      previous=step;
    }
    assert.deepEqual(previous,{x,y},'Accessible destination is unreachable');
    checked++;
  }
}
for(const input of [{x:3,y:3},{x:-100,y:100},{x:200,y:-30}]){
  const p=nearest(input.x,input.y);assert(walkable(p.x,p.y));
}
console.log(`Navigation passed: ${checked} accessible destinations, no obstacle crossings or corner cutting.`);
