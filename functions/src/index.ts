/**
 * Functions 진입점. export 이름 = 앱이 부르는 함수 이름 (shared/api.ts 의 키와 같아야 한다).
 * 리전·App Check 등 공통 옵션은 lib/admin.ts · lib/guard.ts 에서 정한다.
 */

import './lib/admin';

export { completeOnboarding, updateProfile, setCountry } from './api/profile';
export { updateLocation, getRegionStats } from './api/location';
export { getRecommendations, getProfile, likeUser } from './api/discover';
export { startConversation, sendMessage, finalizeChatImage, markConversationRead } from './api/chat';
export { createPost, likePost, commentPost, deletePost } from './api/feed';
export { dailyCheckIn, purchaseItem, claimPhoneVerified } from './api/points';
export { startLocationShare, updateSharedLocation, stopLocationShare } from './api/share';
export { blockUser, unblockUser, reportUser, deleteAccount } from './api/safety';

export { onAuthCreate, beforeSignIn } from './triggers/auth';
export { onImageUploaded } from './triggers/storage';
export { cleanupExpiredShares } from './triggers/scheduled';
