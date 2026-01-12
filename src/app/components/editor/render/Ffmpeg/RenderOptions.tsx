import { useAppSelector } from "@/app/store";
import { useAppDispatch } from "@/app/store";
import {
  setResolution,
  setQuality,
  setSpeed,
  setRenderEngine,
} from "@/app/store/slices/projectSlice";
import type { RenderEngine } from "@/app/types";
export default function RenderOptions() {
  const { exportSettings } = useAppSelector((state) => state.projectState);
  const dispatch = useAppDispatch();

  return (
    <div className="relative">
      <div className="flex items-center justify-center z-50">
        <div className="p-2 rounded-lg w-11/12">
          <div className="space-y-2">
            <div className="grid grid-cols-1 gap-4">
              {/* Render Engine Setting */}
              <div>
                <label className="text-l font-bold mb-2 text-white">
                  Render Engine
                </label>
                <select
                  value={exportSettings.renderEngine ?? "ffmpeg"}
                  onChange={(e) =>
                    dispatch(setRenderEngine(e.target.value as RenderEngine))
                  }
                  className="w-full p-2 bg-darkSurfacePrimary border border-white border-opacity-10 shadow-md text-white rounded focus:outline-none focus:ring-2 focus:ring-white-500 focus:border-white-500"
                >
                  <option value="ffmpeg">FFmpeg (WASM, CPU)</option>
                  <option value="gpu">GPU / WebCodecs (Diffusion Core)</option>
                </select>
                <p className="text-xs text-gray-400 mt-1">
                  GPU rendering uses hardware acceleration and may add a
                  watermark unless a Diffusion Core license key is provided.
                </p>
              </div>
              <div>
                {/* Resolution Setting */}
                <label className="text-l font-bold mb-2 text-white">
                  Resolution
                </label>
                <select
                  value={exportSettings.resolution}
                  onChange={(e) => dispatch(setResolution(e.target.value))}
                  className="w-full p-2 bg-darkSurfacePrimary border border-white border-opacity-10 shadow-md text-white rounded focus:outline-none focus:ring-2 focus:ring-white-500 focus:border-white-500"
                >
                  <option value="480p">480p</option>
                  <option value="720p">720p</option>
                  <option value="1080p">1080p (Full HD)</option>
                  {/* <option value="2K">2K</option> */}
                  {/* <option value="4K">4K (Ultra HD)</option> */}
                </select>
              </div>

              {/* Quality Setting */}
              <div>
                <label className="text-l font-bold mb-2 text-white">
                  Quality
                </label>
                <select
                  value={exportSettings.quality}
                  onChange={(e) => dispatch(setQuality(e.target.value))}
                  className="w-full p-2 bg-darkSurfacePrimary border border-white border-opacity-10 shadow-md text-white rounded focus:outline-none focus:ring-2 focus:ring-white-500 focus:border-white-500"
                >
                  <option value="low">Low (Fastest)</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="ultra">Ultra (Best Quality)</option>
                </select>
              </div>

              {/* Processing Speed Setting */}
              <div>
                <label className="text-l font-bold mb-2 text-white">
                  Processing Speed
                </label>
                <select
                  value={exportSettings.speed}
                  onChange={(e) => dispatch(setSpeed(e.target.value))}
                  className="w-full p-2 bg-darkSurfacePrimary border border-white border-opacity-10 shadow-md text-white rounded focus:outline-none focus:ring-2 focus:ring-white-500 focus:border-white-500"
                >
                  <option value="fastest">Fastest</option>
                  <option value="fast">Fast</option>
                  <option value="balanced">Balanced</option>
                  <option value="slow">Slow</option>
                  <option value="slowest">Slowest</option>
                </select>
              </div>
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-600">
            <p>
              Current settings: {exportSettings.resolution} at{" "}
              {exportSettings.quality} quality ({exportSettings.speed}{" "}
              processing)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
