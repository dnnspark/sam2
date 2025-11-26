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
uniform vec2 uSize;
uniform int uNumMasks;
uniform bool uFillColor;
uniform bool uLight;
uniform bool uTransparency;
const int MAX_MASKS = 12;
uniform sampler2D uMaskTexture[MAX_MASKS];
uniform vec4 uMaskColor[MAX_MASKS];
uniform vec4 uBBox[MAX_MASKS];

out vec4 fragColor;

void main() {
  vec4 color = texture(uSampler, vTexCoord);
  float aspectRatio = uSize.y / uSize.x;
  float radiusThreshold = 0.8f;
  float tickness = 0.085f;

  vec4 scopedColor = vec4(0.0f);

  bool scoped = false;
  vec4 whiteVariation = uTransparency ? vec4(0.0,0.0,0.0,1.0) : vec4(1.0);
  bool overlap = false;
  int cappedMaskCount = min(uNumMasks, MAX_MASKS);

  for (int i = 0; i < MAX_MASKS; ++i) {
    if (i >= cappedMaskCount) {
      break;
    }

    vec4 mask = texture(uMaskTexture[i], vec2(vTexCoord.y, vTexCoord.x));
    overlap = overlap || mask.r > 0.0f;

    vec2 center = (uBBox[i].xy + uBBox[i].zw) * 0.5f;
    float radiusX = abs(uBBox[i].y - uBBox[i].w) * 0.5f;
    float radiusY = radiusX / aspectRatio;

    float distX = (vTexCoord.x - center.x) / radiusX;
    float distY = (vTexCoord.y - center.y) / radiusY;
    float dist = sqrt(pow(distX, 2.0f) + pow(distY, 2.0f));

    vec4 maskColor = uMaskColor[i] / 255.0;

    if(uFillColor) {
      if(dist >= radiusThreshold - tickness && dist <= radiusThreshold) {
        scoped = true;
        scopedColor = uLight ? whiteVariation : maskColor;
      }
    } else if(dist <= radiusThreshold) {
      scoped = true;
      scopedColor = uLight ? whiteVariation : maskColor;
    }
  }

  if(scoped) {
    fragColor = overlap ? color : scopedColor;
    fragColor.a = uTransparency ? fragColor.a : 1.0;
  } else {
    fragColor = overlap ? color : vec4(0.0f, 0.0f, 0.0f, 0.0f);
  }
}
