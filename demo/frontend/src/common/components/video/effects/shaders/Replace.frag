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

precision lowp float;

in vec2 vTexCoord;
uniform vec2 uSize;
uniform int uNumMasks;
uniform sampler2D uEmojiTexture;
uniform bool uFill; // use all emoji texture
const int MAX_MASKS = 12;
uniform sampler2D uMaskTexture[MAX_MASKS];
uniform vec4 uBBox[MAX_MASKS];

out vec4 fragColor;

vec2 calculateAdjustedTexCoord(vec2 vTexCoord, vec4 bbox, float aspectRatio, out float distanceFromCenter) {
  vec2 center = (bbox.xy + bbox.zw) * 0.5f;
  float radiusX = abs(bbox.z - bbox.x);
  float radiusY = radiusX / aspectRatio;
  float scale = 1.25f;
  radiusX *= scale;
  radiusY *= scale;
  vec2 adjustedTexCoord = (vTexCoord - center) / vec2(radiusX, radiusY) + vec2(0.5f);
  distanceFromCenter = length((vTexCoord - center) / vec2(radiusX * 0.5f, radiusY * 0.5f));
  return adjustedTexCoord;
}

void main() {
  vec4 finalColor = vec4(0.0f);

  float aspectRatio = uSize.y / uSize.x;
  float totalMaskValue = 0.0f;
  vec4 bgFill = vec4(1.0f, 0.0f, 0.0f, 1.0f);

  vec4 emojiColor;

  int cappedMaskCount = min(uNumMasks, MAX_MASKS);
  for (int i = 0; i < MAX_MASKS; ++i) {
    if (i >= cappedMaskCount) {
      break;
    }

    float maskValue = texture(uMaskTexture[i], vec2(vTexCoord.y, vTexCoord.x)).r;
    float distanceFromCenter;
    vec2 adjustedTexCoord =
        calculateAdjustedTexCoord(vTexCoord, uBBox[i], aspectRatio, distanceFromCenter);

    if(maskValue > 0.0f) {
      emojiColor = texture(uEmojiTexture, adjustedTexCoord);
      if(distanceFromCenter > 0.85f && !uFill) {
        emojiColor = bgFill;
      }
    }
    if(uFill && emojiColor.a == 0.0f) {
      emojiColor = texture(uEmojiTexture, adjustedTexCoord);
    }

    totalMaskValue += maskValue;
  }

  if(totalMaskValue > 0.0f) {
    finalColor = emojiColor;
  } else {
    finalColor = uFill ? emojiColor : vec4(0.0f);
  }
  fragColor = finalColor;
}
