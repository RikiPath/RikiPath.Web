import { createElement } from 'react';
import { RIKI_MASCOT_ASSETS } from '@/components/ui/mascotAssets.js';

/**
 * Pluggable 3D Rig Contract for the RikiPath Chibi Sakura Fox ("Riki").
 *
 * Notice on rendering fidelity:
 * This repository does NOT bundle a native `.glb` 3D character mesh or WebGL runtime (`three`, `@react-three/fiber`).
 * Rather than ship a flat 2D cartoon SVG approximation or fake WebGL claims, this module defines:
 *   1. The formal `.glb` bone, blendshape & material contract for an external 3D pipeline.
 *   2. An explicit runtime adapter hook (`registerFox3DAdapter`) for mounting an external Three.js/R3F `.glb` viewer.
 *   3. The active high-depth Soft-3D `.webp` sprite stage (`renderer: 'webp-3d-sprite'`) backed by the 8 crisp
 *      pre-rendered 256x256 transparent 3D Chibi Fox assets matching the RikiPath Sakura identity.
 */

export const FOX_ANIMATION_STATES = Object.freeze([
  'idle',
  'curious',
  'hover',
  'happy',
  'excited',
  'thinking',
  'listening',
  'speaking',
  'studying',
  'celebrating',
  'encouraging',
  'dragging',
  'landing',
  'sleepy',
]);

export const FOX_3D_CONTRACT = Object.freeze({
  version: '1.0.0',
  modelUrl: '/models/riki-sakura-fox.glb',
  rendererDefault: 'webp-3d-sprite',
  requiredBones: Object.freeze([
    'Root',
    'Spine',
    'Chest',
    'Neck',
    'Head',
    'EarL',
    'EarR',
    'TailBase',
    'TailMid',
    'TailTip',
    'ArmL',
    'ArmR',
    'RibbonLeft',
    'RibbonRight',
    'HairSakura',
  ]),
  requiredMorphTargets: Object.freeze([
    'eye_blink_L',
    'eye_blink_R',
    'brow_happy',
    'brow_curious',
    'brow_think',
    'brow_sleepy',
    'mouth_smile',
    'mouth_open_o',
    'mouth_talk_a',
  ]),
  animationClips: FOX_ANIMATION_STATES,
});

export const FOX_STATE_POSE_MAP = Object.freeze({
  idle: {
    poseKey: 'welcome',
    statusLabel: 'Sẵn sàng hỗ trợ JLPT',
    motionClass: 'riki-3d-idle',
    aura: 'rgba(224, 90, 122, 0.18)',
    cue: null,
  },
  curious: {
    poseKey: 'thinking',
    statusLabel: 'Đang tò mò khám phá',
    motionClass: 'riki-3d-curious',
    aura: 'rgba(244, 155, 179, 0.24)',
    cue: '?',
  },
  hover: {
    poseKey: 'welcome',
    statusLabel: 'Xin chào bạn!',
    motionClass: 'riki-3d-hover',
    aura: 'rgba(224, 90, 122, 0.28)',
    cue: null,
  },
  happy: {
    poseKey: 'celebrating',
    statusLabel: 'Vui quá chừng!',
    motionClass: 'riki-3d-happy',
    aura: 'rgba(245, 158, 11, 0.24)',
    cue: 'sparkles',
  },
  excited: {
    poseKey: 'achievement',
    statusLabel: 'Hào hứng hết nấc!',
    motionClass: 'riki-3d-excited',
    aura: 'rgba(234, 88, 12, 0.24)',
    cue: 'sparkles',
  },
  thinking: {
    poseKey: 'thinking',
    statusLabel: 'Đang suy nghĩ…',
    motionClass: 'riki-3d-thinking',
    aura: 'rgba(224, 90, 122, 0.22)',
    cue: 'dots',
  },
  listening: {
    poseKey: 'studying',
    statusLabel: 'Đang lắng nghe bạn',
    motionClass: 'riki-3d-listen',
    aura: 'rgba(20, 184, 166, 0.2)',
    cue: 'wave',
  },
  speaking: {
    poseKey: 'encouraging',
    statusLabel: 'Riki đang trò chuyện',
    motionClass: 'riki-3d-speak',
    aura: 'rgba(204, 75, 107, 0.25)',
    cue: 'sparkles',
  },
  studying: {
    poseKey: 'studying',
    statusLabel: 'Đang học cùng bạn',
    motionClass: 'riki-3d-studying',
    aura: 'rgba(59, 130, 246, 0.18)',
    cue: null,
  },
  celebrating: {
    poseKey: 'celebrating',
    statusLabel: 'Tuyệt vời! Chúc mừng bạn!',
    motionClass: 'riki-3d-celebrate',
    aura: 'rgba(245, 158, 11, 0.28)',
    cue: 'sparkles',
  },
  encouraging: {
    poseKey: 'encouraging',
    statusLabel: 'Cố lên! Riki cổ vũ bạn!',
    motionClass: 'riki-3d-encouraging',
    aura: 'rgba(224, 90, 122, 0.26)',
    cue: 'sparkles',
  },
  dragging: {
    poseKey: 'confused',
    statusLabel: 'Ủa đang đi đâu vậy ta?',
    motionClass: 'riki-3d-drag',
    aura: 'rgba(204, 75, 107, 0.32)',
    cue: '?',
  },
  landing: {
    poseKey: 'welcome',
    statusLabel: 'Đáp xuống an toàn!',
    motionClass: 'riki-3d-land',
    aura: 'rgba(224, 90, 122, 0.26)',
    cue: null,
  },
  sleepy: {
    poseKey: 'resting',
    statusLabel: 'Đang chợp mắt nghỉ ngơi',
    motionClass: 'riki-3d-sleep',
    aura: 'rgba(148, 163, 184, 0.18)',
    cue: 'zzz',
  },
});

let registeredFox3DAdapter = null;

/**
 * Registers an external Three.js / React Three Fiber component once an actual `.glb` rig asset and WebGL package
 * are mounted in production.
 */
export function registerFox3DAdapter(adapter) {
  registeredFox3DAdapter = typeof adapter === 'function' ? adapter : null;
}

export function getRegisteredFox3DAdapter() {
  return registeredFox3DAdapter;
}

export function renderRegisteredFox3D(props) {
  if (!registeredFox3DAdapter) return null;
  return createElement(registeredFox3DAdapter, { ...props, contract: FOX_3D_CONTRACT });
}

export function canUseWebGL() {
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return Boolean(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl')),
    );
  } catch {
    return false;
  }
}

export function resolveFoxPoseConfig(state = 'idle') {
  const normalized = FOX_ANIMATION_STATES.includes(state) ? state : 'idle';
  const cfg = FOX_STATE_POSE_MAP[normalized] || FOX_STATE_POSE_MAP.idle;
  return {
    state: normalized,
    ...cfg,
    src: RIKI_MASCOT_ASSETS[cfg.poseKey] || RIKI_MASCOT_ASSETS.welcome,
  };
}
