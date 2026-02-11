"use client";

import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";


// TYPES

type PlayerState = "playing" | "paused" | "loading";

// DATA

const musicTrack = [
  {
    title: "Awesome Song Title",
    artist: "Amazing Artist",
    src: "/music/background-music.mp3",
  },
  {
    title: "Chill-out Acid Squeeze Mix",
    artist: "SoundHelix",
    src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3",
  },
  {
    title: "Beat Heat",
    artist: "SoundHelix",
    src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3",
  },
  {
    title: "Bass Bounce",
    artist: "SoundHelix",
    src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3",
  },
  {
    title: "Light Space",
    artist: "SoundHelix",
    src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3",
  },
  {
    title: "Club Star",
    artist: "SoundHelix",
    src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-15.mp3",
  },
  {
    title: "Violence Nights",
    artist: "SoundHelix",
    src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-17.mp3",
  },
];

// ANIMATION VARIANTS

/**
 * Container animation variants
 * Changes background color and box shadow based on player state
 */
const containerVariants = {
  playing: {
    backgroundColor: "var(--color-card)",
    boxShadow:
      "0 25px 60px color-mix(in srgb, var(--color-primary-300) 45%, transparent)",
  },
  paused: {
    backgroundColor: "var(--color-card)",
    boxShadow:
      "0 20px 50px color-mix(in srgb, var(--color-black) 55%, transparent)",
  },
  loading: {
    backgroundColor: "var(--color-card)",
    boxShadow:
      "0 16px 40px color-mix(in srgb, var(--color-black) 50%, transparent)",
  },
};

/**
 * Equalizer bar animation variants
 * Creates animated bars that move up and down when playing
 */
const equalizerVariants = {
  playing: (index: number) => ({
    height: ["20%", "100%"],
    opacity: 1,
    transition: {
      duration: 0.5,
      repeat: Infinity,
      repeatType: "mirror" as const,
      ease: "easeInOut",
      delay: index * 0.1, // Stagger animation for each bar
    },
  }),
  paused: {
    height: "20%",
    opacity: 1,
    transition: { duration: 0.3, ease: "easeOut" },
  },
  loading: {
    height: "50%",
    opacity: 0.5,
    transition: { duration: 0.3, ease: "easeOut" },
  },
};

// UTILITY FUNCTIONS

const getRandomIndex = (current: number, total: number) => {
  if (total <= 1) return current;
  let next = current;
  while (next === current) {
    next = Math.floor(Math.random() * total);
  }
  return next;
};


const formatTime = (value: number) => {
  if (!Number.isFinite(value)) return "0:00";
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

// MAIN COMPONENT

export function MusicPlayer() {
  // REFS
  const audioRef = useRef<HTMLAudioElement | null>(null); // Reference to HTML audio element
  const toggleTimeoutRef = useRef<number | null>(null); // Timeout for play/pause button animation
  const trackHistoryRef = useRef<number[]>([]); // Track history for shuffle mode
  const playerStateRef = useRef<PlayerState>("paused"); // Ref to current player state for async operations

  // STATE
  const [playerState, setPlayerState] = useState<PlayerState>("paused"); // Current player state
  const [trackIndex, setTrackIndex] = useState(0); // Current track index
  const [currentTime, setCurrentTime] = useState(0); // Current playback time in seconds
  const [duration, setDuration] = useState(0); // Total track duration in seconds
  const [volume, setVolume] = useState(0.65); // Volume level (0-1)
  const [isShuffle, setIsShuffle] = useState(false); // Shuffle mode toggle
  const [isRepeat, setIsRepeat] = useState(false); // Repeat mode toggle
  const [isVolumeHover, setIsVolumeHover] = useState(false); // Volume slider hover state

  // DERIVED STATE
  const currentTrack = musicTrack[trackIndex] ?? musicTrack[0]; // Current track object
  const isPlaying = playerState === "playing"; // Is currently playing
  const isLoading = playerState === "loading"; // Is in loading state

  /**
   * Calculate progress bar scale (0-1)
   */
  const progressScale = useMemo(() => {
    if (!duration) return 0;
    return Math.min(currentTime / duration, 1);
  }, [currentTime, duration]);

  /**
   * Calculate progress percentage (0-100)
   */
  const progressPercent = useMemo(() => {
    if (!duration) return 0;
    return Math.min((currentTime / duration) * 100, 100);
  }, [currentTime, duration]);

  /**
   * Progress bar color based on player state
   */
  const progressColor =
    playerState === "playing"
      ? "var(--color-primary-200)"
      : playerState === "loading"
        ? "var(--color-neutral-500)"
        : "var(--color-neutral-600)";

  /**
   * Play button background color based on player state
   */
  const playButtonColor =
    playerState === "loading"
      ? "var(--color-neutral-600)"
      : "var(--color-primary-300)";

  
  useEffect(() => {
    playerStateRef.current = playerState;
  }, [playerState]);

  /**
   * Handle track navigation - next track
   */
  const handleNextTrack = useCallback(() => {
    setTrackIndex((prevIndex) => {
      const nextIndex = isShuffle
        ? getRandomIndex(prevIndex, musicTrack.length) // Random track if shuffle is on
        : (prevIndex + 1) % musicTrack.length; // Next track in sequence
      if (isShuffle) {
        trackHistoryRef.current.push(prevIndex); // Save to history for "previous" functionality
      }
      return nextIndex;
    });
  }, [isShuffle]);

  
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Update current time as track plays
    const handleTime = () => setCurrentTime(audio.currentTime);
    
    // Set duration when metadata loads
    const handleMetadata = () => setDuration(audio.duration || 0);
    
    // Skip to next track on error
    const handleError = () => {
      handleNextTrack();
    };
    
    // Handle track end - go to next track if not on repeat
    const handleEnded = () => {
      if (isRepeat) return;
      audio.currentTime = 0;
      setCurrentTime(0);
      handleNextTrack();
    };

    audio.addEventListener("timeupdate", handleTime);
    audio.addEventListener("loadedmetadata", handleMetadata);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);

    return () => {
      audio.removeEventListener("timeupdate", handleTime);
      audio.removeEventListener("loadedmetadata", handleMetadata);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
    };
  }, [isRepeat, handleNextTrack]);

  /**
   * Update audio element loop property based on repeat state
   */
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.loop = isRepeat;
  }, [isRepeat]);

  /**
   * Update audio element volume based on volume state
   */
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume;
  }, [volume]);

  /**
   * Control audio playback based on player state
   */
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playerState === "playing") {
      audio.play().catch(() => {});
    }
    if (playerState === "paused") {
      audio.pause();
    }
  }, [playerState]);

  /**
   * Load new track when track index changes
   */
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.load();
    audio.currentTime = 0;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentTime(0);
    setDuration(0);
    // Resume playing if was playing before track change
    if (playerStateRef.current === "playing") {
      audio.play().catch(() => {});
    }
  }, [trackIndex]);

  /**
   * Cleanup timeout on unmount
   */
  useEffect(() => {
    return () => {
      if (toggleTimeoutRef.current) {
        window.clearTimeout(toggleTimeoutRef.current);
      }
    };
  }, []);

  // EVENT HANDLERS
  /**
   * Toggle play/pause with loading animation
   */
  const handlePlayToggle = () => {
    if (isLoading) return;
    const nextState: PlayerState = isPlaying ? "paused" : "playing";
    setPlayerState("loading"); // Show loading state
    toggleTimeoutRef.current = window.setTimeout(() => {
      setPlayerState(nextState); // Apply actual state after delay
    }, 500);
  };

  /**
   * Navigate to previous track
   * Uses history if shuffle is enabled
   */
  const handlePrevTrack = useCallback(() => {
    if (isShuffle && trackHistoryRef.current.length > 0) {
      // Go back in shuffle history
      const previousIndex = trackHistoryRef.current.pop();
      if (previousIndex !== undefined) {
        setTrackIndex(previousIndex);
        return;
      }
    }
    // Go to previous track in sequence
    setTrackIndex(
      (prevIndex) => (prevIndex - 1 + musicTrack.length) % musicTrack.length,
    );
  }, [isShuffle]);

  /**
   * Toggle shuffle mode
   * Clears history when enabling shuffle
   */
  const handleShuffleToggle = () => {
    setIsShuffle((prev) => {
      const next = !prev;
      if (next) {
        trackHistoryRef.current = []; // Clear history when enabling shuffle
      }
      return next;
    });
  };

  /**
   * Seek to specific position in track
   * @param value - Percentage (0-100)
   */
  const handleSeek = (value: number) => {
    if (!duration) return;
    const audio = audioRef.current;
    if (!audio) return;
    const nextTime = Math.min((value / 100) * duration, duration);
    audio.currentTime = nextTime;
    setCurrentTime(nextTime);
  };

  // RENDER
  return (
    <div className="w-full max-w-[500px]">
      {/* Container with animated shadow based on player state */}
      <motion.div
        className="relative overflow-hidden rounded-[28px] border border-[var(--color-neutral-800)] p-[28px]"
        variants={containerVariants}
        animate={playerState}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        {/* HEADER - Album Art & Track Info */}
        <div className="flex items-start gap-[20px]">
         
         {/* Album Art with rotation animation */}
          <motion.div
            className="flex h-[88px] w-[88px] items-center justify-center rounded-[16px] bg-[linear-gradient(135deg,var(--color-primary-200),var(--color-pink-600))] shadow-[0_12px_24px_color-mix(in_srgb,var(--color-black)_40%,transparent)]"
            animate={{
              scale:
                playerState === "playing"
                  ? 1
                  : playerState === "paused"
                    ? 0.95
                    : 0.9,
              rotate: playerState === "playing" ? 360 : 0, // Continuous rotation when playing
            }}
            transition={{
              scale: { type: "spring", stiffness: 200, damping: 18 },
              rotate:
                playerState === "playing"
                  ? { duration: 20, repeat: Infinity, ease: "linear" } // 20s per rotation
                  : { duration: 0.3, ease: "easeOut" },
            }}
          >
            <Image
              src="/icon/album-art.png"
              alt="Music icon"
              width={40}
              height={40}
              className="opacity-80"
            />
          </motion.div>

          {/* Track Information */}
          <div className="flex flex-1 flex-col gap-[6px]">

            {/* Track Title & Artist */}
            <div className="space-y-[4px]">
              <h3 className="text-[18px] font-semibold text-[var(--color-neutral-25)]">
                {currentTrack.title}
              </h3>
              <p className="text-[14px] text-[var(--color-neutral-400)]">
                {currentTrack.artist}
              </p>
            </div>

            {/* Animated Equalizer Bars */}
            <div className="mt-[8px] flex h-[28px] items-end gap-[6px]">
              {Array.from({ length: 5 }).map((_, index) => (
                <motion.span
                  key={`bar-${index}`}
                  className={`w-[6px] bg-[var(--color-primary-200)] ${
                    isPlaying ? "rounded-full" : "rounded-[2px]"
                  }`}
                  variants={equalizerVariants}
                  animate={playerState}
                  custom={index} // Pass index for staggered animation
                  initial={false}
                />
              ))}
            </div>
          </div>
        </div>


        {/* PROGRESS BAR */}
        <div className="mt-5 space-y-2.5">
          {/* Progress Bar with Seek Functionality */}
          <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-neutral-800)]">
            {/* Animated Progress Fill */}
            <motion.div
              className="absolute inset-0 origin-left rounded-full"
              animate={{
                scaleX: progressScale, // Scale from 0 to 1
                backgroundColor: progressColor,
              }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            />
            {/* Invisible Range Input for Seeking */}
            <input
              type="range"
              min={0}
              max={100}
              step={0.1}
              value={progressPercent}
              onChange={(event) => handleSeek(Number(event.target.value))}
              aria-label="Seek"
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
          </div>
          
          {/* Time Display */}
          <div className="flex items-center justify-between text-[12px] text-neutral-500">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

  
        {/* CONTROL BUTTONS */}
        <div className="mt-4.5 flex items-center justify-center gap-4.5">
          {/* Shuffle Button */}
          <button
            type="button"
            aria-pressed={isShuffle}
            onClick={handleShuffleToggle}
            className={`group flex h-14 w-14 cursor-pointer items-center justify-center transition duration-200 ease-out active:scale-95 ${
              isShuffle
                ? "rounded-lg bg-neutral-800" // Active state styling
                : "rounded-full"
            }`}
          >
            <Image
              src="/icon/shuffle-button.svg"
              alt="Shuffle"
              width={28}
              height={28}
              className={`transition duration-200 ${
                isShuffle ? "brightness-200" : "group-hover:brightness-200"
              }`}
            />
          </button>

          {/* Previous Track Button */}
          <button
            type="button"
            onClick={handlePrevTrack}
            className="group flex h-14 w-14 cursor-pointer items-center justify-center rounded-full transition duration-200 ease-out active:scale-95"
          >
            <Image
              src="/icon/previous-button.svg"
              alt="Previous"
              width={28}
              height={28}
              className="transition duration-200 group-hover:brightness-200"
            />
          </button>

          {/* Play/Pause Button (Main Control) */}
          <motion.button
            type="button"
            aria-pressed={isPlaying}
            aria-busy={isLoading}
            onClick={handlePlayToggle}
            disabled={isLoading}
            className="flex h-17 w-17 cursor-pointer items-center justify-center rounded-full transition duration-200 ease-out disabled:cursor-not-allowed"
            animate={{ backgroundColor: playButtonColor }}
            transition={{ type: "spring", stiffness: 260, damping: 18 }}
            whileHover={!isLoading ? { scale: 1.05 } : undefined}
            whileTap={!isLoading ? { scale: 0.95 } : undefined}
          >
            {/* Animated Icon Transition */}
            <AnimatePresence mode="wait" initial={false}>
              {isPlaying ? (
                <motion.span
                  key="pause-icon"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                >
                  <Image
                    src="/icon/pause-button.svg"
                    alt="Pause"
                    width={24}
                    height={24}
                    className={isLoading ? "opacity-60" : "opacity-100"}
                  />
                </motion.span>
              ) : (
                <motion.span
                  key="play-icon"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                >
                  <Image
                    src="/icon/play-button.svg"
                    alt="Play"
                    width={24}
                    height={24}
                    className={isLoading ? "opacity-60" : "opacity-100"}
                  />
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>

          {/* Next Track Button */}
          <button
            type="button"
            onClick={handleNextTrack}
            className="group flex h-14 w-14 cursor-pointer items-center justify-center rounded-full transition duration-200 ease-out active:scale-95"
          >
            <Image
              src="/icon/next-button.svg"
              alt="Next"
              width={28}
              height={28}
              className="transition duration-200 group-hover:brightness-200"
            />
          </button>

          {/* Repeat Button */}
          <button
            type="button"
            aria-pressed={isRepeat}
            onClick={() => setIsRepeat((prev) => !prev)}
            className={`group flex h-14 w-14 cursor-pointer items-center justify-center transition duration-200 ease-out active:scale-95 ${
              isRepeat
                ? "rounded-lg bg-neutral-800" // Active state styling
                : "rounded-full"
            }`}
          >
            <Image
              src="/icon/repeat-button.svg"
              alt="Repeat"
              width={28}
              height={28}
              className={`transition duration-200 ${
                isRepeat ? "brightness-200" : "group-hover:brightness-200"
              }`}
            />
          </button>
        </div>

  
        {/* VOLUME CONTROL */}
        <div className="mt-4.5 flex items-center gap-3">
          {/* Volume Icon */}
          <Image
            src="/icon/volume-icon.svg"
            alt="Volume"
            width={18}
            height={18}
            className="opacity-80"
          />
          
          {/* Volume Slider */}
          <div
            className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-800"
            onMouseEnter={() => setIsVolumeHover(true)}
            onMouseLeave={() => setIsVolumeHover(false)}
          >
            {/* Animated Volume Fill */}
            <motion.div
              className="absolute inset-0 origin-left rounded-full"
              animate={{
                scaleX: volume, // Scale based on volume (0-1)
                backgroundColor: isVolumeHover
                  ? "var(--color-primary-200)" // Highlighted when hovering
                  : "var(--color-neutral-500)",
              }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            />
            {/* Invisible Range Input for Volume Control */}
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(event) => setVolume(Number(event.target.value))}
              aria-label="Volume"
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
          </div>
        </div>


        {/* HTML AUDIO ELEMENT */}
        <audio ref={audioRef} src={currentTrack.src} preload="metadata" />
      </motion.div>
    </div>
  );
}