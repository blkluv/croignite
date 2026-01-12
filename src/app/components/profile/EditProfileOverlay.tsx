"use client";

import { useEffect, useRef, useState } from "react";
import { AiOutlineClose, AiOutlineCloudUpload, AiOutlineDelete } from "react-icons/ai";
import { BiLoaderCircle } from "react-icons/bi";
import Image from "next/image";
import TextInput from "../TextInput";
import { useUser } from "@/app/context/user";
import { useProfileStore } from "@/app/stores/profile";
import { useGeneralStore } from "@/app/stores/general";
import updateProfile from "@/app/hooks/useUpdateProfile";
import createBucketUrl from "@/app/hooks/useCreateBucketUrl";
import type { ShowErrorObject } from "@/app/types";

export default function EditProfileOverlay() {
  const { currentProfile, setCurrentProfile } = useProfileStore();
  const { setIsEditProfileOpen } = useGeneralStore();
  const contextUser = useUser();

  const [userName, setUserName] = useState("");
  const [userHandle, setUserHandle] = useState("");
  const [userBio, setUserBio] = useState("");
  const [userImage, setUserImage] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<ShowErrorObject | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setUserName(currentProfile?.name || "");
    setUserHandle(currentProfile?.username || "");
    setUserBio(currentProfile?.bio || "");
    setUserImage(currentProfile?.image || "");
  }, [
    currentProfile?.bio,
    currentProfile?.image,
    currentProfile?.name,
    currentProfile?.username,
  ]);

  const showError = (type: string) => {
    if (error && error.type === type) {
      return error.message;
    }
    return "";
  };

  const validate = () => {
    setError(null);
    if (!userName.trim()) {
      setError({ type: "userName", message: "A name is required." });
      return true;
    }
    const normalizedHandle = userHandle.trim().toLowerCase();
    if (!normalizedHandle) {
      setError({ type: "userHandle", message: "A username is required." });
      return true;
    }
    if (!/^[a-z0-9._]{3,20}$/.test(normalizedHandle)) {
      setError({
        type: "userHandle",
        message: "Use 3-20 characters: letters, numbers, dots, underscores.",
      });
      return true;
    }
    return false;
  };

  const handleSave = async () => {
    if (validate()) return;
    if (!contextUser?.user?.id) return;

    try {
      setIsUpdating(true);
      await updateProfile(
        contextUser.user.id,
        userName.trim(),
        userHandle.trim().toLowerCase(),
        userBio.trim(),
        userImage.trim() || undefined,
      );
      await contextUser.refreshProfile();
      setCurrentProfile(contextUser.user.id);
      setIsEditProfileOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError({ type: "userImage", message: "Please upload an image file." });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError({ type: "userImage", message: "Max image size is 5MB." });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        setUserImage(result);
        setError(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setUserImage("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div
      id="EditProfileOverlay"
      className="fixed left-0 top-0 z-50 flex h-full w-full justify-center bg-black/60 px-4 py-10"
    >
      <div className="relative w-full max-w-[720px] rounded-2xl bg-white shadow-xl dark:bg-black">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-white/10">
          <div>
            <h1 className="text-[22px] font-semibold text-gray-900 dark:text-white">
              Edit profile
            </h1>
            <p className="text-sm text-gray-500 dark:text-white/60">
              Update your identity and creator info.
            </p>
          </div>
          <button
            disabled={isUpdating}
            onClick={() => setIsEditProfileOpen(false)}
            aria-label="Close edit profile"
            className="rounded-full p-1 hover:bg-gray-100 dark:hover:bg-white/10"
          >
            <AiOutlineClose size="25" />
          </button>
        </div>

        <div className="max-h-[calc(90vh-180px)] overflow-y-auto px-6 py-6">
          <div className="space-y-6">
            <div className="rounded-xl border border-gray-200 p-4 dark:border-white/10">
	              <h3 className="mb-4 text-[15px] font-semibold text-gray-900 dark:text-white">
	                Profile photo
	              </h3>
	              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
	                <Image
	                  className="h-[96px] w-[96px] rounded-full object-cover"
	                  src={createBucketUrl(userImage)}
	                  alt="Profile preview"
	                  width={96}
	                  height={96}
	                  sizes="96px"
	                  unoptimized
	                  loader={({ src }) => src}
	                />
	                <div className="flex flex-1 flex-col gap-2">
	                  <div className="flex flex-wrap items-center gap-2">
	                    <input
	                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:text-white dark:hover:bg-white/10"
                    >
                      <AiOutlineCloudUpload size={18} />
                      Upload photo
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="inline-flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-50 dark:border-white/10 dark:text-white/70 dark:hover:bg-white/10"
                    >
                      <AiOutlineDelete size={18} />
                      Remove
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-white/60">
                    JPG, PNG, or WebP. Max size 5MB.
                  </p>
                  <div className="pt-2">
                    <TextInput
                      string={userImage}
                      placeholder="Or paste an image URL"
                      onUpdate={setUserImage}
                      inputType="text"
                      error={showError("userImage")}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 p-4 dark:border-white/10">
              <h3 className="mb-3 text-[15px] font-semibold text-gray-900 dark:text-white">
                Name
              </h3>
              <TextInput
                string={userName}
                placeholder="Creator name"
                onUpdate={setUserName}
                inputType="text"
                error={showError("userName")}
              />
            </div>

            <div className="rounded-xl border border-gray-200 p-4 dark:border-white/10">
              <h3 className="mb-1 text-[15px] font-semibold text-gray-900 dark:text-white">
                Username
              </h3>
              <p className="mb-3 text-xs text-gray-500 dark:text-white/60">
                This becomes your @handle. Letters, numbers, dots, and underscores only.
              </p>
              <TextInput
                string={userHandle}
                placeholder="username"
                onUpdate={setUserHandle}
                inputType="text"
                error={showError("userHandle")}
              />
            </div>

            <div className="rounded-xl border border-gray-200 p-4 dark:border-white/10">
              <h3 className="mb-3 text-[15px] font-semibold text-gray-900 dark:text-white">
                Bio
              </h3>
              <textarea
                cols={30}
                rows={4}
                onChange={(event) => setUserBio(event.target.value)}
                value={userBio}
                maxLength={120}
                className="
                  resize-none
                  w-full
                  rounded-md
                  border
                  border-gray-300
                  bg-[#F1F1F2]
                  px-3
                  py-2.5
                  text-gray-800
                  focus:outline-none
                  dark:border-white/10
                  dark:bg-white/10
                  dark:text-white
                "
              />
              <p className="mt-1 text-[11px] text-gray-500 dark:text-white/60">
                {userBio.length}/120
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4 dark:border-white/10">
          <button
            disabled={isUpdating}
            onClick={() => setIsEditProfileOpen(false)}
            className="flex items-center rounded-sm border border-gray-200 px-3 py-[6px] text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:text-white dark:hover:bg-white/10"
          >
            Cancel
          </button>

          <button
            disabled={isUpdating}
            onClick={() => void handleSave()}
            className="flex items-center rounded-md border border-[color:var(--brand-accent)] bg-[color:var(--brand-accent)] px-3 py-[6px] text-[color:var(--brand-ink)] hover:bg-[color:var(--brand-accent-strong)]"
          >
            {isUpdating ? (
              <BiLoaderCircle
                color="var(--brand-ink)"
                className="my-1 mx-2.5 animate-spin"
              />
            ) : (
              <span className="px-3 text-sm font-semibold">Save changes</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
