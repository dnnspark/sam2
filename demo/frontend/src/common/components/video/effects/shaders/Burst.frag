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

precision highp float;

in vec2 vTexCoord;

uniform sampler2D uSampler;
uniform vec2 uSize; // resolution
uniform int uNumMasks;
uniform bool uLineColor;
uniform bool uInterleave;
const int MAX_MASKS = 12;
uniform sampler2D uMaskTexture[MAX_MASKS];
uniform vec4 uMaskColor[MAX_MASKS];
uniform vec4 uBBox[MAX_MASKS];

out vec4 fragColor;

void main() {
  float PI = radians(180.0f);
  float lines = uInterleave ? 12.0f : 80.0f;
  vec4 color = texture(uSampler, vTexCoord);
  vec4 scopedColor = vec4(0.0f);

  vec2 fragCoord = vTexCoord * uSize; // transform to pixel space
  bool scoped = false;
  vec4 transparent = vec4(0.0);
  float p = PI / lines;
  bool overlap = false;
  int cappedMaskCount = min(uNumMasks, MAX_MASKS);

  for (int i = 0; i < MAX_MASKS; ++i) {
    if (i >= cappedMaskCount) {
      break;
    }

    vec4 mask = texture(uMaskTexture[i], vec2(vTexCoord.y, vTexCoord.x));
    overlap = overlap || mask.r > 0.0f;

    vec2 center = (uBBox[i].xy + uBBox[i].zw) * 0.5f * uSize;
    vec2 fragCoordT = (fragCoord - center) / uSize.y;
    float a = mod(atan(fragCoordT.y, fragCoordT.x) + p, p + p) - p; // angle of fragment

    float pattern = sin(a * lines);
    float line = smoothstep(2.8 / uSize.y, 0.0, length(fragCoordT) * abs(sin(a)));

    vec4 colorToBlend = uLineColor ? vec4((uMaskColor[i] / 255.0).rgb, 0.8f) : vec4(1.0f);
    bool visible = uBBox[i] != vec4(0.0f);

    if (uInterleave && visible) {
      vec4 tempColor = mix(transparent, colorToBlend, step(0.0, pattern));
      if (scopedColor == vec4(0.0)) {
        scopedColor += tempColor;
      }
      scoped = true;
    } else if (!uInterleave && visible) {
      vec4 tempColor = uLineColor ? vec4((uMaskColor[i] / 255.0).rgb * line, line) : vec4(line);
      scopedColor += tempColor;
      scoped = true;
    }
  }
  if(scoped) {
    fragColor = overlap ? color : scopedColor;
  } else {
    fragColor = overlap ? color : vec4(0.0f, 0.0f, 0.0f, 0.0f);
  }
}
