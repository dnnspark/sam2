/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import PointsToggle from '@/common/components/annotations/PointsToggle';
import useVideo from '@/common/components/video/editor/useVideo';
import {BaseTracklet} from '@/common/tracker/Tracker';
import useReportError from '@/common/error/useReportError';
import {
  activeTrackletObjectIdAtom,
  isPlayingAtom,
  isStreamingAtom,
} from '@/demo/atoms';
import {
  AddFilled,
  Select_02,
  SubtractFilled,
  TrashCan,
} from '@carbon/icons-react';
import {useAtom, useAtomValue} from 'jotai';
import {type ChangeEvent, type MouseEvent, useState} from 'react';
import type {ButtonProps} from 'react-daisyui';
import {Button} from 'react-daisyui';

type Props = {
  objectId: number;
  active: boolean;
  tracklet: BaseTracklet;
};

function CustomButton({className, ...props}: ButtonProps) {
  return (
    <Button
      size="sm"
      color="ghost"
      className={`font-medium border-none hover:bg-black  px-2 h-10 ${className}`}
      {...props}>
      {props.children}
    </Button>
  );
}

export default function ObjectActions({objectId, active, tracklet}: Props) {
  const [isRemovingObject, setIsRemovingObject] = useState<boolean>(false);
  const [activeTrackId, setActiveTrackletId] = useAtom(
    activeTrackletObjectIdAtom,
  );
  const isStreaming = useAtomValue(isStreamingAtom);
  const isPlaying = useAtom(isPlayingAtom);

  const video = useVideo();
  const reportError = useReportError();

  async function handleRemoveObject(event: MouseEvent<HTMLButtonElement>) {
    try {
      event.stopPropagation();
      setIsRemovingObject(true);
      if (isStreaming) {
        await video?.abortStreamMasks();
      }
      if (isPlaying) {
        video?.pause();
      }
      await video?.deleteTracklet(objectId);
    } catch (error) {
      reportError(error);
    } finally {
      setIsRemovingObject(false);
      if (activeTrackId === objectId) {
        setActiveTrackletId(null);
      }
    }
  }

  function handleToggleDynamic(event: ChangeEvent<HTMLInputElement>) {
    event.stopPropagation();

    const isDynamic = event.target.checked;
    try {
      video?.setTrackletDynamic(objectId, isDynamic);
    } catch (error) {
      reportError(error);
    }
  }

  return (
    <div>
      {active && (
        <div className="text-sm mt-1 leading-snug text-gray-400 hidden md:block ml-2 md:mb-4">
          Select <AddFilled size={14} className="inline" /> to add areas to the
          object and <SubtractFilled size={14} className="inline" /> to remove
          areas from the object in the video. Click on an existing point to
          delete it. If the object moves in the scene, check the
          <span className="ml-1 px-2 py-0.5 rounded-full bg-sky-900/60 text-sky-200 border border-sky-800 font-semibold">
            Dynamic
          </span>{' '}
          box.
        </div>
      )}

      <div className="flex justify-between items-center gap-3 md:mt-2 mt-0">
        {active ? (
          <>
            <PointsToggle />
            <label className="flex items-center gap-2 text-sm text-gray-200">
              <input
                type="checkbox"
                className="checkbox checkbox-sm border-gray-400 bg-gray-700 checked:bg-gray-500"
                checked={tracklet.isDynamic}
                disabled={isRemovingObject}
                onChange={handleToggleDynamic}
              />
              <span className="px-2 py-0.5 rounded-full bg-sky-900/60 text-sky-200 border border-sky-800 font-semibold">
                Dynamic
              </span>
            </label>
          </>
        ) : (
          <>
            <CustomButton startIcon={<Select_02 size={24} />}>
              Edit selection
            </CustomButton>
            <CustomButton
              loading={isRemovingObject}
              onClick={handleRemoveObject}
              startIcon={!isRemovingObject && <TrashCan size={24} />}>
              <span className="hidden md:inline">Clear</span>
            </CustomButton>
          </>
        )}
      </div>
    </div>
  );
}
