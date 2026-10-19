import React, { useState, useRef, useEffect } from "react";
import { Smile, Search, Heart, Sparkles, Coffee, Flag, X } from "lucide-react";

const EMOJI_CATEGORIES = [
  {
    id: "smileys",
    name: "Smileys",
    icon: Smile,
    emojis: [
      "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "🥹", "😊",
      "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😙",
      "😚", "😋", "😛", "😝", "😜", "🤪", "🤨", "🧐", "🤓", "😎",
      "🥸", "🤩", "🥳", "😏", "😒", "😞", "😔", "😟", "😕", "🙁",
      "🥺", "😢", "😭", "😤", "😠", "😡", "🤯", "😳", "🥵", "🥶",
      "😱", "😨", "😰", "😥", "😓", "🤗", "🤔", "🫣", "🤫", "🤥",
      "😶", "😐", "😑", "😬", "🙄", "😯", "😦", "😮", "😲", "🥱",
      "😴", "🤤", "😪", "😵", "🤐", "🥴", "🤢", "🤮", "🤧", "😷"
    ]
  },
  {
    id: "gestures",
    name: "Gestures",
    icon: Sparkles,
    emojis: [
      "👋", "🤚", "🖐️", "✋", "🖖", "👌", "🤌", "🤏", "✌️", "🤞",
      "🫰", "🤟", "🤘", "🤙", "👈", "👉", "👆", "🖕", "👇", "☝️",
      "👍", "👎", "✊", "👊", "🤛", "🤜", "👏", "🙌", "👐", "🤲",
      "🤝", "🙏", "✍️", "💅", "🤳", "💪", "🦾", "🦿", "🦵", "🦶",
      "👂", "👃", "🧠", "🫀", "🫁", "🦷", "🦴", "👀", "👁️", "👅"
    ]
  },
  {
    id: "hearts",
    name: "Love & Reactions",
    icon: Heart,
    emojis: [
      "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔",
      "❤️‍🔥", "❤️‍🩹", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝",
      "💟", "☮️", "✝️", "🔥", "✨", "🎉", "🎊", "⭐", "🌟", "💫",
      "💯", "💢", "💥", "💦", "💨", "💤", "💬", "👁️‍🗨️", "🗯️", "💭"
    ]
  },
  {
    id: "food_fun",
    name: "Food & Activity",
    icon: Coffee,
    emojis: [
      "☕", "🍵", "🧃", "🥤", "🧋", "🍺", "🍻", "🥂", "🍷", "🥃",
      "🍸", "🍹", "🧉", "🍾", "🍕", "🍔", "🍟", "🌭", "🍿", "🧈",
      "🥞", "🧇", "🥓", "🥩", "🍗", "🥪", "🌮", "🌯", "🥗", "🍣",
      "⚽", "🏀", "🏈", "⚾", "🎾", "🏐", "🏉", "🎱", "🎮", "🕹️"
    ]
  }
];

export const EmojiPicker = ({ onSelect, onClose }) => {
  const [activeCategory, setActiveCategory] = useState("smileys");
  const [searchQuery, setSearchQuery] = useState("");
  const pickerRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        onClose?.();
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [onClose]);

  const allEmojis = EMOJI_CATEGORIES.flatMap(c => c.emojis);
  const currentCategoryObj = EMOJI_CATEGORIES.find(c => c.id === activeCategory);
  const displayedEmojis = searchQuery.trim()
    ? allEmojis.filter(emoji => emoji.includes(searchQuery.trim()))
    : currentCategoryObj?.emojis || [];

  return (
    <div
      ref={pickerRef}
      className="absolute bottom-full mb-3 right-0 sm:left-0 z-50 w-72 sm:w-80 bg-zinc-950/95 backdrop-blur-2xl border border-zinc-800 rounded-2xl shadow-2xl shadow-black/80 p-3 animate-fadeIn"
      style={{ maxHeight: "360px" }}
    >
      {/* Category Tabs */}
      <div className="flex items-center justify-between gap-1 pb-2 mb-2 border-b border-zinc-800/80">
        <div className="flex items-center gap-1">
          {EMOJI_CATEGORIES.map(category => {
            const Icon = category.icon;
            const isActive = activeCategory === category.id && !searchQuery;
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => {
                  setActiveCategory(category.id);
                  setSearchQuery("");
                }}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer border-none ${
                  isActive
                    ? "bg-purple-600/30 text-purple-400"
                    : "bg-transparent text-zinc-400 hover:text-white hover:bg-zinc-800/60"
                }`}
                title={category.name}
              >
                <Icon size={16} />
              </button>
            );
          })}
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800/60 transition-colors bg-transparent border-none cursor-pointer"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* Emoji Grid */}
      <div className="grid grid-cols-7 sm:grid-cols-8 gap-1 overflow-y-auto max-h-56 p-1 pr-1.5 scrollbar-thin scrollbar-thumb-zinc-800">
        {displayedEmojis.map((emoji, index) => (
          <button
            key={`${emoji}-${index}`}
            type="button"
            onClick={() => onSelect(emoji)}
            className="w-8 h-8 flex items-center justify-center text-lg hover:bg-white/10 rounded-lg transition-transform hover:scale-125 cursor-pointer bg-transparent border-none"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
};
