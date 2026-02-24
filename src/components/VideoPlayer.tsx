import { useEffect, useRef, useState } from "react";
import { getProxiedImageUrl } from "@/lib/imageProxy";

interface VideoPlayerProps {
  videoUrl: string;
  thumbnailSpriteUrl?: string;
  thumbnailCount?: number;
  thumbnailColumns?: number;
  episodeTitle: string;
  thumbnailUrl?: string;
  skipCreditsTime?: number;
  skipCreditsTo?: number | null;
  nextEpisode?: {
    id: string;
    title: string;
    episode_number: number;
    thumbnail_url?: string;
  };
  onNextEpisode?: () => void;
  episodeId: string;
  initialProgress?: number;
  onProgressUpdate?: (time: number, duration: number) => void;
}

const VideoPlayer = ({
  videoUrl,
  thumbnailSpriteUrl,
  thumbnailCount = 60,
  thumbnailColumns = 10,
  episodeTitle,
  thumbnailUrl,
  skipCreditsTime = 90,
  skipCreditsTo,
  nextEpisode,
  onNextEpisode,
  episodeId,
  initialProgress = 0,
  onProgressUpdate,
}: VideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<HTMLDivElement>(null);
  const progressContainerRef = useRef<HTMLDivElement>(null);
  const progressFillRef = useRef<HTMLDivElement>(null);
  const progressThumbRef = useRef<HTMLDivElement>(null);
  const thumbnailRef = useRef<HTMLDivElement>(null);
  const thumbnailImageRef = useRef<HTMLDivElement>(null);
  const thumbnailTimeRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState("00:00");
  const [duration, setDuration] = useState("00:00");
  const [isDragging, setIsDragging] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [volume, setVolume] = useState(1);
  const [showPlayer, setShowPlayer] = useState(false);
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [showSkipCredits, setShowSkipCredits] = useState(false);
  const [showNextEpisodeOverlay, setShowNextEpisodeOverlay] = useState(false);
  const [nextEpisodeCountdown, setNextEpisodeCountdown] = useState(5);
  const [isMouseOverPlayer, setIsMouseOverPlayer] = useState(false);
  const [isSpriteLoaded, setIsSpriteLoaded] = useState(false);
  const [hasLoadedProgress, setHasLoadedProgress] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isTouchDragging, setIsTouchDragging] = useState(false);
  const hideTimeoutRef = useRef<NodeJS.Timeout>();
  const videoUnlockedRef = useRef<boolean>(false);
  const nextEpisodeTimeoutRef = useRef<NodeJS.Timeout>();
  const lastTouchTimeRef = useRef<number>(0);
  const isMouseDeviceRef = useRef<boolean>(false);
  const progressIntervalRef = useRef<NodeJS.Timeout>();
  const lastSavedTimeRef = useRef<number>(0);
  const wasPlayingBeforeTouchRef = useRef<boolean>(false);

  // Detectar si es un dispositivo táctil
  useEffect(() => {
    const hasTouchSupport = 
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      (navigator as any).msMaxTouchPoints > 0;
    setIsTouchDevice(hasTouchSupport);
  }, []);

  // Detectar cambios en el estado de fullscreen
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Función para determinar si debe usar diseño móvil
  const shouldUseMobileLayout = () => {
    return isTouchDevice || window.innerWidth <= 1023;
  };

  // Detectar si está en iOS PWA
  const isIOSPWA = () => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                        (window.navigator as any).standalone === true;
    return isIOS && isStandalone;
  };

  // Detectar si está en Android PWA
  const isAndroidPWA = () => {
    const isAndroid = /Android/.test(navigator.userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    return isAndroid && isStandalone;
  };

  const isPWA = isIOSPWA() || isAndroidPWA();

  // Precargar el sprite de miniaturas
  useEffect(() => {
    if (thumbnailSpriteUrl && showPlayer) {
      const img = new Image();
      img.onload = () => {
        setIsSpriteLoaded(true);
        console.log('Sprite de miniaturas precargado exitosamente');
      };
      img.onerror = () => {
        console.error('Error al precargar el sprite de miniaturas');
      };
      img.src = thumbnailSpriteUrl;
    }
  }, [thumbnailSpriteUrl, showPlayer]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !showPlayer) return;

    // Configurar atributos específicos de iOS
    if (isIOSPWA()) {
      video.setAttribute('webkit-playsinline', 'true');
      video.setAttribute('playsinline', 'true');
      video.setAttribute('x-webkit-airplay', 'allow');
    }

    // Load HLS if needed
    const loadVideo = async () => {
      // En iOS (tanto Safari como PWA), usar HLS nativo
      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = videoUrl;
        // En iOS PWA, cargar y preparar video inmediatamente
        if (isIOSPWA()) {
          video.load();
          // Intentar cargar metadata inmediatamente
          try {
            await video.play();
            video.pause();
            video.currentTime = 0;
            videoUnlockedRef.current = true;
            console.log('iOS PWA: Video unlocked successfully');
          } catch (e) {
            console.log('iOS PWA: Initial unlock failed, waiting for user interaction');
          }
        }
      } 
      // En PWA de iOS o Android, NO usar Hls.js
      else if (!isPWA) {
        // @ts-ignore - HLS.js is loaded via CDN
        if (typeof Hls !== "undefined" && Hls.isSupported()) {
          // @ts-ignore
          const hls = new Hls({ 
            maxBufferLength: 30,
            startLevel: -1, // Auto start level
            abrEwmaDefaultEstimate: 5000000, // Estimar 5 Mbps inicial (buena conexión)
            abrBandWidthFactor: 0.95, // Factor más agresivo para mejor calidad
            abrBandWidthUpFactor: 0.7, // Cambiar a mayor calidad más rápido
          });
          hls.loadSource(videoUrl);
          hls.attachMedia(video);
        }
      }
    };

    loadVideo();

    // Cargar progreso inicial cuando el video esté listo
    const handleLoadedMetadata = () => {
      if (initialProgress > 0 && !hasLoadedProgress && video) {
        video.currentTime = initialProgress;
        setHasLoadedProgress(true);
      }
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);

    // En iOS PWA, agregar listener para desbloquear video en primera interacción
    if (isIOSPWA()) {
      const unlockVideo = () => {
        if (!videoUnlockedRef.current) {
          videoUnlockedRef.current = true;
          // Desbloquear video con play + pause inmediato
          video.play().then(() => {
            video.pause();
            video.currentTime = 0;
          }).catch(() => {
            // Silenciar error
          });
        }
      };

      // Múltiples formas de capturar la primera interacción
      video.addEventListener('touchstart', unlockVideo, { once: true });
      video.addEventListener('click', unlockVideo, { once: true });
      document.addEventListener('touchstart', unlockVideo, { once: true });
      
      return () => {
        video.removeEventListener('touchstart', unlockVideo);
        video.removeEventListener('click', unlockVideo);
        document.removeEventListener('touchstart', unlockVideo);
      };
    }
  }, [videoUrl, isPWA, showPlayer]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === "Space" && e.target === document.body) {
        e.preventDefault();
        togglePlay();
      }
    };

    document.addEventListener("keydown", handleKeyPress);
    return () => document.removeEventListener("keydown", handleKeyPress);
  }, []);

  // Guardar progreso periódicamente
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !onProgressUpdate) return;

    const saveProgress = () => {
      if (video.currentTime > 0 && video.duration > 0) {
        const timeDiff = Math.abs(video.currentTime - lastSavedTimeRef.current);
        // Solo guardar si han pasado al menos 3 segundos desde el último guardado
        if (timeDiff >= 3) {
          console.log('Guardando progreso:', video.currentTime, 'de', video.duration);
          onProgressUpdate(video.currentTime, video.duration);
          lastSavedTimeRef.current = video.currentTime;
        }
      }
    };

    // Guardar cada 5 segundos mientras se reproduce
    progressIntervalRef.current = setInterval(saveProgress, 5000);

    // Guardar al pausar
    const handlePause = () => {
      if (video.currentTime > 0 && video.duration > 0) {
        console.log('Video pausado, guardando progreso:', video.currentTime);
        onProgressUpdate(video.currentTime, video.duration);
        lastSavedTimeRef.current = video.currentTime;
      }
    };

    video.addEventListener('pause', handlePause);

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      video.removeEventListener('pause', handlePause);
    };
  }, [onProgressUpdate, showPlayer]);

  const formatTime = (sec: number) => {
    if (!isFinite(sec)) return "00:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleVideoClick = (e: React.MouseEvent<HTMLVideoElement>) => {
    // En dispositivos touch/móviles, prevenir completamente el click del video
    // El contenedor maneja todo con handleContainerTouch
    if (shouldUseMobileLayout()) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    
    // En desktop, solo permitir si los controles están visibles
    const controls = controlsRef.current;
    if (controls && controls.classList.contains('hide')) {
      return;
    }
    
    togglePlay();
  };

  const togglePlay = () => {
    // En dispositivos touch, prevenir si los controles están ocultos
    if (shouldUseMobileLayout()) {
      const controls = controlsRef.current;
      if (controls && controls.classList.contains('hide')) {
        return;
      }
    }
    
    const video = videoRef.current;
    if (!video) return;
    
    // iOS PWA: desbloquear video en primera interacción
    if (isIOSPWA() && !videoUnlockedRef.current) {
      videoUnlockedRef.current = true;
      video.play().then(() => video.pause()).catch(() => {});
    }
    
    if (video.paused) {
      video.play().catch(err => {
        console.log("Play prevented:", err);
      });
    } else {
      video.pause();
    }
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video || !video.duration) return;

    const pct = (video.currentTime / video.duration) * 100;
    if (progressFillRef.current) {
      progressFillRef.current.style.width = pct + "%";
    }
    if (progressThumbRef.current) {
      progressThumbRef.current.style.left = pct + "%";
    }
    setCurrentTime(formatTime(video.currentTime));
    setDuration(formatTime(video.duration));

    // Skip credits button logic
    // skipCreditsTime y skipCreditsTo YA vienen en SEGUNDOS desde Supabase
    if (skipCreditsTo && video.currentTime >= skipCreditsTime && video.currentTime < skipCreditsTo) {
      setShowSkipCredits(true);
    } else {
      setShowSkipCredits(false);
    }

    // Next episode overlay logic (5 seconds before end)
    const timeRemaining = video.duration - video.currentTime;
    if (nextEpisode && timeRemaining <= 5 && timeRemaining > 0.5) {
      if (!showNextEpisodeOverlay) {
        setShowNextEpisodeOverlay(true);
        setNextEpisodeCountdown(Math.ceil(timeRemaining));
      } else {
        setNextEpisodeCountdown(Math.ceil(timeRemaining));
      }
    } else {
      setShowNextEpisodeOverlay(false);
    }
  };

  const showThumbnail = (e: React.MouseEvent) => {
    const video = videoRef.current;
    const progressContainer = progressContainerRef.current;
    const thumbnail = thumbnailRef.current;
    const thumbnailImage = thumbnailImageRef.current;
    const thumbnailTime = thumbnailTimeRef.current;

    if (!video || !video.duration || !progressContainer || !thumbnail || !thumbnailImage || !thumbnailTime) return null;

    const rect = progressContainer.getBoundingClientRect();
    const pos = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
    const hoverTime = pos * video.duration;
    
    if (thumbnailSpriteUrl) {
      const rows = Math.ceil(thumbnailCount / thumbnailColumns);
      const index = Math.floor((hoverTime / video.duration) * thumbnailCount);
      const col = index % thumbnailColumns;
      const row = Math.floor(index / thumbnailColumns);

      thumbnail.style.display = "block";
      let left = e.clientX - rect.left;
      const thumbWidth = 160;
      const halfThumb = thumbWidth / 2;
      left = Math.min(Math.max(left, halfThumb), rect.width - halfThumb);
      thumbnail.style.left = `${left}px`;
      thumbnailImage.style.backgroundPosition = `${(col / (thumbnailColumns - 1)) * 100}% ${(row / (rows - 1)) * 100}%`;
    }
    
    thumbnailTime.textContent = formatTime(hoverTime);

    return { pos, hoverTime };
  };

  const handleProgressMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) {
      showThumbnail(e);
    }
  };

  const handleProgressMouseLeave = () => {
    if (thumbnailRef.current) {
      thumbnailRef.current.style.display = "none";
    }
  };

  const handleProgressTouchStart = (e: React.TouchEvent) => {
    const video = videoRef.current;
    const progressContainer = progressContainerRef.current;
    
    if (!video || !progressContainer) return;
    
    // Guardar si estaba reproduciendo
    wasPlayingBeforeTouchRef.current = !video.paused;
    
    // Pausar el video mientras se arrastra
    if (!video.paused) {
      video.pause();
    }
    
    // Marcar que estamos arrastrando
    setIsTouchDragging(true);
    setIsDragging(true);
    
    // Cancelar el timeout de ocultar controles
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }
    
    // Procesar el touch inicial
    const touch = e.touches[0];
    const rect = progressContainer.getBoundingClientRect();
    const pos = Math.min(Math.max((touch.clientX - rect.left) / rect.width, 0), 1);
    const seekTime = pos * video.duration;
    
    // Actualizar el video inmediatamente
    video.currentTime = seekTime;
    
    // Actualizar la UI
    if (progressFillRef.current) {
      progressFillRef.current.style.width = `${pos * 100}%`;
    }
    if (progressThumbRef.current) {
      progressThumbRef.current.style.left = `${pos * 100}%`;
    }
  };

  const handleProgressTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    const progressContainer = progressContainerRef.current;
    const thumbnail = thumbnailRef.current;
    const thumbnailImage = thumbnailImageRef.current;
    const thumbnailTime = thumbnailTimeRef.current;
    const video = videoRef.current;
    const progressFill = progressFillRef.current;
    const progressThumb = progressThumbRef.current;

    if (!video || !video.duration || !progressContainer) return;

    const rect = progressContainer.getBoundingClientRect();
    const pos = Math.min(Math.max((touch.clientX - rect.left) / rect.width, 0), 1);
    const seekTime = pos * video.duration;
    
    // Actualizar el video en tiempo real mientras se arrastra
    if (isTouchDragging) {
      video.currentTime = seekTime;
      
      // Actualizar barra de progreso
      if (progressFill) {
        progressFill.style.width = `${pos * 100}%`;
      }
      if (progressThumb) {
        progressThumb.style.left = `${pos * 100}%`;
      }
    }
    
    // Mostrar miniatura si está disponible
    if (thumbnail && thumbnailImage && thumbnailTime) {
      if (thumbnailSpriteUrl) {
        const rows = Math.ceil(thumbnailCount / thumbnailColumns);
        const index = Math.floor((seekTime / video.duration) * thumbnailCount);
        const col = index % thumbnailColumns;
        const row = Math.floor(index / thumbnailColumns);

        thumbnail.style.display = "block";
        let left = touch.clientX - rect.left;
        const thumbWidth = 160;
        const halfThumb = thumbWidth / 2;
        left = Math.min(Math.max(left, halfThumb), rect.width - halfThumb);
        thumbnail.style.left = `${left}px`;
        thumbnailImage.style.backgroundPosition = `${(col / (thumbnailColumns - 1)) * 100}% ${(row / (rows - 1)) * 100}%`;
      }
      
      thumbnailTime.textContent = formatTime(seekTime);
    }
  };

  const handleProgressTouchEnd = () => {
    const video = videoRef.current;
    const controls = controlsRef.current;
    const mobileControls = document.querySelector('.mobile-center-controls');
    const controlsOverlay = document.querySelector('.video-controls-overlay');
    const titleInfo = document.querySelector('.video-title-info');
    
    // Ocultar miniatura
    if (thumbnailRef.current) {
      thumbnailRef.current.style.display = "none";
    }
    
    // Marcar que ya no estamos arrastrando
    setIsTouchDragging(false);
    setIsDragging(false);
    
    // Reanudar reproducción si estaba reproduciendo antes
    if (video && wasPlayingBeforeTouchRef.current) {
      video.play().catch(() => {});
    }
    
    // Mantener controles visibles por 3 segundos después de soltar
    if (controls && hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }
    
    hideTimeoutRef.current = setTimeout(() => {
      if (controls) {
        controls.classList.add("hide");
      }
      if (mobileControls) {
        mobileControls.classList.add("hide");
      }
      if (controlsOverlay) {
        controlsOverlay.classList.add("hide");
      }
      if (titleInfo) {
        titleInfo.classList.add("hide");
      }
    }, 3000);
  };

  const handleProgressMouseDown = (e: React.MouseEvent) => {
    const video = videoRef.current;
    if (!video) return;

    setIsDragging(true);
    const result = showThumbnail(e);
    if (result) {
      video.pause();
      video.currentTime = result.hoverTime;
      handleTimeUpdate();
    }
  };

  useEffect(() => {
    const handleMouseUp = () => {
      const video = videoRef.current;
      const thumbnail = thumbnailRef.current;
      
      if (isDragging) {
        setIsDragging(false);
        if (thumbnail) {
          thumbnail.style.display = "none";
        }
        if (video) {
          video.play();
        }
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      const video = videoRef.current;
      const progressContainer = progressContainerRef.current;
      const progressFill = progressFillRef.current;
      const progressThumb = progressThumbRef.current;
      const thumbnail = thumbnailRef.current;
      const thumbnailImage = thumbnailImageRef.current;
      const thumbnailTime = thumbnailTimeRef.current;

      if (isDragging && video && progressContainer && progressFill && progressThumb && thumbnail && thumbnailImage && thumbnailTime) {
        const rect = progressContainer.getBoundingClientRect();
        if (e.clientX < rect.left || e.clientX > rect.right) return;

        const pos = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
        const hoverTime = pos * video.duration;

        // Update progress bar and thumb
        progressFill.style.width = `${pos * 100}%`;
        progressThumb.style.left = `${pos * 100}%`;
        video.currentTime = hoverTime;

        // Show thumbnail during drag
        if (thumbnailSpriteUrl) {
          const rows = Math.ceil(thumbnailCount / thumbnailColumns);
          const index = Math.floor((hoverTime / video.duration) * thumbnailCount);
          const col = index % thumbnailColumns;
          const row = Math.floor(index / thumbnailColumns);

          thumbnail.style.display = "block";
          let left = e.clientX - rect.left;
          const thumbWidth = 160;
          const halfThumb = thumbWidth / 2;
          left = Math.min(Math.max(left, halfThumb), rect.width - halfThumb);
          thumbnail.style.left = `${left}px`;
          thumbnailImage.style.backgroundPosition = `${(col / (thumbnailColumns - 1)) * 100}% ${(row / (rows - 1)) * 100}%`;
        }
        
        thumbnailTime.textContent = formatTime(hoverTime);
      }
    };

    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("mousemove", handleMouseMove);

    return () => {
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("mousemove", handleMouseMove);
    };
  }, [isDragging, thumbnailSpriteUrl, thumbnailCount, thumbnailColumns]);

  const handleContainerMouseMove = () => {
    // Detectar que es un dispositivo con mouse
    isMouseDeviceRef.current = true;
    
    // En móviles, ignorar eventos de mouse si hubo un touch reciente
    if (shouldUseMobileLayout()) {
      const timeSinceTouch = Date.now() - lastTouchTimeRef.current;
      if (timeSinceTouch < 500) {
        return; // Ignorar mouse events si hubo touch hace menos de 500ms
      }
    }

    // Solo mostrar controles si el mouse está sobre el player o no es dispositivo mouse
    if (!isMouseDeviceRef.current || isMouseOverPlayer || document.fullscreenElement) {
      const controls = controlsRef.current;
      const mobileControls = document.querySelector('.mobile-center-controls');
      const controlsOverlay = document.querySelector('.video-controls-overlay');
      const titleInfo = document.querySelector('.video-title-info');
      
      if (!controls) return;

      controls.classList.remove("hide");
      if (mobileControls) {
        mobileControls.classList.remove("hide");
      }
      if (controlsOverlay) {
        controlsOverlay.classList.remove("hide");
      }
      if (titleInfo) {
        titleInfo.classList.remove("hide");
      }
      
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
      hideTimeoutRef.current = setTimeout(() => {
        controls.classList.add("hide");
        if (mobileControls) {
          mobileControls.classList.add("hide");
        }
        if (controlsOverlay) {
          controlsOverlay.classList.add("hide");
        }
        if (titleInfo) {
          titleInfo.classList.add("hide");
        }
      }, 3000);
    }
  };

  const handleMouseEnter = () => {
    setIsMouseOverPlayer(true);
    isMouseDeviceRef.current = true;
    
    const controls = controlsRef.current;
    const mobileControls = document.querySelector('.mobile-center-controls');
    const controlsOverlay = document.querySelector('.video-controls-overlay');
    const titleInfo = document.querySelector('.video-title-info');
    
    if (!controls) return;

    controls.classList.remove("hide");
    if (mobileControls) {
      mobileControls.classList.remove("hide");
    }
    if (controlsOverlay) {
      controlsOverlay.classList.remove("hide");
    }
    if (titleInfo) {
      titleInfo.classList.remove("hide");
    }
  };

  const handleMouseLeave = () => {
    setIsMouseOverPlayer(false);
    
    // No ocultar si estamos en fullscreen
    if (document.fullscreenElement) return;
    
    const controls = controlsRef.current;
    const mobileControls = document.querySelector('.mobile-center-controls');
    const controlsOverlay = document.querySelector('.video-controls-overlay');
    const titleInfo = document.querySelector('.video-title-info');
    
    if (!controls) return;

    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }
    
    controls.classList.add("hide");
    if (mobileControls) {
      mobileControls.classList.add("hide");
    }
    if (controlsOverlay) {
      controlsOverlay.classList.add("hide");
    }
    if (titleInfo) {
      titleInfo.classList.add("hide");
    }
  };

  const handleContainerTouch = (e: React.TouchEvent) => {
    // Solo en dispositivos móviles/touch
    if (!shouldUseMobileLayout()) return;
    
    // Si estamos arrastrando la barra de progreso, no hacer nada aquí
    if (isTouchDragging) return;
    
    // Marcar que no es un dispositivo mouse
    isMouseDeviceRef.current = false;
    
    // Registrar tiempo de touch para evitar conflictos con mouse events
    lastTouchTimeRef.current = Date.now();
    
    const controls = controlsRef.current;
    const mobileControls = document.querySelector('.mobile-center-controls');
    const controlsOverlay = document.querySelector('.video-controls-overlay');
    const titleInfo = document.querySelector('.video-title-info');
    
    if (!controls) return;
    
    const areControlsHidden = controls.classList.contains("hide");
    
    // Si los controles están ocultos, SOLO mostrarlos, sin ejecutar ninguna otra acción
    if (areControlsHidden) {
      // Prevenir COMPLETAMENTE que cualquier evento se propague
      e.preventDefault();
      e.stopPropagation();
      
      controls.classList.remove("hide");
      if (mobileControls) {
        mobileControls.classList.remove("hide");
      }
      if (controlsOverlay) {
        controlsOverlay.classList.remove("hide");
      }
      if (titleInfo) {
        titleInfo.classList.remove("hide");
      }
      
      // Auto-ocultar después de 3 segundos
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
      hideTimeoutRef.current = setTimeout(() => {
        controls.classList.add("hide");
        if (mobileControls) {
          mobileControls.classList.add("hide");
        }
        if (controlsOverlay) {
          controlsOverlay.classList.add("hide");
        }
        if (titleInfo) {
          titleInfo.classList.add("hide");
        }
      }, 3000);
      return;
    }
    
    // Si los controles están visibles, verificar si el touch fue en un botón o control
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('.video-progress-container')) {
      // Permitir que el botón/control se ejecute, pero resetear el timeout solo si no estamos arrastrando
      if (!isTouchDragging) {
        if (hideTimeoutRef.current) {
          clearTimeout(hideTimeoutRef.current);
        }
        hideTimeoutRef.current = setTimeout(() => {
          controls.classList.add("hide");
          if (mobileControls) {
            mobileControls.classList.add("hide");
          }
          if (controlsOverlay) {
            controlsOverlay.classList.add("hide");
          }
          if (titleInfo) {
            titleInfo.classList.add("hide");
          }
        }, 3000);
      }
      return;
    }

    // Si se toca el área general con controles visibles, ocultarlos
    e.preventDefault();
    controls.classList.add("hide");
    if (mobileControls) {
      mobileControls.classList.add("hide");
    }
    if (controlsOverlay) {
      controlsOverlay.classList.add("hide");
    }
    if (titleInfo) {
      titleInfo.classList.add("hide");
    }
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }
  };

  const toggleMute = () => {
    // En dispositivos touch, prevenir si los controles están ocultos
    if (shouldUseMobileLayout()) {
      const controls = controlsRef.current;
      if (controls && controls.classList.contains('hide')) {
        return;
      }
    }

    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  const getVolumeIcon = () => {
    if (isMuted || volume === 0) {
      return (
        <svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
          <line x1="416" y1="432" x2="64" y2="80" fill="none" stroke="currentColor" strokeLinecap="round" strokeMiterlimit="10" strokeWidth="32"></line>
          <path d="M243.33,98.86a23.89,23.89,0,0,0-25.55,1.82l-.66.51L188.6,124.54a8,8,0,0,0-.59,11.85l54.33,54.33A8,8,0,0,0,256,185.06V120.57A24.51,24.51,0,0,0,243.33,98.86Z"></path>
          <path d="M251.33,335.29,96.69,180.69A16,16,0,0,0,85.38,176H56a24,24,0,0,0-24,24V312a24,24,0,0,0,24,24h69.76l92,75.31A23.9,23.9,0,0,0,243.63,413,24.51,24.51,0,0,0,256,391.45V346.59A16,16,0,0,0,251.33,335.29Z"></path>
          <path d="M352,256c0-24.56-5.81-47.87-17.75-71.27a16,16,0,1,0-28.5,14.55C315.34,218.06,320,236.62,320,256q0,4-.31,8.13a8,8,0,0,0,2.32,6.25l14.36,14.36a8,8,0,0,0,13.55-4.31A146,146,0,0,0,352,256Z"></path>
          <path d="M416,256c0-51.18-13.08-83.89-34.18-120.06a16,16,0,0,0-27.64,16.12C373.07,184.44,384,211.83,384,256c0,23.83-3.29,42.88-9.37,60.65a8,8,0,0,0,1.9,8.26L389,337.4a8,8,0,0,0,13.13-2.79C411,311.76,416,287.26,416,256Z"></path>
          <path d="M480,256c0-74.25-20.19-121.11-50.51-168.61a16,16,0,1,0-27,17.22C429.82,147.38,448,189.5,448,256c0,46.19-8.43,80.27-22.43,110.53a8,8,0,0,0,1.59,9l11.92,11.92A8,8,0,0,0,452,385.29C471.6,344.9,480,305,480,256Z"></path>
        </svg>
      );
    } else if (volume > 0.66) {
      return (
        <svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
          <path d="M232,416a23.88,23.88,0,0,1-14.2-4.68,8.27,8.27,0,0,1-.66-.51L125.76,336H56a24,24,0,0,1-24-24V200a24,24,0,0,1,24-24h69.75l91.37-74.81a8.27,8.27,0,0,1,.66-.51A24,24,0,0,1,256,120V392a24,24,0,0,1-24,24ZM125.82,336Zm-.27-159.86Z"></path>
          <path d="M320,336a16,16,0,0,1-14.29-23.19c9.49-18.87,14.3-38,14.3-56.81,0-19.38-4.66-37.94-14.25-56.73a16,16,0,0,1,28.5-14.54C346.19,208.12,352,231.44,352,256c0,23.86-6,47.81-17.7,71.19A16,16,0,0,1,320,336Z"></path>
          <path d="M368,384a16,16,0,0,1-13.86-24C373.05,327.09,384,299.51,384,256c0-44.17-10.93-71.56-29.82-103.94a16,16,0,0,1,27.64-16.12C402.92,172.11,416,204.81,416,256c0,50.43-13.06,83.29-34.13,120A16,16,0,0,1,368,384Z"></path>
          <path d="M416,432a16,16,0,0,1-13.39-24.74C429.85,365.47,448,323.76,448,256c0-66.5-18.18-108.62-45.49-151.39a16,16,0,1,1,27-17.22C459.81,134.89,480,181.74,480,256c0,64.75-14.66,113.63-50.6,168.74A16,16,0,0,1,416,432Z"></path>
        </svg>
      );
    } else if (volume > 0.33) {
      return (
        <svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
          <path d="M264,416.19a23.92,23.92,0,0,1-14.21-4.69l-.66-.51-91.46-75H88a24,24,0,0,1-24-24V200a24,24,0,0,1,24-24h69.65l91.46-75,.66-.51A24,24,0,0,1,288,119.83V392.17a24,24,0,0,1-24,24Z"></path>
          <path d="M352,336a16,16,0,0,1-14.29-23.18c9.49-18.9,14.3-38,14.3-56.82,0-19.36-4.66-37.92-14.25-56.73a16,16,0,0,1,28.5-14.54C378.2,208.16,384,231.47,384,256c0,23.83-6,47.78-17.7,71.18A16,16,0,0,1,352,336Z"></path>
          <path d="M400,384a16,16,0,0,1-13.87-24C405,327.05,416,299.45,416,256c0-44.12-10.94-71.52-29.83-103.95A16,16,0,0,1,413.83,136C434.92,172.16,448,204.88,448,256c0,50.36-13.06,83.24-34.12,120A16,16,0,0,1,400,384Z"></path>
        </svg>
      );
    } else {
      return (
        <svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
          <path d="M296,416.19a23.92,23.92,0,0,1-14.21-4.69l-.66-.51-91.46-75H120a24,24,0,0,1-24-24V200a24,24,0,0,1,24-24h69.65l91.46-75,.66-.51A24,24,0,0,1,320,119.83V392.17a24,24,0,0,1-24,24Z"></path>
          <path d="M384,336a16,16,0,0,1-14.29-23.18c9.49-18.9,14.3-38,14.3-56.82,0-19.36-4.66-37.92-14.25-56.73a16,16,0,0,1,28.5-14.54C410.2,208.16,416,231.47,416,256c0,23.83-6,47.78-17.7,71.18A16,16,0,0,1,384,336Z"></path>
        </svg>
      );
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    video.volume = newVolume;
    if (newVolume === 0) {
      setIsMuted(true);
      video.muted = true;
    } else if (isMuted) {
      setIsMuted(false);
      video.muted = false;
    }
  };

  const toggleFullscreen = async () => {
    // En dispositivos touch, prevenir si los controles están ocultos
    if (shouldUseMobileLayout()) {
      const controls = controlsRef.current;
      if (controls && controls.classList.contains('hide')) {
        return;
      }
    }

    const container = containerRef.current;
    const video = videoRef.current;
    if (!container || !video) return;

    // iOS Safari requiere usar webkitEnterFullscreen en el video directamente
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    
    if (isIOS) {
      // Para iOS, usar el método webkit del video
      try {
        if ((video as any).webkitEnterFullscreen) {
          (video as any).webkitEnterFullscreen();
        }
      } catch (error) {
        console.error("Error entering fullscreen on iOS:", error);
      }
    } else {
      // Para Android y otros navegadores
      try {
        if (!document.fullscreenElement) {
          await container.requestFullscreen();
          
          // Intentar bloquear orientación en landscape (funciona en Android)
          if (screen.orientation && (screen.orientation as any).lock) {
            try {
              await (screen.orientation as any).lock('landscape');
            } catch (e) {
              console.log("Screen orientation lock not supported");
            }
          }
        } else {
          await document.exitFullscreen();
          
          // Desbloquear orientación al salir
          if (screen.orientation && (screen.orientation as any).unlock) {
            try {
              (screen.orientation as any).unlock();
            } catch (e) {
              console.log("Screen orientation unlock not supported");
            }
          }
        }
      } catch (error) {
        console.error("Error toggling fullscreen:", error);
      }
    }
  };

  const skipBackward = () => {
    // En dispositivos touch, prevenir si los controles están ocultos
    if (shouldUseMobileLayout()) {
      const controls = controlsRef.current;
      if (controls && controls.classList.contains('hide')) {
        return;
      }
    }

    const video = videoRef.current;
    if (!video) return;
    
    // iOS PWA: desbloquear en primera interacción
    if (isIOSPWA() && !videoUnlockedRef.current) {
      videoUnlockedRef.current = true;
      const wasPlaying = !video.paused;
      video.play().then(() => {
        video.pause();
        video.currentTime = Math.max(video.currentTime - 10, 0);
        if (wasPlaying) {
          video.play().catch(() => {});
        }
      }).catch(() => {
        video.currentTime = Math.max(video.currentTime - 10, 0);
      });
    } else {
      video.currentTime = Math.max(video.currentTime - 10, 0);
    }
  };

  const skipForward = () => {
    // En dispositivos touch, prevenir si los controles están ocultos
    if (shouldUseMobileLayout()) {
      const controls = controlsRef.current;
      if (controls && controls.classList.contains('hide')) {
        return;
      }
    }

    const video = videoRef.current;
    if (!video) return;
    
    // iOS PWA: desbloquear en primera interacción
    if (isIOSPWA() && !videoUnlockedRef.current) {
      videoUnlockedRef.current = true;
      const wasPlaying = !video.paused;
      video.play().then(() => {
        video.pause();
        video.currentTime = Math.min(video.currentTime + 10, video.duration || 0);
        if (wasPlaying) {
          video.play().catch(() => {});
        }
      }).catch(() => {
        video.currentTime = Math.min(video.currentTime + 10, video.duration || 0);
      });
    } else {
      video.currentTime = Math.min(video.currentTime + 10, video.duration || 0);
    }
  };

  const handleStartVideo = () => {
    setShowPlayer(true);
    setIsVideoLoading(true);
  };

  // Intentar reproducir inmediatamente tras mostrar el player (gesto del usuario)
  useEffect(() => {
    if (!showPlayer) return;
    const v = videoRef.current;
    v?.play().catch(() => {});
  }, [showPlayer, videoUrl]);

  // Auto-play next episode when current ends
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleEnded = () => {
      if (nextEpisode && onNextEpisode) {
        // Give user 0.5 seconds to cancel if they want
        nextEpisodeTimeoutRef.current = setTimeout(() => {
          onNextEpisode();
        }, 500);
      }
    };

    video.addEventListener('ended', handleEnded);
    return () => {
      video.removeEventListener('ended', handleEnded);
      if (nextEpisodeTimeoutRef.current) {
        clearTimeout(nextEpisodeTimeoutRef.current);
      }
    };
  }, [nextEpisode, onNextEpisode]);

  const skipToCreditsEnd = () => {
    const video = videoRef.current;
    if (video && skipCreditsTo) {
      // skipCreditsTo YA viene en segundos desde Supabase
      video.currentTime = skipCreditsTo;
      setShowSkipCredits(false);
    }
  };

  const cancelNextEpisode = () => {
    setShowNextEpisodeOverlay(false);
    if (nextEpisodeTimeoutRef.current) {
      clearTimeout(nextEpisodeTimeoutRef.current);
    }
  };

  // Al cambiar de episodio, volver a la portada (thumbnail)
  useEffect(() => {
    setShowPlayer(false);
    setIsVideoLoading(false);
    setIsPlaying(false);
  }, [videoUrl]);

  const handleVideoReady = () => {
    setIsVideoLoading(false);
    const video = videoRef.current;
    if (video && video.paused) {
      video.play().catch(() => {});
    }
  };
  const thumbnailRows = Math.ceil(thumbnailCount / thumbnailColumns);

  // Initial view with thumbnail and play button
  if (!showPlayer) {
    return (
      <>
        <style>{`
          .video-initial-container {
            position: relative;
            width: 100%;
            aspect-ratio: 16/9;
            background: #000;
            overflow: hidden;
            cursor: pointer;
          }

          .video-initial-thumbnail {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }

          .video-initial-overlay {
            position: absolute;
            inset: 0;
            background: rgba(0, 0, 0, 0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background 0.3s ease;
          }

          .video-initial-container:hover .video-initial-overlay {
            background: rgba(0, 0, 0, 0.5);
          }

          .video-initial-play-btn {
            width: 68px;
            height: 68px;
            border-radius: 50%;
            background: hsl(var(--primary));
            border: none;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
            padding: 0;
            position: relative;
          }

          .video-initial-container:hover .video-initial-play-btn {
            transform: scale(1.08);
            background: hsl(var(--primary) / 0.9);
          }

          .video-initial-play-btn svg {
            width: 32px;
            height: 32px;
            fill: hsl(var(--primary-foreground));
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-47%, -50%);
          }

          @media (max-width: 1023px) {
            .video-initial-play-btn {
              width: 56px;
              height: 56px;
            }

            .video-initial-play-btn svg {
              width: 26px;
              height: 26px;
            }
          }
        `}</style>
        <div className="video-initial-container" onClick={handleStartVideo}>
          {thumbnailUrl && (
            <img
              src={thumbnailUrl}
              alt={episodeTitle}
              className="video-initial-thumbnail"
            />
          )}
          <div className="video-initial-overlay">
            <button className="video-initial-play-btn" aria-label="Reproducir">
              <svg viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>
          </div>
        </div>
      </>
    );
  }

  // Spinner ahora es un overlay dentro del reproductor, no una vista separada
  return (
    <>
      <style>{`
        .video-player-container {
          position: relative;
          width: 100%;
          aspect-ratio: 16/9;
          background: #000;
          overflow: hidden;
          user-select: none;
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
        }

        .mobile-center-controls {
          display: none;
        }

        @media (max-width: 1023px) {
          .mobile-center-controls {
            display: flex;
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            align-items: center;
            gap: 48px;
            pointer-events: none;
            z-index: 10;
          }

          .mobile-btn {
            background: none;
            border: none;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            width: auto;
            height: auto;
            pointer-events: auto;
          }

          .mobile-btn svg {
            width: 48px;
            height: 48px;
            fill: hsl(var(--foreground));
          }

          .mobile-btn-play svg {
            width: 64px;
            height: 64px;
          }

          .mobile-btn:active svg {
            fill: hsl(var(--primary));
          }

          .video-controls-center {
            display: none !important;
          }
        }

        @media (max-width: 500px) {
          .mobile-btn svg {
            width: 40px;
            height: 40px;
          }

          .mobile-btn-play svg {
            width: 52px;
            height: 52px;
          }
        }

        .video-player-container.touch-device .mobile-center-controls {
          display: flex;
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          align-items: center;
          gap: 48px;
          pointer-events: none;
          z-index: 10;
        }

        .video-player-container.touch-device .mobile-btn {
          background: none;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          width: auto;
          height: auto;
          pointer-events: auto;
        }

        .video-player-container.touch-device .mobile-btn svg {
          width: 48px;
          height: 48px;
          fill: hsl(var(--foreground));
        }

        .video-player-container.touch-device .mobile-btn-play svg {
          width: 64px;
          height: 64px;
        }

        @media (max-width: 500px) {
          .video-player-container.touch-device .mobile-btn svg {
            width: 40px;
            height: 40px;
          }

          .video-player-container.touch-device .mobile-btn-play svg {
            width: 52px;
            height: 52px;
          }
        }

        .video-player-container.touch-device .mobile-btn:active svg {
          fill: hsl(var(--primary));
        }

        .video-player-container.touch-device .video-controls-center {
          display: none !important;
        }

        .video-player-container video {
          width: 100%;
          height: 100%;
          object-fit: contain;
          background: #000;
          cursor: pointer;
          -webkit-user-drag: none;
          user-select: none;
          -webkit-tap-highlight-color: transparent;
        }

        @media (max-width: 1023px) {
          .video-player-container video {
            pointer-events: none;
          }
        }

        .video-player-container.touch-device video {
          pointer-events: none;
        }

        .mobile-center-controls {
          transition: opacity .3s;
          opacity: 1;
        }

        .mobile-center-controls.hide,
        .mobile-center-controls.loading {
          opacity: 0;
        }

        .mobile-center-controls.hide *,
        .mobile-center-controls.loading * {
          pointer-events: none !important;
        }

        /* Estilos para ocultar el título de la serie */
        .video-title-info {
          transition: opacity .3s;
          opacity: 1;
        }

        .video-title-info.hide {
          opacity: 0;
          pointer-events: none !important;
        }

        .video-controls-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0);
          pointer-events: none;
          transition: background 0.3s ease;
          z-index: 5;
        }

        @media (max-width: 1023px) {
          .video-controls-overlay {
            background: rgba(0, 0, 0, 0.5);
          }

          .video-controls-overlay.hide,
          .video-controls-overlay.loading {
            background: rgba(0, 0, 0, 0);
          }
        }

        .video-player-container.touch-device .video-controls-overlay {
          background: rgba(0, 0, 0, 0.5);
        }

        .video-player-container.touch-device .video-controls-overlay.hide,
        .video-player-container.touch-device .video-controls-overlay.loading {
          background: rgba(0, 0, 0, 0);
        }

        .video-player-controls {
          position: absolute;
          bottom: 0;
          width: 100%;
          background: linear-gradient(to top, rgba(0,0,0,0.85), transparent);
          padding: 14px 22px 24px 22px;
          box-sizing: border-box;
          transition: opacity .3s;
          opacity: 1;
          z-index: 10;
        }

        @media (max-width: 1023px) {
          .video-player-controls {
            padding: 14px 22px 0 22px;
          }
        }

        .video-player-container.touch-device .video-player-controls {
          padding: 14px 22px 0 22px;
        }

        .video-player-controls.hide,
        .video-player-controls.loading {
          opacity: 0;
        }

        .video-player-controls.hide *,
        .video-player-controls.loading * {
          pointer-events: none !important;
        }

        .video-player-title {
          font-size: 1.125rem;
          font-weight: 600;
          margin-bottom: 10px;
          text-align: left;
          color: hsl(var(--foreground));
          user-select: none;
        }

        @media (max-width: 1023px) {
          .video-player-title {
            display: none;
          }
        }

        .video-player-container.touch-device .video-player-title {
          display: none;
        }
        
        @media (min-width: 1024px) {
          .video-player-title {
            font-size: 1.5rem;
            margin-bottom: 14px;
          }
        }

        .video-progress-container {
          position: relative;
          width: 100%;
          height: 6px;
          background: rgba(255,255,255,0.25);
          border-radius: 3px;
          margin-bottom: 14px;
          cursor: pointer;
          transition: height 0.2s ease;
        }

        @media (max-width: 1023px) {
          .video-progress-container {
            position: absolute;
            bottom: 25px;
            left: 22px;
            right: 22px;
            width: calc(100% - 44px);
            margin-bottom: 0;
          }
        }

        .video-player-container.touch-device .video-progress-container {
          position: absolute;
          bottom: 25px;
          left: 22px;
          right: 22px;
          width: calc(100% - 44px);
          margin-bottom: 0;
        }

        @media (max-width: 500px) {
          .video-progress-container {
            bottom: 15px;
          }
        }

        .video-progress-container:hover,
        .video-progress-container.dragging,
        .video-progress-container.touch-dragging {
          height: 10px;
        }

        /* Barra más gruesa en touch cuando se arrastra */
        .video-player-container.touch-device .video-progress-container.touch-dragging {
          height: 12px;
        }

        /* En fullscreen y touch, hacer la barra aún más gruesa */
        .video-player-container.touch-device:fullscreen .video-progress-container.touch-dragging,
        .video-player-container.touch-device:-webkit-full-screen .video-progress-container.touch-dragging {
          height: 14px;
        }

        .video-progress-fill {
          position: absolute;
          top: 0;
          left: 0;
          height: 100%;
          background: hsl(var(--primary));
          border-radius: 3px;
          width: 0%;
        }

        .video-progress-thumb {
          position: absolute;
          top: 50%;
          transform: translate(-50%, -50%);
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: hsl(var(--primary));
          pointer-events: auto;
          left: 0%;
          transition: none;
          opacity: 0;
        }

        .video-progress-container:hover .video-progress-thumb,
        .video-progress-container.dragging .video-progress-thumb,
        .video-progress-container.touch-dragging .video-progress-thumb {
          opacity: 1;
        }

        @media (max-width: 1023px) {
          .video-progress-thumb {
            opacity: 1;
          }
        }

        .video-player-container.touch-device .video-progress-thumb {
          opacity: 1;
        }

        .video-thumbnail-preview {
          position: absolute;
          bottom: calc(100% + 15px);
          width: 160px;
          height: 110px;
          background-color: #111;
          border-radius: 6px;
          pointer-events: none;
          display: none;
          transform: translateX(-50%);
          box-shadow: 0 4px 12px rgba(0,0,0,0.5);
          overflow: hidden;
          border: 2px solid rgba(255,255,255,0.3);
          z-index: 1000;
        }

        .video-thumbnail-image {
          width: 100%;
          height: 90px;
          ${thumbnailSpriteUrl && isSpriteLoaded ? `background-image: url("${thumbnailSpriteUrl}");` : ''}
          background-size: ${thumbnailColumns * 100}% ${thumbnailRows * 100}%;
          background-color: #111;
          background-position: 0% 0%;
          transition: opacity 0.2s ease;
        }

        .video-thumbnail-time {
          width: 100%;
          height: 22px;
          background: rgba(0,0,0,0.9);
          color: #fff;
          font-size: 14px;
          font-weight: 500;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
          padding-bottom: 5px;
        }

        .video-controls-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        @media (max-width: 1023px) {
          .video-controls-bar {
            position: absolute;
            bottom: 45px;
            left: 22px;
            right: 22px;
            width: calc(100% - 44px);
          }
        }

        .video-player-container.touch-device .video-controls-bar {
          position: absolute;
          bottom: 45px;
          left: 22px;
          right: 22px;
          width: calc(100% - 44px);
        }

        @media (max-width: 500px) {
          .video-controls-bar {
            bottom: 35px;
          }
        }
        
        .video-controls-center {
          display: flex;
          align-items: center;
          gap: 12px;
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
        }
        
        @media (min-width: 1024px) {
          .video-controls-center {
            gap: 16px;
          }
        }

        .video-controls-buttons {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        @media (min-width: 1024px) {
          .video-controls-buttons {
            gap: 16px;
          }
        }

        .video-control-btn {
          background: none;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          transition: all 0.2s;
        }

        .video-control-btn svg {
          width: 24px;
          height: 24px;
          fill: hsl(var(--foreground) / 0.6);
          transition: fill 0.2s;
        }
        
          @media (max-width: 1023px) {
            .video-control-btn svg {
              fill: hsl(var(--foreground));
              opacity: 1;
            }
          }

          .video-player-container.touch-device .video-control-btn svg {
            fill: hsl(var(--foreground));
            opacity: 1;
          }
        
        .video-control-btn.play-pause svg {
          width: 29px;
          height: 29px;
        }
        
        @media (min-width: 1024px) {
          .video-control-btn svg {
            width: 28px;
            height: 28px;
          }
          
          .video-control-btn.play-pause svg {
            width: 33px;
            height: 33px;
          }
        }

        .video-control-btn:hover svg {
          fill: hsl(var(--foreground));
        }

        .video-volume-container {
          display: flex;
          align-items: center;
          gap: 8px;
          position: relative;
        }

        .video-volume-slider-container {
          width: 0;
          overflow: visible;
          opacity: 0;
          transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease;
          display: flex;
          align-items: center;
          height: 20px;
        }

        .video-volume-container:hover .video-volume-slider-container {
          width: 80px;
          opacity: 1;
        }

        .video-volume-slider {
          width: 100%;
          height: 3px;
          border-radius: 2px;
          background: transparent;
          outline: none;
          cursor: pointer;
          appearance: none;
          -webkit-appearance: none;
          transition: height 0.2s ease;
        }

        .video-volume-slider:hover {
          height: 5px;
        }

        .video-volume-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: hsl(var(--primary));
          cursor: pointer;
          border: none;
        }

        .video-volume-slider::-moz-range-thumb {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: hsl(var(--primary));
          cursor: pointer;
          border: none;
        }

        .video-volume-slider::-webkit-slider-runnable-track {
          width: 100%;
          height: 3px;
          border-radius: 2px;
          background: linear-gradient(to right, 
            hsl(var(--primary)) 0%, 
            hsl(var(--primary)) ${volume * 100}%, 
            rgba(255, 255, 255, 0.25) ${volume * 100}%, 
            rgba(255, 255, 255, 0.25) 100%);
          transition: height 0.2s ease;
        }

        .video-volume-slider:hover::-webkit-slider-runnable-track {
          height: 6px;
        }

        .video-volume-slider::-moz-range-track {
          width: 100%;
          height: 3px;
          border-radius: 2px;
          background: rgba(255, 255, 255, 0.25);
          transition: height 0.2s ease;
        }

        .video-volume-slider:hover::-moz-range-track {
          height: 6px;
        }

        .video-volume-slider::-moz-range-progress {
          height: 3px;
          border-radius: 2px;
          background: hsl(var(--primary));
          transition: height 0.2s ease;
        }

        .video-volume-slider:hover::-moz-range-progress {
          height: 6px;
        }

        .video-time {
          font-size: 0.95rem;
          opacity: 0.8;
          color: hsl(var(--foreground));
        }
        
        @media (max-width: 1023px) {
          .video-time {
            opacity: 1;
          }
        }

        .video-player-container.touch-device .video-time {
          opacity: 1;
        }
        
        @media (min-width: 1024px) {
          .video-time {
            font-size: 1.125rem;
          }
        }

        /* Loading overlay */
        .video-loading-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.3);
          pointer-events: none;
        }

        .video-loading-spinner {
          width: 48px;
          height: 48px;
          border: 4px solid rgba(255, 255, 255, 0.2);
          border-top-color: hsl(var(--primary));
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin { to { transform: rotate(360deg); } }

        /* Estilos para pantalla completa en dispositivos táctiles */
        .video-player-container.touch-device:fullscreen .mobile-center-controls,
        .video-player-container.touch-device:-webkit-full-screen .mobile-center-controls {
          gap: 60px;
        }

        /* Info de serie en fullscreen */
        .video-player-container.touch-device:fullscreen .absolute.top-4,
        .video-player-container.touch-device:-webkit-full-screen .absolute.top-4 {
          max-width: 60%;
        }

        @media (min-width: 768px) {
          .video-player-container.touch-device:fullscreen .absolute.top-4 p,
          .video-player-container.touch-device:-webkit-full-screen .absolute.top-4 p {
            font-size: 0.95rem;
          }
        }

        @media (min-width: 1024px) {
          .video-player-container.touch-device:fullscreen .absolute.top-4 p,
          .video-player-container.touch-device:-webkit-full-screen .absolute.top-4 p {
            font-size: 1.05rem;
          }
        }

        .video-player-container.touch-device:fullscreen .mobile-btn svg,
        .video-player-container.touch-device:-webkit-full-screen .mobile-btn svg {
          width: 56px;
          height: 56px;
        }

        .video-player-container.touch-device:fullscreen .mobile-btn-play svg,
        .video-player-container.touch-device:-webkit-full-screen .mobile-btn-play svg {
          width: 76px;
          height: 76px;
        }

        /* Ajustes para pantallas medianas en fullscreen */
        @media (min-width: 768px) and (max-width: 1023px) {
          .video-player-container.touch-device:fullscreen .mobile-center-controls,
          .video-player-container.touch-device:-webkit-full-screen .mobile-center-controls {
            gap: 80px;
          }

          .video-player-container.touch-device:fullscreen .mobile-btn svg,
          .video-player-container.touch-device:-webkit-full-screen .mobile-btn svg {
            width: 64px;
            height: 64px;
          }

          .video-player-container.touch-device:fullscreen .mobile-btn-play svg,
          .video-player-container.touch-device:-webkit-full-screen .mobile-btn-play svg {
            width: 88px;
            height: 88px;
          }
        }

        /* Ajustes para pantallas grandes en fullscreen */
        @media (min-width: 1024px) {
          .video-player-container.touch-device:fullscreen .mobile-center-controls,
          .video-player-container.touch-device:-webkit-full-screen .mobile-center-controls {
            gap: 100px;
          }

          .video-player-container.touch-device:fullscreen .mobile-btn svg,
          .video-player-container.touch-device:-webkit-full-screen .mobile-btn svg {
            width: 72px;
            height: 72px;
          }

          .video-player-container.touch-device:fullscreen .mobile-btn-play svg,
          .video-player-container.touch-device:-webkit-full-screen .mobile-btn-play svg {
            width: 100px;
            height: 100px;
          }
        }

        /* Barra de progreso en fullscreen */
        .video-player-container.touch-device:fullscreen .video-progress-container,
        .video-player-container.touch-device:-webkit-full-screen .video-progress-container {
          height: 8px;
          bottom: 35px;
        }

        .video-player-container.touch-device:fullscreen .video-progress-thumb,
        .video-player-container.touch-device:-webkit-full-screen .video-progress-thumb {
          width: 18px;
          height: 18px;
        }

        /* Controles inferiores en fullscreen */
        .video-player-container.touch-device:fullscreen .video-controls-bar,
        .video-player-container.touch-device:-webkit-full-screen .video-controls-bar {
          bottom: 55px;
        }

        .video-player-container.touch-device:fullscreen .video-time,
        .video-player-container.touch-device:-webkit-full-screen .video-time {
          font-size: 1.1rem;
        }

        @media (min-width: 768px) {
          .video-player-container.touch-device:fullscreen .video-time,
          .video-player-container.touch-device:-webkit-full-screen .video-time {
            font-size: 1.3rem;
          }
        }

        @media (min-width: 1024px) {
          .video-player-container.touch-device:fullscreen .video-time,
          .video-player-container.touch-device:-webkit-full-screen .video-time {
            font-size: 1.5rem;
          }

          .video-player-container.touch-device:fullscreen .video-progress-container,
          .video-player-container.touch-device:-webkit-full-screen .video-progress-container {
            bottom: 45px;
          }

          .video-player-container.touch-device:fullscreen .video-controls-bar,
          .video-player-container.touch-device:-webkit-full-screen .video-controls-bar {
            bottom: 70px;
          }
        }

        /* Icono de volumen en fullscreen para dispositivos táctiles */
        .video-player-container.touch-device:fullscreen .video-control-btn svg,
        .video-player-container.touch-device:-webkit-full-screen .video-control-btn svg {
          width: 30px;
          height: 30px;
        }

        @media (min-width: 1024px) {
          .video-player-container.touch-device:fullscreen .video-control-btn svg,
          .video-player-container.touch-device:-webkit-full-screen .video-control-btn svg {
            width: 36px;
            height: 36px;
          }
        }

        /* Skip credits y next episode en fullscreen */
        .video-player-container.touch-device:fullscreen .skip-credits-btn,
        .video-player-container.touch-device:-webkit-full-screen .skip-credits-btn {
          font-size: 1rem;
          padding: 10px 18px;
        }

        @media (min-width: 1024px) {
          .video-player-container.touch-device:fullscreen .skip-credits-btn,
          .video-player-container.touch-device:-webkit-full-screen .skip-credits-btn {
            font-size: 1.15rem;
            padding: 12px 22px;
          }
        }

        /* Skip Credits Button */
        .skip-credits-btn {
          position: absolute;
          top: 80px;
          right: 20px;
          background: rgba(42, 42, 42, 0.9);
          color: hsl(var(--foreground));
          border: 2px solid rgba(255, 255, 255, 0.7);
          padding: 8px 16px;
          border-radius: 4px;
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          z-index: 20;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .skip-credits-btn:hover {
          background: rgba(230, 230, 230, 0.95);
          color: #000;
          transform: scale(1.05);
        }

        @media (max-width: 1023px) {
          .skip-credits-btn {
            top: 60px;
            right: 15px;
            padding: 6px 12px;
            font-size: 0.85rem;
          }
        }

        /* Next Episode Overlay */
        .next-episode-overlay {
          position: absolute;
          bottom: 100px;
          right: 20px;
          background: rgba(20, 20, 20, 0.95);
          border-left: 4px solid hsl(var(--primary));
          padding: 20px;
          border-radius: 4px;
          max-width: 400px;
          z-index: 20;
          animation: slideInRight 0.3s ease;
        }

        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @media (max-width: 1023px) {
          .next-episode-overlay {
            bottom: 70px;
            right: 10px;
            left: 10px;
            max-width: none;
            padding: 15px;
          }
        }

        .next-episode-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .next-episode-title {
          font-size: 0.9rem;
          color: hsl(var(--foreground));
          opacity: 0.8;
        }

        .next-episode-countdown {
          font-size: 1.8rem;
          font-weight: bold;
          color: hsl(var(--foreground));
        }

        .next-episode-content {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .next-episode-thumbnail {
          width: 120px;
          aspect-ratio: 16/9;
          background: #000;
          border-radius: 4px;
          overflow: hidden;
          flex-shrink: 0;
        }

        @media (max-width: 500px) {
          .next-episode-thumbnail {
            width: 100px;
          }
        }

        .next-episode-thumbnail img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .next-episode-info {
          flex: 1;
        }

        .next-episode-episode-title {
          font-size: 1rem;
          font-weight: 600;
          color: hsl(var(--foreground));
          margin-bottom: 8px;
        }

        @media (max-width: 500px) {
          .next-episode-episode-title {
            font-size: 0.9rem;
          }
        }

        .next-episode-cancel-btn {
          background: transparent;
          border: 2px solid hsl(var(--foreground));
          color: hsl(var(--foreground));
          padding: 6px 16px;
          border-radius: 4px;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .next-episode-cancel-btn:hover {
          background: hsl(var(--foreground));
          color: hsl(var(--background));
        }
      `}</style>

      <div
        ref={containerRef}
        className={`video-player-container ${isTouchDevice ? 'touch-device' : ''}`}
        onMouseMove={handleContainerMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleContainerTouch}
      >
        <video
          ref={videoRef}
          preload="metadata"
          playsInline
          onClick={handleVideoClick}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={() => videoRef.current?.play().catch(() => {})}
          onCanPlay={handleVideoReady}
          onPlaying={handleVideoReady}
        />

        {isVideoLoading && (
          <div className="video-loading-overlay">
            <div className="video-loading-spinner" />
          </div>
        )}

        {/* Controls overlay for mobile/tablet */}
        <div className={`video-controls-overlay ${isVideoLoading ? 'loading' : ''}`} />

        {/* Serie y episodio info en fullscreen para touch devices */}
        {isTouchDevice && isFullscreen && (
          <div className="absolute top-4 left-4 text-white z-50 pointer-events-none video-title-info">
            <p className="text-sm font-medium opacity-90">{episodeTitle}</p>
          </div>
        )}

        {/* Mobile center controls */}
        <div className={`mobile-center-controls ${isVideoLoading ? 'loading' : ''}`}>
          <button className="mobile-btn" onClick={skipBackward} title="Retroceder 10s">
            <svg viewBox="-3.2 -3.2 22.40 22.40" fill="none">
              <path d="M6 7L7 6L4.70711 3.70711L5.19868 3.21553C5.97697 2.43724 7.03256 2 8.13323 2C11.361 2 14 4.68015 14 7.93274C14 11.2589 11.3013 14 8 14C6.46292 14 4.92913 13.4144 3.75736 12.2426L2.34315 13.6569C3.90505 15.2188 5.95417 16 8 16C12.4307 16 16 12.3385 16 7.93274C16 3.60052 12.4903 0 8.13323 0C6.50213 0 4.93783 0.647954 3.78447 1.80132L3.29289 2.29289L1 0L0 1V7H6Z" />
            </svg>
          </button>

          <button className="mobile-btn mobile-btn-play" onClick={togglePlay} title="Reproducir/Pausar">
            {isPlaying ? (
              <svg viewBox="0 0 24 24">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          <button className="mobile-btn" onClick={skipForward} title="Adelantar 10s">
            <svg viewBox="-3.2 -3.2 22.40 22.40" fill="none">
              <path d="M10 7L9 6L11.2929 3.70711L10.8013 3.21553C10.023 2.43724 8.96744 2 7.86677 2C4.63903 2 2 4.68015 2 7.93274C2 11.2589 4.69868 14 8 14C9.53708 14 11.0709 13.4144 12.2426 12.2426L13.6569 13.6569C12.095 15.2188 10.0458 16 8 16C3.56933 16 0 12.3385 0 7.93274C0 3.60052 3.50968 0 7.86677 0C9.49787 0 11.0622 0.647954 12.2155 1.80132L12.7071 2.29289L15 0L16 1V7H10Z" />
            </svg>
          </button>
        </div>

        <div ref={controlsRef} className={`video-player-controls ${isVideoLoading ? 'loading' : ''}`}>
          <div className="video-player-title">{episodeTitle}</div>

          <div
            ref={progressContainerRef}
            className={`video-progress-container ${isDragging || isTouchDragging ? 'dragging' : ''} ${isTouchDragging ? 'touch-dragging' : ''}`}
            onMouseMove={handleProgressMouseMove}
            onMouseLeave={handleProgressMouseLeave}
            onMouseDown={handleProgressMouseDown}
            onTouchStart={handleProgressTouchStart}
            onTouchMove={handleProgressTouchMove}
            onTouchEnd={handleProgressTouchEnd}
          >
            <div ref={progressFillRef} className="video-progress-fill" />
            <div ref={progressThumbRef} className="video-progress-thumb" />
            <div ref={thumbnailRef} className="video-thumbnail-preview">
              <div ref={thumbnailImageRef} className="video-thumbnail-image" />
              <div ref={thumbnailTimeRef} className="video-thumbnail-time">
                00:00
              </div>
            </div>
          </div>

          <div className="video-controls-bar">
            <div className="video-controls-buttons">
              <span className="video-time">
                {currentTime} / {duration}
              </span>
            </div>

            <div className="video-controls-center">
              <button
                className="video-control-btn"
                onClick={skipBackward}
                title="Retroceder 10s"
              >
                <svg viewBox="-3.2 -3.2 22.40 22.40" fill="none">
                  <path d="M6 7L7 6L4.70711 3.70711L5.19868 3.21553C5.97697 2.43724 7.03256 2 8.13323 2C11.361 2 14 4.68015 14 7.93274C14 11.2589 11.3013 14 8 14C6.46292 14 4.92913 13.4144 3.75736 12.2426L2.34315 13.6569C3.90505 15.2188 5.95417 16 8 16C12.4307 16 16 12.3385 16 7.93274C16 3.60052 12.4903 0 8.13323 0C6.50213 0 4.93783 0.647954 3.78447 1.80132L3.29289 2.29289L1 0L0 1V7H6Z" />
                </svg>
              </button>

              <button
                className="video-control-btn play-pause"
                onClick={togglePlay}
                title="Reproducir/Pausar"
              >
                {isPlaying ? (
                  <svg viewBox="0 0 24 24">
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>

              <button
                className="video-control-btn"
                onClick={skipForward}
                title="Adelantar 10s"
              >
                <svg viewBox="-3.2 -3.2 22.40 22.40" fill="none">
                  <path d="M10 7L9 6L11.2929 3.70711L10.8013 3.21553C10.023 2.43724 8.96744 2 7.86677 2C4.63903 2 2 4.68015 2 7.93274C2 11.2589 4.69868 14 8 14C9.53708 14 11.0709 13.4144 12.2426 12.2426L13.6569 13.6569C12.095 15.2188 10.0458 16 8 16C3.56933 16 0 12.3385 0 7.93274C0 3.60052 3.50968 0 7.86677 0C9.49787 0 11.0622 0.647954 12.2155 1.80132L12.7071 2.29289L15 0L16 1V7H10Z" />
                </svg>
              </button>
            </div>

            <div className="video-controls-buttons">
              {!isTouchDevice && (
                <div 
                  className="video-volume-container"
                  onMouseEnter={() => setShowVolumeSlider(true)}
                  onMouseLeave={() => setShowVolumeSlider(false)}
                >
                  <button
                    className="video-control-btn video-volume-button"
                    onClick={toggleMute}
                    title="Silenciar"
                  >
                    {getVolumeIcon()}
                  </button>
                  <div className="video-volume-slider-container">
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={volume}
                      onChange={handleVolumeChange}
                      className="video-volume-slider"
                    />
                  </div>
                </div>
              )}

              <button
                className="video-control-btn"
                onClick={toggleFullscreen}
                title="Pantalla completa"
              >
                <svg viewBox="0 0 24 24">
                  <path d="M4 21a1 1 0 0 1-1-1v-5a1 1 0 1 1 2 0v4h4a1 1 0 1 1 0 2H4ZM20 21a1 1 0 0 0 1-1v-5a1 1 0 1 0-2 0v4h-4a1 1 0 1 0 0 2h5ZM21 4a1 1 0 0 0-1-1h-5a1 1 0 1 0 0 2h4v4a1 1 0 1 0 2 0V4ZM4 3a1 1 0 0 0-1 1v5a1 1 0 0 0 2 0V5h4a1 1 0 0 0 0-2H4Z" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Skip Credits Button */}
        {showSkipCredits && (
          <button className="skip-credits-btn" onClick={skipToCreditsEnd}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 4l10 8-10 8V4z"/>
              <path d="M19 5v14"/>
            </svg>
            SALTAR CRÉDITOS
          </button>
        )}

        {/* Next Episode Overlay */}
        {showNextEpisodeOverlay && nextEpisode && (
          <div className="next-episode-overlay">
            <div className="next-episode-header">
              <div className="next-episode-title">Próximo episodio en</div>
              <div className="next-episode-countdown">{nextEpisodeCountdown}</div>
            </div>
            <div className="next-episode-content">
              {nextEpisode.thumbnail_url && (
                <div className="next-episode-thumbnail">
                  <img src={getProxiedImageUrl(nextEpisode.thumbnail_url)} alt={nextEpisode.title} />
                </div>
              )}
              <div className="next-episode-info">
                <div className="next-episode-episode-title">
                  E{nextEpisode.episode_number} - {nextEpisode.title}
                </div>
                <button className="next-episode-cancel-btn" onClick={cancelNextEpisode}>
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default VideoPlayer;
