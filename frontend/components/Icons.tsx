import React from 'react';
import {
  Music,
  Volume2,
  VolumeX,
  Cigarette,
  CigaretteOff,
  Dog,
  Briefcase,
  Box,
  MessageCircle,
  MessageSquareOff,
  ThermometerSun,
  Wind,
  Car,
  User,
} from 'lucide-react';
import { Preferences, MusicPref, BaggageSize, ConversationPref } from '../types';

export const MusicIcon = ({ pref }: { pref: MusicPref }) => {
  switch (pref) {
    case MusicPref.Quiet:
      return <VolumeX size={16} className="text-gray-500" />;
    case MusicPref.Loud:
      return <Volume2 size={16} className="text-gray-500" />;
    default:
      return <Music size={16} className="text-gray-500" />;
  }
};

export const SmokingIcon = ({ allowed }: { allowed: boolean }) => {
  return allowed ? (
    <Cigarette size={16} className="text-green-600" />
  ) : (
    <CigaretteOff size={16} className="text-red-400" />
  );
};

export const PetsIcon = ({ allowed }: { allowed: boolean }) => {
  return allowed ? (
    <Dog size={16} className="text-green-600" />
  ) : (
    <span className="relative">
      <Dog size={16} className="text-gray-300 opacity-50" />
      <div className="absolute top-0 right-0 w-full h-0.5 bg-red-400 rotate-45 top-1/2"></div>
    </span>
  );
};

export const BaggageIcon = ({ size }: { size: BaggageSize }) => {
  switch (size) {
    case BaggageSize.Hand:
      return <Briefcase size={16} className="text-gray-500" />;
    case BaggageSize.Suitcase:
      return <Box size={16} className="text-gray-500" />;
    default:
      return <Briefcase size={16} className="text-gray-500" />;
  }
};

export const ConversationIcon = ({ pref }: { pref: ConversationPref }) => {
  return pref === ConversationPref.Chatty ? (
    <MessageCircle size={16} className="text-gray-500" />
  ) : (
    <MessageSquareOff size={16} className="text-gray-500" />
  );
};

export const ACIcon = ({ hasAC }: { hasAC: boolean }) => {
  return hasAC ? (
    <Wind size={16} className="text-blue-400" />
  ) : (
    <ThermometerSun size={16} className="text-orange-400" />
  );
};

export const PreferenceRow = ({ prefs }: { prefs: Preferences }) => {
  return (
    <div className="flex space-x-3 items-center bg-white/50 px-3 py-1.5 rounded-full backdrop-blur-sm border border-white/40 shadow-sm">
      <MusicIcon pref={prefs.music} />
      <SmokingIcon allowed={prefs.smoking} />
      <PetsIcon allowed={prefs.pets} />
      <ACIcon hasAC={prefs.ac} />
      <ConversationIcon pref={prefs.conversation} />
    </div>
  );
};
