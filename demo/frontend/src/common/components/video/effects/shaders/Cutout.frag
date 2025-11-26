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
uniform float uContrast;
uniform int uNumMasks;
const int MAX_MASKS = 12;
uniform sampler2D uMaskTexture[MAX_MASKS];

out vec4 fragColor;

vec3 applySepia(vec4 color) {
  float gray = dot(color.rgb, vec3(0.3, 0.59, 0.11));
  vec3 sepia = vec3(gray) * vec3(1.2, 1.0, 0.8);
  sepia.r = min(sepia.r, 1.0);
  sepia.g = min(sepia.g, 1.0);
  sepia.b = min(sepia.b, 1.0);

  return sepia;
}

void main() {
  vec4 color = texture(uSampler, vTexCoord);

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
    if (uContrast == 0.0) {
      color = vec4(applySepia(color), color.a);
    } else {
      color.rgb = ((color.rgb - 0.5) * max(uContrast, 0.0)) + 0.5;   
    }
    fragColor = color;
  } else {
    fragColor = vec4(0.0f);
  }
}