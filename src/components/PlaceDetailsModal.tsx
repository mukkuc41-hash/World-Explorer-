import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Sparkles,
  MapPin,
  Loader2,
  Share2,
  Heart,
  Trash2,
  CalendarCheck,
  Calendar,
  Bookmark,
  Volume2,
  CloudRain,
  Wind,
  Thermometer,
  Briefcase,
  ChevronRight,
  Compass,
  Sun,
  Sunrise,
  Sunset,
  Clock,
  Edit,
  Image as ImageIcon,
  Check,
  RefreshCw,
  Camera,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import {
  auth,
  db,
  handleFirestoreError,
  OperationType,
} from "../lib/firebase.ts";
import {
  doc,
  updateDoc,
  deleteDoc,
  setDoc,
  query,
  collection,
  where,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import ReviewSection from "./ReviewSection.tsx";

interface PlaceDetailsModalProps {
  placeName: string;
  isOpen: boolean;
  onClose: () => void;
  details: {
    description: string;
    imageUrl: string;
  } | null;
  loading: boolean;
  locationId?: string;
  userId?: string;
  isDeleted?: boolean;
  lat?: number;
  lng?: number;
}

// Deterministic stable coordinate generator to support any placeholder or custom item
const getStableCoords = (name: string, prepLat?: number, prepLng?: number) => {
  if (prepLat !== undefined && prepLat !== null && !isNaN(prepLat))
    return { lat: prepLat, lng: prepLng || 0 };
  let hash1 = 0,
    hash2 = 0;
  for (let i = 0; i < name.length; i++) {
    hash1 = name.charCodeAt(i) + ((hash1 << 5) - hash1);
    hash2 = name.charCodeAt(i) * 31 + ((hash2 << 7) - hash2);
  }
  const calculatedLat = (Math.abs(hash1) % 120) - 60; // stable lat between -60 and 60
  const calculatedLng = (Math.abs(hash2) % 360) - 180; // stable lng between -180 and 180
  return {
    lat: parseFloat(calculatedLat.toFixed(4)),
    lng: parseFloat(calculatedLng.toFixed(4)),
  };
};

interface SolarTimes {
  sunrise: string;
  sunset: string;
  goldenHourMorning: string;
  goldenHourEvening: string;
  dayLength: string;
  solarNoon: string;
  solarElevationAngle: number;
}

function calculateSolarTimes(lat: number, lng: number): SolarTimes {
  const timezoneOffsetHrs = Math.round(lng / 15);
  const date = new Date();
  const dayOfYear = Math.floor(
    (date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000,
  );
  const declination =
    23.45 * Math.sin(((360 / 365) * (dayOfYear - 80) * Math.PI) / 180);

  const latRad = (lat * Math.PI) / 180;
  const decRad = (declination * Math.PI) / 180;

  let cosH =
    (Math.sin((-0.83 * Math.PI) / 180) - Math.sin(latRad) * Math.sin(decRad)) /
    (Math.cos(latRad) * Math.cos(decRad));
  cosH = Math.max(-1, Math.min(1, cosH));

  const H = Math.acos(cosH) * (180 / Math.PI);
  const dayOct = H / 15;

  const noonDecimal = 12 - lng / 15 + timezoneOffsetHrs;
  const riseDecimal = noonDecimal - dayOct;
  const setDecimal = noonDecimal + dayOct;

  const formatTime = (dec: number) => {
    let hours = Math.floor(dec);
    let minutes = Math.round((dec - hours) * 60);
    if (minutes >= 60) {
      hours += 1;
      minutes -= 60;
    }
    hours = (hours + 24) % 24;
    const ampm = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, "0")} ${ampm}`;
  };

  const dayLengthHours = Math.floor(dayOct * 2);
  const dayLengthMinutes = Math.round((dayOct * 2 - dayLengthHours) * 60);

  const currentHourLocal = (date.getUTCHours() + timezoneOffsetHrs + 24) % 24;
  let sunElevation = 0;
  if (currentHourLocal >= riseDecimal && currentHourLocal <= setDecimal) {
    const progress =
      (currentHourLocal - riseDecimal) / (setDecimal - riseDecimal);
    sunElevation = Math.sin(progress * Math.PI) * 100;
  } else {
    sunElevation = -1;
  }

  return {
    sunrise: formatTime(riseDecimal),
    sunset: formatTime(setDecimal),
    goldenHourMorning: `${formatTime(riseDecimal)} - ${formatTime(riseDecimal + 1.2)}`,
    goldenHourEvening: `${formatTime(setDecimal - 1.2)} - ${formatTime(setDecimal)}`,
    solarNoon: formatTime(noonDecimal),
    dayLength: `${dayLengthHours}h ${dayLengthMinutes}m`,
    solarElevationAngle: sunElevation,
  };
}

export default function PlaceDetailsModal({
  placeName,
  isOpen,
  onClose,
  details,
  loading,
  locationId,
  userId,
  isDeleted,
  lat,
  lng,
}: PlaceDetailsModalProps) {
  const user = auth.currentUser;
  const isOwner = user?.uid === userId;
  const isAdmin = user?.email === "mukkuc41@gmail.com";

  const [isPlanned, setIsPlanned] = useState(false);
  const [planningInfo, setPlanningInfo] = useState<any>(null);
  const [isArchived, setIsArchived] = useState(false);
  const [archiveInfo, setArchiveInfo] = useState<any>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showPackingList, setShowPackingList] = useState(false);
  const [weather, setWeather] = useState<{
    temp: number;
    wind: number;
    condition: string;
  } | null>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [recError, setRecError] = useState<string | null>(null);

  // Edit mode state variables
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(placeName);
  const [editDescription, setEditDescription] = useState(
    details?.description || "",
  );
  const [editImageUrl, setEditImageUrl] = useState(details?.imageUrl || "");
  const [editCountry, setEditCountry] = useState("");
  const [editState, setEditState] = useState("");
  const [editLat, setEditLat] = useState<number>(lat || 0);
  const [editLng, setEditLng] = useState<number>(lng || 0);
  const [isSaving, setIsSaving] = useState(false);
  const [localLocation, setLocalLocation] = useState<any>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressError, setCompressError] = useState<string | null>(null);
  const [uploadMethod, setUploadMethod] = useState<"url" | "gallery">(
    "gallery",
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setCompressError("Please select a valid image file from your library.");
      return;
    }

    setIsCompressing(true);
    setCompressError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 1000;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height = Math.round(height * (MAX_WIDTH / width));
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width = Math.round(width * (MAX_HEIGHT / height));
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            setEditImageUrl(event.target?.result as string);
            setIsCompressing(false);
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          // Compress with 0.76 quality (sweet spot for high-fidelity rendering & low footprint: ~55kb)
          const dataUrl = canvas.toDataURL("image/jpeg", 0.76);
          setEditImageUrl(dataUrl);
        } catch (compressErr) {
          console.warn("Compression fallback used:", compressErr);
          setEditImageUrl(event.target?.result as string);
        } finally {
          setIsCompressing(false);
        }
      };

      img.onerror = () => {
        setCompressError(
          "Failed to process the image. Please try another one.",
        );
        setIsCompressing(false);
      };

      img.src = event.target?.result as string;
    };

    reader.onerror = () => {
      setCompressError(
        "Unable to read image file. Please try selecting it again.",
      );
      setIsCompressing(false);
    };

    reader.readAsDataURL(file);
  };

  // Reset and load props on open/change
  useEffect(() => {
    setEditName(placeName);
    setEditDescription(details?.description || "");
    const initialImg = details?.imageUrl || "";
    setEditImageUrl(initialImg);
    setEditLat(lat || 0);
    setEditLng(lng || 0);
    if (initialImg.startsWith("data:")) {
      setUploadMethod("gallery");
    } else {
      setUploadMethod("url");
    }
    if (!isOpen) {
      setIsEditing(false);
    }
  }, [placeName, details, lat, lng, isOpen]);

  // Read real-time doc state if editable to prevent data mismatches
  useEffect(() => {
    if (!locationId || !isOpen) {
      setLocalLocation(null);
      return;
    }
    const docRef = doc(db, "locations", locationId);
    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setLocalLocation({ id: docSnap.id, ...data });
          setEditName(data.name || "");
          setEditDescription(data.description || "");
          const currentImg = data.imageUrl || "";
          setEditImageUrl(currentImg);
          setEditCountry(data.country || "");
          setEditState(data.state || "");
          setEditLat(data.lat || 0);
          setEditLng(data.lng || 0);
          if (currentImg.startsWith("data:")) {
            setUploadMethod("gallery");
          } else {
            setUploadMethod("url");
          }
        }
      },
      (error) => {
        console.error("Failed to subscribe to location updates:", error);
      },
    );

    return () => unsubscribe();
  }, [locationId, isOpen]);

  const displayedName = localLocation?.name || placeName;
  const displayedDescription =
    localLocation?.description || details?.description || "";
  const displayedImageUrl = localLocation?.imageUrl || details?.imageUrl || "";
  const displayedLat =
    localLocation?.lat !== undefined ? localLocation.lat : lat;
  const displayedLng =
    localLocation?.lng !== undefined ? localLocation.lng : lng;

  const activeCoords = getStableCoords(
    displayedName,
    displayedLat,
    displayedLng,
  );
  const solarTimes = calculateSolarTimes(activeCoords.lat, activeCoords.lng);

  useEffect(() => {
    if (isOpen && displayedName) {
      fetchWeather();
      fetchRecommendations();
    }
  }, [isOpen, displayedName]);

  const fetchWeather = async () => {
    try {
      const res = await fetch(
        `/api/weather?place=${encodeURIComponent(displayedName)}`,
      );
      const data = await res.json();
      if (res.ok) setWeather(data);
    } catch (e) {
      console.error("Weather fetch failed:", e);
    }
  };

  const fetchRecommendations = async () => {
    setLoadingRecs(true);
    setRecError(null);
    try {
      const res = await fetch("/api/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ place: displayedName }),
      });
      const data = await res.json();
      if (res.ok) {
        setRecommendations(data);
      } else {
        setRecError(data.error || "Recommendation error");
      }
    } catch (e) {
      console.error("Recs fetch failed:", e);
      setRecError("Connection error");
    } finally {
      setLoadingRecs(false);
    }
  };

  // Stop speech synthesis on close
  useEffect(() => {
    if (!isOpen) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, [isOpen]);

  const toggleSpeech = () => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      const utterance = new SpeechSynthesisUtterance(displayedDescription);
      utterance.onend = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
    }
  };

  useEffect(() => {
    if (!locationId || !user) return;

    const q = query(
      collection(db, "tours"),
      where("userId", "==", user.uid),
      where("locationId", "==", locationId),
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setIsPlanned(!snapshot.empty);
      if (!snapshot.empty) {
        setPlanningInfo({
          id: snapshot.docs[0].id,
          ...snapshot.docs[0].data(),
        });
      } else {
        setPlanningInfo(null);
      }
    });

    return () => unsubscribe();
  }, [locationId, user]);

  useEffect(() => {
    if (!locationId || !user) return;

    const q = query(
      collection(db, "archives"),
      where("userId", "==", user.uid),
      where("locationId", "==", locationId),
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setIsArchived(!snapshot.empty);
      if (!snapshot.empty) {
        setArchiveInfo({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
      } else {
        setArchiveInfo(null);
      }
    });

    return () => unsubscribe();
  }, [locationId, user]);

  const toggleTour = async () => {
    if (!user || !locationId) return;

    try {
      if (isPlanned && planningInfo) {
        await deleteDoc(doc(db, "tours", planningInfo.id));
      } else {
        const planId = `${user.uid}_${locationId}`;
        await setDoc(doc(db, "tours", planId), {
          userId: user.uid,
          locationId,
          createdAt: serverTimestamp(),
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "tours");
    }
  };

  const toggleArchive = async () => {
    if (!user || !locationId) return;

    try {
      if (isArchived && archiveInfo) {
        await deleteDoc(doc(db, "archives", archiveInfo.id));
      } else {
        const archId = `${user.uid}_${locationId}`;
        await setDoc(doc(db, "archives", archId), {
          userId: user.uid,
          locationId,
          createdAt: serverTimestamp(),
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "archives");
    }
  };

  const handleRestore = async () => {
    if (!locationId) return;
    try {
      await updateDoc(doc(db, "locations", locationId), {
        isDeleted: false,
        updatedAt: serverTimestamp(),
      });
      onClose();
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.WRITE,
        `locations/${locationId}`,
      );
    }
  };

  const handleDelete = async () => {
    if (!locationId) return;
    if (
      !window.confirm(
        "Are you sure you want to delete this discovery? It will be moved to the Trash for 30 days.",
      )
    )
      return;

    try {
      await updateDoc(doc(db, "locations", locationId), {
        isDeleted: true,
        deletedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      onClose();
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.DELETE,
        `locations/${locationId}`,
      );
    }
  };

  const handleSaveEdit = async () => {
    if (!locationId) return;
    if (!editName.trim()) {
      alert("Please provide a name for this discovery.");
      return;
    }
    setIsSaving(true);
    try {
      await updateDoc(doc(db, "locations", locationId), {
        name: editName.trim(),
        description: editDescription.trim(),
        imageUrl: editImageUrl.trim(),
        country: editCountry.trim() || "Unknown",
        state: editState.trim() || "Unknown",
        lat: editLat,
        lng: editLng,
        updatedAt: serverTimestamp(),
      });
      setIsEditing(false);
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.WRITE,
        `locations/${locationId}`,
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-12">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#141414]/90 backdrop-blur-xl"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-5xl bg-white rounded-[48px] overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[90vh]"
          >
            {/* Image Side */}
            <div className="md:w-1/2 relative h-[300px] md:h-auto bg-[#f8f8f5]">
              {(isEditing ? editImageUrl : displayedImageUrl) ? (
                <img
                  src={
                    (isEditing ? editImageUrl : displayedImageUrl).startsWith(
                      "http",
                    )
                      ? `${isEditing ? editImageUrl : displayedImageUrl}&w=1000&q=80`
                      : isEditing
                        ? editImageUrl
                        : displayedImageUrl
                  }
                  alt={isEditing ? editName : displayedName}
                  className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${loading && !displayedDescription ? "opacity-40 grayscale" : "opacity-100"}`}
                />
              ) : loading ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#f8f8f5]">
                  <div className="w-16 h-16 rounded-full border-4 border-[#00af87]/20 border-t-[#00af87] animate-spin" />
                  <p className="text-[10px] uppercase font-black tracking-widest opacity-30">
                    Generating Vision...
                  </p>
                </div>
              ) : null}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-12 left-12">
                <div className="flex items-center gap-2 text-white/60 text-[10px] uppercase font-black tracking-[0.2em] mb-4">
                  <Sparkles className="w-3 h-3 text-[#34D399]" />{" "}
                  {isEditing ? "Live Preview" : "AI Imagined"}
                </div>
                <h2 className="text-white text-4xl md:text-6xl font-bold tracking-tighter leading-none">
                  {isEditing ? editName : displayedName}
                </h2>
              </div>
            </div>

            {/* Content Side */}
            <div className="md:w-1/2 p-8 md:p-16 overflow-y-auto bg-white flex flex-col relative">
              {/* Discovery Background Layer */}
              <div
                className="absolute inset-0 opacity-[0.03] pointer-events-none bg-cover bg-center"
                style={{
                  backgroundImage:
                    'url("/src/assets/images/discovery_detail_bg_1779013628944.png")',
                }}
              />
              <div className="relative z-10 flex flex-col flex-1">
                <div className="flex items-center justify-between mb-12">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest opacity-20">
                    <MapPin className="w-3 h-3" /> Hidden Gem
                  </div>
                  <button
                    onClick={onClose}
                    className="p-3 bg-[#f8f8f5] rounded-full hover:bg-[#141414] hover:text-white transition-all cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex items-center gap-6 mb-8">
                  <div className="flex-1 flex items-center gap-4 bg-[#f8f8f5] p-4 rounded-2xl">
                    <Thermometer className="w-5 h-5 text-[#f59e0b]" />
                    <div className="flex flex-col">
                      <span className="text-[8px] font-black uppercase tracking-[0.2em] opacity-30">
                        Local Vibe
                      </span>
                      <span className="text-sm font-bold">
                        {weather ? `${weather.temp}°C` : "..."} •{" "}
                        {weather
                          ? weather.temp > 25
                            ? "Warm"
                            : weather.temp > 15
                              ? "Pleasant"
                              : "Cool"
                          : "Loading"}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1 flex items-center gap-4 bg-[#f8f8f5] p-4 rounded-2xl">
                    <CloudRain className="w-5 h-5 text-[#3b82f6]" />
                    <div className="flex flex-col">
                      <span className="text-[8px] font-black uppercase tracking-[0.2em] opacity-30">
                        Wind
                      </span>
                      <span className="text-sm font-bold">
                        {weather ? `${weather.wind} km/h` : "..."}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={toggleSpeech}
                    className={`p-4 rounded-2xl transition-all flex flex-col items-center justify-center gap-1 min-w-[80px] cursor-pointer ${isSpeaking ? "bg-[#00af87] text-white shadow-lg" : "bg-[#f8f8f5] text-[#141414]/60 hover:bg-[#141414] hover:text-white"}`}
                  >
                    <Volume2
                      className={`w-5 h-5 ${isSpeaking ? "animate-pulse" : ""}`}
                    />
                    <span className="text-[8px] font-black uppercase tracking-widest">
                      {isSpeaking ? "Stop" : "Audio"}
                    </span>
                  </button>
                </div>

                {/* Celestial Sunrise & Sunset Tracker Card */}
                <div className="bg-gradient-to-br from-amber-500/10 via-rose-500/5 to-indigo-500/10 border border-amber-500/10 rounded-3xl p-6.5 mb-8 text-left relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-xl pointer-events-none" />

                  <div className="flex items-center justify-between gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-amber-500/10 text-amber-700 rounded-xl">
                        <Sun className="w-4 h-4 animate-spin-slow" />
                      </div>
                      <div>
                        <h4 className="font-serif italic font-bold text-sm text-[#141414] leading-none mb-1">
                          Solar & Golden Hour Tracker
                        </h4>
                        <p className="text-[10px] text-[#141414]/50 font-mono">
                          Coords: {activeCoords.lat.toFixed(4)}°N,{" "}
                          {activeCoords.lng.toFixed(4)}°E
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] font-black uppercase tracking-widest bg-amber-500/10 text-amber-900 px-2 py-1 rounded-md">
                        Daylight: {solarTimes.dayLength}
                      </span>
                    </div>
                  </div>

                  {/* Visual Sun Track Semi-Circle */}
                  <div className="relative h-12 border-b border-[#141414]/10 mb-5 flex items-end justify-center">
                    {/* Dotted arc trail */}
                    <div className="absolute inset-x-4 top-1 border-t border-dashed border-[#141414]/15 rounded-t-full h-11" />

                    {/* Dynamic sun position */}
                    {solarTimes.solarElevationAngle >= 0 ? (
                      <div
                        className="absolute flex flex-col items-center gap-1 transition-all duration-1000"
                        style={{
                          bottom: `${Math.min(32, solarTimes.solarElevationAngle * 0.32)}px`,
                          left: `${15 + solarTimes.solarElevationAngle * 0.7}%`,
                        }}
                      >
                        <Sun className="w-4 h-4 text-amber-500 animate-pulse fill-amber-300" />
                        <span className="text-[8px] font-bold text-amber-900 bg-amber-100 px-1 rounded">
                          Sun Elevation
                        </span>
                      </div>
                    ) : (
                      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-1 text-slate-400">
                        <Clock className="w-3.5 h-3.5" />
                        <span className="text-[9px] uppercase tracking-wider font-bold">
                          Sun below Horizon (Night Mode)
                        </span>
                      </div>
                    )}

                    <div className="absolute left-3 bottom-0.5 text-[9px] text-[#141414]/40 font-mono">
                      Rise
                    </div>
                    <div className="absolute right-3 bottom-0.5 text-[9px] text-[#141414]/40 font-mono">
                      Set
                    </div>
                  </div>

                  {/* Morning and Evening details */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-white/40 backdrop-blur-md p-3.5 rounded-2xl border border-white/60">
                    <div className="flex flex-col">
                      <span className="text-[8px] font-black uppercase tracking-wider opacity-40 flex items-center gap-1 mb-0.5">
                        <Sunrise className="w-3 h-3 text-emerald-600" /> Sunrise
                      </span>
                      <span className="text-xs font-bold text-[#141414]">
                        {solarTimes.sunrise}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[8px] font-black uppercase tracking-wider opacity-40 flex items-center gap-1 mb-0.5">
                        <Sunset className="w-3 h-3 text-rose-500" /> Sunset
                      </span>
                      <span className="text-xs font-bold text-[#141414]">
                        {solarTimes.sunset}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[8px] font-black uppercase tracking-wider opacity-40 flex items-center gap-1 mb-0.5">
                        <Sun className="w-3 h-3 text-amber-500" /> Golden Hour
                        (AM)
                      </span>
                      <span className="text-xs font-bold text-amber-800">
                        {solarTimes.goldenHourMorning}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[8px] font-black uppercase tracking-wider opacity-40 flex items-center gap-1 mb-0.5">
                        <Sun className="w-3 h-3 text-rose-400" /> Golden Hour
                        (PM)
                      </span>
                      <span className="text-xs font-bold text-rose-800">
                        {solarTimes.goldenHourEvening}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex-1">
                  {isEditing ? (
                    <div className="space-y-6 text-left">
                      <h3 className="text-2xl font-serif italic mb-6">
                        Edit Discovery
                      </h3>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest opacity-50 block">
                          Landmark Name
                        </label>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full px-5 py-3.5 bg-[#f8f8f5] border border-[#141414]/10 rounded-2xl focus:border-[#00af87] focus:outline-none transition-all font-sans text-sm font-bold text-[#141414]"
                          placeholder="Landmark name"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest opacity-50 block">
                          Description (Supports Markdown)
                        </label>
                        <textarea
                          rows={6}
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          className="w-full px-5 py-3.5 bg-[#f8f8f5] border border-[#141414]/10 rounded-2xl focus:border-[#00af87] focus:outline-none transition-all font-sans text-xs leading-relaxed text-[#141414]"
                          placeholder="Tell the story of this majestic discovery..."
                        />
                      </div>

                      <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest opacity-55 block">
                          Discovery Landmark Image
                        </label>
                        <div className="flex justify-between items-center bg-[#f8f8f5] p-1 rounded-2xl border border-[#141414]/5">
                          <button
                            type="button"
                            onClick={() => setUploadMethod("gallery")}
                            className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${
                              uploadMethod === "gallery"
                                ? "bg-[#141414] text-white shadow-sm font-bold"
                                : "text-[#141414]/60 hover:text-[#141414] font-medium"
                            }`}
                          >
                            Local Gallery File
                          </button>
                          <button
                            type="button"
                            onClick={() => setUploadMethod("url")}
                            className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${
                              uploadMethod === "url"
                                ? "bg-[#141414] text-white shadow-sm font-bold"
                                : "text-[#141414]/60 hover:text-[#141414] font-medium"
                            }`}
                          >
                            Web Link URL
                          </button>
                        </div>

                        {uploadMethod === "gallery" ? (
                          <div className="space-y-2">
                            <input
                              type="file"
                              ref={fileInputRef}
                              onChange={handleFileChange}
                              accept="image/*"
                              className="hidden"
                            />
                            {editImageUrl && editImageUrl.startsWith("data:") ? (
                              <div className="relative rounded-2xl overflow-hidden h-36 border border-[#141414]/10 bg-[#f8f8f5] group">
                                <img
                                  src={editImageUrl}
                                  alt="Gallery preview"
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="px-4 py-2 bg-white text-[#141414] text-xs font-bold rounded-xl hover:scale-[1.05] transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
                                  >
                                    <RefreshCw className="w-3" /> Change Photo
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditImageUrl("")}
                                    className="px-4 py-2 bg-[#ef4444] text-white text-xs font-bold rounded-xl hover:scale-[1.05] transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" /> Remove
                                  </button>
                                </div>
                                <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-lg text-[9px] font-bold text-gray-800 flex items-center gap-1 shadow-sm">
                                  <Check className="w-2.5 h-2.5 text-emerald-600" /> Selected from Library
                                </div>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full py-8 border-2 border-dashed border-[#141414]/10 hover:border-[#00af87] rounded-3xl flex flex-col items-center justify-center gap-2 bg-[#fdfdfc] hover:bg-[#00af87]/5 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer text-center group"
                              >
                                {isCompressing ? (
                                  <Loader2 className="w-6 h-6 animate-spin text-[#00af87]" />
                                ) : (
                                  <div className="p-3 bg-[#00af87]/10 text-[#00af87] rounded-full group-hover:scale-110 transition-transform">
                                    <ImageIcon className="w-5 h-5" />
                                  </div>
                                )}
                                <span className="text-xs font-serif italic font-bold text-[#141414]">
                                  {isCompressing
                                    ? "Formatting and optimising media..."
                                    : "Browse Gallery or Drop Image"}
                                </span>
                              </button>
                            )}
                            {compressError && (
                              <p className="text-[11px] text-red-600 font-bold bg-red-50 p-2.5 rounded-xl border border-red-100">
                                {compressError}
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="relative">
                              <input
                                type="text"
                                value={editImageUrl.startsWith("data:") ? "" : editImageUrl}
                                onChange={(e) => setEditImageUrl(e.target.value)}
                                className="w-full px-5 py-3.5 pl-12 bg-[#f8f8f5] border border-[#141414]/10 rounded-2xl focus:border-[#00af87] focus:outline-none transition-all font-mono text-xs text-[#141414]"
                                placeholder="https://images.unsplash.com/..."
                              />
                              <Camera className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 opacity-30 text-[#141414]" />
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest opacity-50 block">
                            Country
                          </label>
                          <input
                            type="text"
                            value={editCountry}
                            onChange={(e) => setEditCountry(e.target.value)}
                            className="w-full px-5 py-3.5 bg-[#f8f8f5] border border-[#141414]/10 rounded-2xl focus:border-[#00af87] focus:outline-none transition-all font-sans text-sm font-bold text-[#141414]"
                            placeholder="e.g. India"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest opacity-50 block">
                            State / Region
                          </label>
                          <input
                            type="text"
                            value={editState}
                            onChange={(e) => setEditState(e.target.value)}
                            className="w-full px-5 py-3.5 bg-[#f8f8f5] border border-[#141414]/10 rounded-2xl focus:border-[#00af87] focus:outline-none transition-all font-sans text-sm font-bold text-[#141414]"
                            placeholder="e.g. Rajasthan"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest opacity-50 block">
                            Latitude
                          </label>
                          <input
                            type="number"
                            step="0.0001"
                            value={editLat || ""}
                            onChange={(e) =>
                              setEditLat(parseFloat(e.target.value) || 0)
                            }
                            className="w-full px-5 py-3.5 bg-[#f8f8f5] border border-[#141414]/10 rounded-2xl focus:border-[#00af87] focus:outline-none transition-all font-mono text-xs text-[#141414]"
                            placeholder="Latitude"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest opacity-50 block">
                            Longitude
                          </label>
                          <input
                            type="number"
                            step="0.0001"
                            value={editLng || ""}
                            onChange={(e) =>
                              setEditLng(parseFloat(e.target.value) || 0)
                            }
                            className="w-full px-5 py-3.5 bg-[#f8f8f5] border border-[#141414]/10 rounded-2xl focus:border-[#00af87] focus:outline-none transition-all font-mono text-xs text-[#141414]"
                            placeholder="Longitude"
                          />
                        </div>
                      </div>

                      <div className="flex gap-4 pt-4">
                        <button
                          onClick={handleSaveEdit}
                          disabled={isSaving}
                          className="flex-1 py-4 bg-[#00af87] text-white font-sans text-sm font-bold rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 cursor-pointer"
                        >
                          {isSaving ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />{" "}
                              Saving...
                            </>
                          ) : (
                            "Save Changes"
                          )}
                        </button>
                        <button
                          onClick={() => setIsEditing(false)}
                          disabled={isSaving}
                          className="flex-1 py-4 bg-[#f8f8f5] border border-[#141414]/10 text-[#141414] font-sans text-sm font-bold rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {loading ? (
                        <div className="space-y-6">
                          <div className="h-8 bg-[#f8f8f5] rounded-xl w-3/4 animate-pulse" />
                          <div className="space-y-3">
                            <div className="h-4 bg-[#f8f8f5] rounded-lg w-full animate-pulse" />
                            <div className="h-4 bg-[#f8f8f5] rounded-lg w-5/6 animate-pulse" />
                            <div className="h-4 bg-[#f8f8f5] rounded-lg w-full animate-pulse" />
                            <div className="h-4 bg-[#f8f8f5] rounded-lg w-4/5 animate-pulse" />
                          </div>
                        </div>
                      ) : displayedDescription || details ? (
                        <>
                          <div className="prose prose-sm max-w-none">
                            <div className="markdown-body text-xl md:text-2xl font-serif italic leading-relaxed text-[#141414]/80">
                              <ReactMarkdown>
                                {displayedDescription}
                              </ReactMarkdown>
                            </div>
                          </div>

                          <button
                            onClick={() => setShowPackingList(!showPackingList)}
                            className="mt-8 w-full flex items-center justify-between p-6 bg-[#141414] text-white rounded-3xl hover:scale-[1.02] active:scale-[0.98] transition-all group cursor-pointer"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                                <Briefcase className="w-5 h-5" />
                              </div>
                              <div className="text-left">
                                <div className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40">
                                  Journey Prep
                                </div>
                                <div className="font-serif italic text-xl">
                                  AI Packing Checklist
                                </div>
                              </div>
                            </div>
                            <ChevronRight
                              className={`w-5 h-5 transition-transform ${showPackingList ? "rotate-90" : ""}`}
                            />
                          </button>

                          <AnimatePresence>
                            {showPackingList && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="p-8 bg-[#f8f8f5] rounded-3xl mt-4 grid grid-cols-2 gap-4">
                                  {[
                                    {
                                      item: "Sunscreen & Shades",
                                      reason: "Sunny exposure",
                                    },
                                    {
                                      item: "Comfortable Boots",
                                      reason: "Gravel trails",
                                    },
                                    {
                                      item: "External Battery",
                                      reason: "Long photo sessions",
                                    },
                                    {
                                      item: "Local Sim Card",
                                      reason: "Connectivity",
                                    },
                                    {
                                      item: "Rain Poncho",
                                      reason: "Passing clouds",
                                    },
                                    {
                                      item: "Heritage Map",
                                      reason: "Offline navigation",
                                    },
                                  ].map((thing, i) => (
                                    <motion.div
                                      key={i}
                                      initial={{ opacity: 0, x: -10 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{ delay: i * 0.05 }}
                                      className="flex items-start gap-3 p-3 bg-white rounded-xl shadow-sm"
                                    >
                                      <div className="w-2 h-2 rounded-full bg-[#00af87] mt-1.5" />
                                      <div>
                                        <div className="text-[11px] font-bold">
                                          {thing.item}
                                        </div>
                                        <div className="text-[9px] opacity-40 uppercase tracking-widest">
                                          {thing.reason}
                                        </div>
                                      </div>
                                    </motion.div>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>

                          {locationId && (
                            <ReviewSection locationId={locationId} />
                          )}

                          {/* AI Recommendations */}
                          {(recommendations.length > 0 ||
                            loadingRecs ||
                            recError) && (
                            <div className="mt-12 overflow-hidden">
                              <h3 className="text-[10px] uppercase font-black tracking-[0.2em] text-[#141414]/40 mb-6 px-1">
                                AI Smart Discovery
                              </h3>
                              <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                                {loadingRecs ? (
                                  [1, 2, 3].map((i) => (
                                    <div
                                      key={i}
                                      className="min-w-[200px] h-32 bg-[#f8f8f5] rounded-3xl animate-pulse"
                                    />
                                  ))
                                ) : recError ? (
                                  <div className="flex-1 bg-red-50 p-6 rounded-[32px] border border-red-100">
                                    <p className="text-xs text-red-900/60 font-serif italic mb-2">
                                      Notice from AI Engine
                                    </p>
                                    <p className="text-sm font-bold text-red-900">
                                      {recError}
                                    </p>
                                  </div>
                                ) : (
                                  recommendations.map((rec, i) => (
                                    <motion.div
                                      key={i}
                                      initial={{ opacity: 0, x: 20 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{ delay: i * 0.1 }}
                                      className="min-w-[240px] bg-[#f8f8f5] p-4 rounded-3xl border border-[#141414]/5 group hover:bg-white transition-all cursor-default text-left"
                                    >
                                      <div className="text-[10px] items-center gap-2 text-[#00af87] font-bold uppercase tracking-widest mb-2 flex">
                                        <Compass className="w-3 h-3" /> Similar
                                        Gem
                                      </div>
                                      <div className="text-sm font-bold text-[#141414] mb-1">
                                        {rec.name}
                                      </div>
                                      <div className="text-[10px] text-[#141414]/60 leading-relaxed italic truncate">
                                        "{rec.reason}"
                                      </div>
                                    </motion.div>
                                  ))
                                )}
                              </div>
                            </div>
                          )}
                        </>
                      ) : null}
                    </>
                  )}
                </div>

                <div className="mt-12 pt-12 border-t border-[#141414]/5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {user && (
                      <>
                        <button
                          onClick={toggleTour}
                          className={`flex items-center gap-2 px-6 py-3 rounded-full text-xs font-bold transition-all hover:scale-105 shadow-xl cursor-pointer ${isPlanned ? "bg-[#00af87] text-white" : "bg-[#141414] text-white"}`}
                        >
                          {isPlanned ? (
                            <CalendarCheck className="w-4 h-4" />
                          ) : (
                            <Calendar className="w-4 h-4" />
                          )}
                          {isPlanned ? "Planned for Tour" : "Plan Visit"}
                        </button>
                        <button
                          onClick={() => {
                            const title = displayedName;
                            const text = `Check out ${displayedName} on World Explorer!`;
                            const url = window.location.href;
                            if (navigator.share) {
                              navigator
                                .share({ title, text, url })
                                .catch((e) => console.error(e));
                            } else {
                              window.open(
                                `https://wa.me/?text=${encodeURIComponent(text + " " + url)}`,
                                "_blank",
                              );
                            }
                          }}
                          className="p-3 rounded-full border border-[#141414]/5 rgb-bg animate-rgb text-white transition-all group cursor-pointer"
                          title="Share Discovery"
                        >
                          <Share2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        </button>
                      </>
                    )}
                    {(isOwner || isAdmin) &&
                      locationId &&
                      (isDeleted ? (
                        <button
                          onClick={handleRestore}
                          className="flex items-center gap-2 px-6 py-3 rounded-full bg-[#00af87] text-white text-xs font-bold hover:scale-105 transition-all cursor-pointer"
                        >
                          <CalendarCheck className="w-4 h-4" /> Restore
                          Discovery
                        </button>
                      ) : (
                        <div className="flex items-center gap-2">
                          {!isEditing && (
                            <button
                              onClick={() => setIsEditing(true)}
                              className="flex items-center gap-2 px-6 py-3 rounded-full bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold hover:scale-105 transition-all cursor-pointer"
                              title="Edit Discovery details"
                            >
                              <Edit className="w-4 h-4" /> Edit Discovery
                            </button>
                          )}
                          <button
                            onClick={handleDelete}
                            className="flex items-center gap-2 px-6 py-3 rounded-full bg-[#ef4444] text-white text-xs font-bold hover:scale-105 transition-all cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" /> Delete Discovery
                          </button>
                        </div>
                      ))}
                  </div>
                  {user && (
                    <button
                      onClick={toggleArchive}
                      className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${isArchived ? "text-[#141414]" : "text-[#00af87] hover:opacity-70"}`}
                    >
                      <Bookmark
                        className={`w-4 h-4 ${isArchived ? "fill-current" : ""}`}
                      />
                      {isArchived ? "In Archive" : "Save to Archive"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
