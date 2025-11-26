#version 300 es
// Copyright (c) Meta Platforms, Inc. and affiliates.
// 
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
// 
//     http://www.apache.org/licenses/LICENSE-2.0
// 
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

precision mediump float;

in vec2 vTexCoord;

uniform sampler2D uSampler;
uniform mediump vec2 uSize;
uniform lowp float uBlockSize;
uniform int uNumMasks;
const int MAX_MASKS = 12;
uniform sampler2D uMaskTexture[MAX_MASKS];

out vec4 fragColor;

void main() {
  vec4 color = texture(uSampler, vTexCoord);
  vec2 uv = vTexCoord.xy;
  float dx = uBlockSize / uSize.x;
  float dy = uBlockSize / uSize.y;

  vec2 sampleCoord = (vec2(dx * floor((uv.x / dx)), dy * floor((uv.y / dy))) +
  vec2(dx * ceil((uv.x / dx)), dy * ceil((uv.y / dy)))) / 2.0f;
  vec4 frameColor = texture(uSampler, sampleCoord);
  color = frameColor;

  bool overlap = false;
  int cappedMaskCount = min(uNumMasks, MAX_MASKS);
  for (int i = 0; i < MAX_MASKS; ++i) {
    if (i >= cappedMaskCount) {
      break;
    }

    vec4 maskValue = texture(uMaskTexture[i], vec2(vTexCoord.y, vTexCoord.x));
    overlap = overlap || maskValue.r > 0.0f;
  }
  if(overlap) {
    fragColor = color;
  } else {
    fragColor = vec4(0.0f);
  }
}